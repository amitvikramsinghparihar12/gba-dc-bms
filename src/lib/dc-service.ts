import type { SupabaseClient } from '@supabase/supabase-js';
import { assertPermission } from '../config/permissions';
import { STANDARD_DEDUCTIONS } from '../config/config';
import { DEMO_PASSWORD } from '../config/demo';
import {
  AuditLog,
  Bill,
  BillDeduction,
  BillStatus,
  BudgetChangeRequest,
  BudgetGrant,
  CorporateBankAccount,
  DDO,
  DdoAllocation,
  Department,
  Role,
  RtgsBatch,
  User,
  Vendor,
  WorkflowConfig,
} from '../types';
import { calculateBillFinancials, round2 } from '../utils/calc';
import { canTransitionStatus, isValidDdoId, isValidGSTIN, isValidIFSC, BANK_ACCOUNT_REGEX } from '../utils/validators';
import { dbError, throwIf } from './db-error';
import { seedAll } from './seed-db';
import { createAdminClient } from './supabase/admin';
import { createServerSupabase } from './supabase/server';

const BILL_SELECT = `
  id, ddo_id, vendor_id, work_order_no, work_order_date, agreement_no, description,
  base_value, cgst, sgst, igst, gross_value, total_deductions, net_payable, status,
  rtgs_batch_id, created_by, created_by_name, created_at, updated_at,
  bill_deductions (deduction_head_index, label, amount),
  bill_attachments (id, name, size, uploaded_at),
  bill_history (id, status, timestamp, user_id, user_name, user_role, remarks)
`;

function num(value: unknown): number {
  const parsed = Number(value ?? 0);
  if (Number.isNaN(parsed)) return 0;
  return round2(parsed);
}

function money(value: number): string {
  return round2(value).toFixed(2);
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`.toUpperCase();
}

function dateOnly(value: string | null | undefined): string {
  if (!value) return new Date().toISOString().split('T')[0];
  return String(value).slice(0, 10);
}

function mapBill(row: any): Bill {
  const deductions: BillDeduction[] = (row.bill_deductions || [])
    .slice()
    .sort((a: any, b: any) => a.deduction_head_index - b.deduction_head_index)
    .map((item: any) => ({
      id: item.deduction_head_index,
      label: item.label,
      amount: num(item.amount),
    }));

  return {
    id: row.id,
    ddoId: row.ddo_id,
    vendorId: row.vendor_id || '',
    workOrderNo: row.work_order_no || '',
    workOrderDate: dateOnly(row.work_order_date),
    agreementNo: row.agreement_no || '',
    description: row.description || '',
    baseValue: num(row.base_value),
    cgst: num(row.cgst),
    sgst: num(row.sgst),
    igst: num(row.igst),
    grossValue: num(row.gross_value),
    deductions,
    totalDeductions: num(row.total_deductions),
    netPayable: num(row.net_payable),
    status: row.status,
    attachments: (row.bill_attachments || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      size: item.size,
      uploadedAt: item.uploaded_at,
    })),
    history: (row.bill_history || [])
      .slice()
      .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map((item: any) => ({
        id: item.id,
        status: item.status,
        timestamp: item.timestamp,
        userId: item.user_id,
        userName: item.user_name,
        userRole: item.user_role,
        remarks: item.remarks || undefined,
      })),
    rtgsBatchId: row.rtgs_batch_id || undefined,
    createdBy: row.created_by,
    createdByName: row.created_by_name || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAllocation(row: any): DdoAllocation {
  const allocated = num(row.allocated);
  const utilized = num(row.utilized);
  return {
    id: row.id,
    grantId: row.grant_id,
    ddoId: row.ddo_id,
    allocated,
    utilized,
    remaining: round2(allocated - utilized),
  };
}

function mapGrant(row: any): BudgetGrant {
  return {
    id: row.id,
    financialYear: row.financial_year,
    departmentId: row.department_id,
    totalGranted: num(row.total_granted),
  };
}

function mapVendor(row: any): Vendor {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    gstin: row.gstin,
    bankAccountNumber: row.bank_account_number,
    ifsc: row.ifsc,
    bankName: row.bank_name,
    branchName: row.branch_name,
    address: row.address,
    active: row.active,
    documents: (row.vendor_documents || []).map((document: any) => ({
      name: document.name,
      status: document.status,
      uploadedAt: document.uploaded_at || undefined,
    })),
  };
}

function mapRequest(row: any): BudgetChangeRequest {
  return {
    id: row.id,
    ddoId: row.ddo_id,
    departmentId: row.department_id,
    type: row.type,
    amount: num(row.amount),
    reason: row.reason,
    status: row.status,
    requestedBy: row.requested_by,
    requestedAt: row.requested_at,
    decidedBy: row.decided_by || undefined,
    decidedAt: row.decided_at || undefined,
    remarks: row.remarks || undefined,
  };
}

function mapBatch(row: any): RtgsBatch {
  return {
    id: row.id,
    billIds: row.bill_ids || [],
    bankAccountId: row.bank_account_id,
    totalAmount: num(row.total_amount),
    beneficiaryCount: row.beneficiary_count,
    generatedBy: row.generated_by,
    generatedByName: row.generated_by_name,
    generatedAt: row.generated_at,
  };
}

function mapBank(row: any): CorporateBankAccount {
  return {
    id: row.id,
    bankName: row.bank_name,
    accountNumber: row.account_number,
    ifsc: row.ifsc,
    branch: row.branch,
    accountType: row.account_type,
    isActive: row.is_active,
  };
}

function mapAudit(row: any): AuditLog {
  return {
    id: row.id,
    timestamp: row.timestamp,
    actionType: row.action_type,
    userId: row.user_id,
    userName: row.user_name,
    role: row.role,
    entityType: row.entity_type,
    entityId: row.entity_id,
    oldValue: row.old_value,
    newValue: row.new_value,
  };
}

async function loadUsers(admin: SupabaseClient): Promise<User[]> {
  const [{ data: profiles, error }, { data: ddoMaps, error: ddoError }, { data: creatorMaps, error: creatorError }] =
    await Promise.all([
      admin.from('profiles').select('*').order('name'),
      admin.from('user_ddo_mappings').select('user_id, ddo_id'),
      admin.from('verifier_creator_mappings').select('verifier_id, creator_id'),
    ]);
  throwIf(error);
  throwIf(ddoError);
  throwIf(creatorError);

  return (profiles || []).map((profile) => ({
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role as Role,
    ddoIds: (ddoMaps || []).filter((row) => row.user_id === profile.id).map((row) => row.ddo_id),
    creatorIds: (creatorMaps || []).filter((row) => row.verifier_id === profile.id).map((row) => row.creator_id),
    active: profile.active,
  }));
}

async function requireActor(): Promise<{ admin: SupabaseClient; actor: User }> {
  const sessionClient = await createServerSupabase();
  const { data, error } = await sessionClient.auth.getUser();
  if (error || !data.user) throw new Error('Unauthorized. Please sign in.');

  const admin = createAdminClient();
  const users = await loadUsers(admin);
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id')
    .eq('auth_user_id', data.user.id)
    .maybeSingle();
  throwIf(profileError);
  const current = users.find((user) => user.id === profile?.id);
  if (!current || !current.active) {
    throw new Error('This account is not provisioned in DC-BMS. Run npm run seed after applying supabase/schema.sql.');
  }
  return { admin, actor: current };
}

function assertDdoAccess(actor: User, ddoId: string) {
  if (['Creator', 'Verifier', 'Approver'].includes(actor.role) && !actor.ddoIds.includes(ddoId)) {
    throw new Error(`Forbidden: Access denied to DDO ${ddoId} (HTTP 403)`);
  }
}

async function writeAudit(
  admin: SupabaseClient,
  actor: User,
  entry: {
    actionType: string;
    entityType: AuditLog['entityType'];
    entityId: string;
    oldValue: Record<string, unknown> | null;
    newValue: Record<string, unknown> | null;
  }
) {
  throwIf(
    (
      await admin.from('audit_logs').insert({
        id: newId('AUD'),
        action_type: entry.actionType,
        user_id: actor.id,
        user_name: actor.name,
        role: actor.role,
        entity_type: entry.entityType,
        entity_id: entry.entityId,
        old_value: entry.oldValue,
        new_value: entry.newValue,
      })
    ).error
  );
}

async function getWorkflow(admin: SupabaseClient): Promise<WorkflowConfig> {
  const { data, error } = await admin.from('workflow_config').select('*').eq('id', 1).single();
  throwIf(error);
  return {
    verifierEnabled: data.verifier_enabled,
    mandatoryRemarksMinLength: data.mandatory_remarks_min_length,
    financialYear: data.financial_year,
  };
}

function blankDeductions(): BillDeduction[] {
  return STANDARD_DEDUCTIONS.map((label, index) => ({ id: index + 1, label, amount: 0 }));
}

async function replaceChildren(
  admin: SupabaseClient,
  billId: string,
  deductions: BillDeduction[],
  attachments: Bill['attachments']
) {
  throwIf((await admin.from('bill_deductions').delete().eq('bill_id', billId)).error);
  throwIf((await admin.from('bill_attachments').delete().eq('bill_id', billId)).error);

  if (deductions.length) {
    throwIf(
      (
        await admin.from('bill_deductions').insert(
          deductions.map((item, index) => ({
            bill_id: billId,
            deduction_head_index: item.id || index + 1,
            label: item.label,
            amount: money(item.amount || 0),
          }))
        )
      ).error
    );
  }

  if (attachments.length) {
    throwIf(
      (
        await admin.from('bill_attachments').insert(
          attachments.map((item) => ({
            id: item.id || newId('ATT'),
            bill_id: billId,
            name: item.name,
            size: item.size,
            uploaded_at: item.uploadedAt || new Date().toISOString(),
          }))
        )
      ).error
    );
  }
}

async function fetchBill(admin: SupabaseClient, billId: string): Promise<Bill> {
  const { data, error } = await admin.from('bills').select(BILL_SELECT).eq('id', billId).maybeSingle();
  throwIf(error);
  if (!data) throw new Error(`Bill '${billId}' not found.`);
  return mapBill(data);
}

function visibleTo(actor: User, bill: Bill): boolean {
  if (actor.role === 'Creator') return actor.ddoIds.includes(bill.ddoId);
  if (actor.role === 'Verifier') {
    if (!actor.ddoIds.includes(bill.ddoId)) return false;
    if (actor.creatorIds && actor.creatorIds.length > 0) return actor.creatorIds.includes(bill.createdBy);
    return true;
  }
  if (actor.role === 'Approver') return actor.ddoIds.includes(bill.ddoId);
  if (actor.role === 'RTGS Manager') return bill.status === 'Pending RTGS' || bill.status === 'Paid';
  return true;
}

export async function getBootstrap() {
  const { admin, actor } = await requireActor();
  const [users, departments, ddos, workflowConfig] = await Promise.all([
    loadUsers(admin),
    getDepartments(),
    getDDOs(),
    getWorkflow(admin),
  ]);
  return { currentUser: actor, users, departments, ddos, workflowConfig };
}

export async function getBills(filters?: { status?: string; search?: string; ddoId?: string }): Promise<Bill[]> {
  const { admin, actor } = await requireActor();
  let query = admin.from('bills').select(BILL_SELECT).order('created_at', { ascending: false });

  if (['Creator', 'Verifier', 'Approver'].includes(actor.role)) {
    if (actor.ddoIds.length === 0) return [];
    query = query.in('ddo_id', actor.ddoIds);
  } else if (actor.role === 'RTGS Manager') {
    query = query.in('status', ['Pending RTGS', 'Paid']);
  }

  const { data, error } = await query;
  throwIf(error);
  let bills = (data || []).map(mapBill).filter((bill) => visibleTo(actor, bill));

  if (filters?.status && filters.status !== 'ALL') bills = bills.filter((bill) => bill.status === filters.status);
  if (filters?.ddoId && filters.ddoId !== 'ALL') bills = bills.filter((bill) => bill.ddoId === filters.ddoId);
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    bills = bills.filter(
      (bill) =>
        bill.id.toLowerCase().includes(q) ||
        bill.workOrderNo.toLowerCase().includes(q) ||
        bill.description.toLowerCase().includes(q) ||
        bill.vendorId.toLowerCase().includes(q)
    );
  }
  return bills;
}

export async function getBillById(billId: string): Promise<Bill> {
  const { admin, actor } = await requireActor();
  const bill = await fetchBill(admin, billId);
  if (!visibleTo(actor, bill)) {
    throw new Error(`Forbidden: Access denied to DDO ${bill.ddoId} bill (HTTP 403)`);
  }
  return bill;
}

async function persistBill(
  admin: SupabaseClient,
  actor: User,
  billData: Partial<Bill>,
  status: BillStatus,
  options: { reserve: boolean; historyRemark: string }
): Promise<Bill> {
  const existing = billData.id ? await fetchBill(admin, billData.id).catch(() => null) : null;
  if (billData.id && !existing) throw new Error(`Bill '${billData.id}' not found.`);
  if (existing && !['Draft', 'Rejected'].includes(existing.status)) {
    throw new Error(`Bills in status '${existing.status}' cannot be edited.`);
  }

  const ddoId = existing?.ddoId || billData.ddoId;
  if (!ddoId || !actor.ddoIds.includes(ddoId)) {
    throw new Error('DDO Isolation Error: You can only create bills for your assigned DDO.');
  }
  assertDdoAccess(actor, ddoId);

  const deductions =
    billData.deductions && billData.deductions.length === 16
      ? billData.deductions
      : existing?.deductions || blankDeductions();

  const financials = calculateBillFinancials({
    baseValue: billData.baseValue ?? existing?.baseValue ?? 0,
    cgst: billData.cgst ?? existing?.cgst ?? 0,
    sgst: billData.sgst ?? existing?.sgst ?? 0,
    igst: billData.igst ?? existing?.igst ?? 0,
    deductions,
  });
  if (!financials.isValid) throw new Error(financials.error || 'Invalid bill financial calculation.');

  if (existing && options.reserve && !canTransitionStatus(existing.status, 'Pending Verification')) {
    throw new Error(`Invalid status transition from '${existing.status}' to '${status}'.`);
  }

  const vendorId = billData.vendorId || existing?.vendorId || '';
  if (options.reserve && !vendorId) throw new Error('Please select a valid registered vendor.');

  const toPaise = (value: number) => Math.round((Number(value) + Number.EPSILON) * 100);
  const fromPaise = (value: number) => value / 100;
  const basePaise = toPaise(financials.baseValue);
  const cgstPaise = toPaise(financials.cgst);
  const sgstPaise = toPaise(financials.sgst);
  const igstPaise = toPaise(financials.igst);
  const grossPaise = basePaise + cgstPaise + sgstPaise + igstPaise;
  const deductionAmounts = deductions.map((item) => fromPaise(toPaise(item.amount || 0)));
  const deductionPaise = deductionAmounts.reduce((sum, amount) => sum + toPaise(amount), 0);
  const grossValue = fromPaise(grossPaise);
  const totalDeductions = fromPaise(deductionPaise);
  const netPayable = fromPaise(grossPaise - deductionPaise);
  const baseValue = fromPaise(basePaise);
  const cgst = fromPaise(cgstPaise);
  const sgst = fromPaise(sgstPaise);
  const igst = fromPaise(igstPaise);
  if (netPayable < 0) {
    throw new Error('Total deductions exceed Gross Value. Net Payable cannot be negative.');
  }

  let billId = existing?.id;
  if (!billId) {
    const { data: seq, error } = await admin.rpc('next_counter', { p_key: 'bill' });
    throwIf(error);
    billId = `IFMS ${seq}`;
  }

  let reserved = false;
  if (options.reserve) {
    const { error } = await admin.rpc('reserve_budget', { p_ddo_id: ddoId, p_gross: grossValue });
    if (error) throw new Error(dbError(error.message));
    reserved = true;
  }

  const row = {
    id: billId,
    ddo_id: ddoId,
    vendor_id: vendorId || null,
    work_order_no: billData.workOrderNo ?? existing?.workOrderNo ?? '',
    work_order_date: dateOnly(billData.workOrderDate || existing?.workOrderDate),
    agreement_no: billData.agreementNo ?? existing?.agreementNo ?? '',
    description: billData.description ?? existing?.description ?? '',
    base_value: money(baseValue),
    cgst: money(cgst),
    sgst: money(sgst),
    igst: money(igst),
    gross_value: money(grossValue),
    total_deductions: money(totalDeductions),
    net_payable: money(netPayable),
    status,
    created_by: existing?.createdBy || actor.id,
    created_by_name: existing?.createdByName || actor.name,
    created_at: existing?.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    throwIf((await admin.from('bills').upsert(row)).error);
    await replaceChildren(
      admin,
      billId,
      deductions.map((item, index) => ({ ...item, amount: deductionAmounts[index] || 0 })),
      billData.attachments || existing?.attachments || []
    );
    if (!existing || options.reserve) {
      throwIf(
        (
          await admin.from('bill_history').insert({
            id: newId('H'),
            bill_id: billId,
            status,
            user_id: actor.id,
            user_name: actor.name,
            user_role: actor.role,
            remarks: options.historyRemark,
          })
        ).error
      );
    }
  } catch (error) {
    if (reserved) {
      await admin.rpc('release_budget', { p_ddo_id: ddoId, p_gross: grossValue });
      if (existing) {
        await admin.from('bills').update({
          status: existing.status,
          base_value: money(existing.baseValue),
          cgst: money(existing.cgst),
          sgst: money(existing.sgst),
          igst: money(existing.igst),
          gross_value: money(existing.grossValue),
          total_deductions: money(existing.totalDeductions),
          net_payable: money(existing.netPayable),
        }).eq('id', billId);
      } else {
        await admin.from('bills').delete().eq('id', billId);
      }
    }
    throw error;
  }

  await writeAudit(admin, actor, {
    actionType: options.reserve ? 'BILL_SUBMITTED' : existing ? 'BILL_DRAFT_UPDATED' : 'BILL_DRAFT_CREATED',
    entityType: 'Bill',
    entityId: billId,
    oldValue: existing ? { status: existing.status, grossValue: existing.grossValue } : null,
    newValue: { status, grossValue },
  });

  return fetchBill(admin, billId);
}

export async function saveDraftBill(billData: Partial<Bill>): Promise<Bill> {
  const { admin, actor } = await requireActor();
  assertPermission(actor.role, 'create:bill');
  return persistBill(admin, actor, billData, 'Draft', {
    reserve: false,
    historyRemark: billData.id ? 'Draft updated by Creator.' : 'Draft created by Creator.',
  });
}

export async function submitBill(billData: Partial<Bill>): Promise<Bill> {
  const { admin, actor } = await requireActor();
  assertPermission(actor.role, 'submit:bill');
  const workflow = await getWorkflow(admin);
  const nextStatus: BillStatus = workflow.verifierEnabled ? 'Pending Verification' : 'Pending Approval';
  const existing = billData.id ? await fetchBill(admin, billData.id).catch(() => null) : null;
  return persistBill(admin, actor, billData, nextStatus, {
    reserve: true,
    historyRemark:
      existing?.status === 'Rejected' ? 'Resubmitted with modifications.' : 'Submitted for verification.',
  });
}

export async function verifyBill(billId: string, remarks?: string): Promise<Bill> {
  const { admin, actor } = await requireActor();
  assertPermission(actor.role, 'verify:bill');
  const bill = await fetchBill(admin, billId);
  assertDdoAccess(actor, bill.ddoId);
  if (actor.creatorIds && actor.creatorIds.length > 0 && !actor.creatorIds.includes(bill.createdBy)) {
    throw new Error('DDO Isolation Error: This bill was not created by a mapped Creator.');
  }
  if (bill.status !== 'Pending Verification') {
    throw new Error(`Cannot verify bill in status '${bill.status}'. Must be 'Pending Verification'.`);
  }

  throwIf((await admin.from('bills').update({ status: 'Pending Approval', updated_at: new Date().toISOString() }).eq('id', billId)).error);
  throwIf(
    (
      await admin.from('bill_history').insert({
        id: newId('H'),
        bill_id: billId,
        status: 'Pending Approval',
        user_id: actor.id,
        user_name: actor.name,
        user_role: actor.role,
        remarks: remarks?.trim() || 'Verified all bill measurements, deductions and vouchers.',
      })
    ).error
  );
  await writeAudit(admin, actor, {
    actionType: 'BILL_VERIFIED',
    entityType: 'Bill',
    entityId: billId,
    oldValue: { status: bill.status },
    newValue: { status: 'Pending Approval', remarks },
  });
  return fetchBill(admin, billId);
}

export async function rejectBill(billId: string, remarks: string): Promise<Bill> {
  const { admin, actor } = await requireActor();
  if (actor.role === 'Verifier') assertPermission(actor.role, 'reject:verifier_bill');
  else if (actor.role === 'Approver') assertPermission(actor.role, 'revert:approver_bill');
  else throw new Error(`Role '${actor.role}' cannot reject bills.`);

  const workflow = await getWorkflow(admin);
  if (!remarks || remarks.trim().length < workflow.mandatoryRemarksMinLength) {
    throw new Error(
      `Mandatory remarks must be at least ${workflow.mandatoryRemarksMinLength} characters explaining the rejection reason.`
    );
  }

  const bill = await fetchBill(admin, billId);
  assertDdoAccess(actor, bill.ddoId);
  const action = actor.role === 'Verifier' ? 'BILL_REJECTED_BY_VERIFIER' : 'BILL_REVERTED_BY_APPROVER';
  const { error } = await admin.rpc('reject_bill', {
    p_actor_id: actor.id,
    p_bill_id: billId,
    p_remarks: remarks.trim(),
    p_action: action,
  });
  if (error) throw new Error(dbError(error.message));
  return fetchBill(admin, billId);
}

export async function approveBill(billId: string, remarks?: string): Promise<Bill> {
  const { admin, actor } = await requireActor();
  assertPermission(actor.role, 'approve:bill');
  const bill = await fetchBill(admin, billId);
  assertDdoAccess(actor, bill.ddoId);
  if (bill.status !== 'Pending Approval') {
    throw new Error(`Cannot approve bill with status '${bill.status}'. Must be 'Pending Approval'.`);
  }

  throwIf((await admin.from('bills').update({ status: 'Pending RTGS', updated_at: new Date().toISOString() }).eq('id', billId)).error);
  throwIf(
    (
      await admin.from('bill_history').insert({
        id: newId('H'),
        bill_id: billId,
        status: 'Pending RTGS',
        user_id: actor.id,
        user_name: actor.name,
        user_role: actor.role,
        remarks: remarks?.trim() || 'Sanction accorded. Approved for RTGS disbursement.',
      })
    ).error
  );
  await writeAudit(admin, actor, {
    actionType: 'BILL_APPROVED',
    entityType: 'Bill',
    entityId: billId,
    oldValue: { status: bill.status },
    newValue: { status: 'Pending RTGS', remarks },
  });
  return fetchBill(admin, billId);
}

export async function generateRtgsAdvice(billIds: string[], bankAccountId: string): Promise<RtgsBatch> {
  const { admin, actor } = await requireActor();
  assertPermission(actor.role, 'generate:rtgs_advice');
  const { data, error } = await admin.rpc('generate_rtgs_batch', {
    p_actor_id: actor.id,
    p_bill_ids: billIds,
    p_bank_id: bankAccountId,
  });
  if (error) throw new Error(dbError(error.message));
  return {
    id: data.id,
    billIds: data.billIds,
    bankAccountId: data.bankAccountId,
    totalAmount: num(data.totalAmount),
    beneficiaryCount: data.beneficiaryCount,
    generatedBy: data.generatedBy,
    generatedByName: data.generatedByName,
    generatedAt: data.generatedAt,
  };
}

export async function getRtgsBatches(): Promise<RtgsBatch[]> {
  const { admin, actor } = await requireActor();
  assertPermission(actor.role, 'view:rtgs_history');
  const { data, error } = await admin.from('rtgs_batches').select('*').order('generated_at', { ascending: false });
  throwIf(error);
  return (data || []).map(mapBatch);
}

export async function getRtgsBatchById(batchId: string) {
  const { admin, actor } = await requireActor();
  assertPermission(actor.role, 'view:pending_rtgs');
  const { data, error } = await admin.from('rtgs_batches').select('*').eq('id', batchId).maybeSingle();
  throwIf(error);
  if (!data) throw new Error(`RTGS Batch '${batchId}' not found.`);
  const batch = mapBatch(data);
  const { data: billRows, error: billError } = await admin.from('bills').select(BILL_SELECT).in('id', batch.billIds);
  throwIf(billError);
  const { data: bank, error: bankError } = await admin
    .from('corporate_bank_accounts')
    .select('*')
    .eq('id', batch.bankAccountId)
    .maybeSingle();
  throwIf(bankError);
  if (!bank) throw new Error('Corporate bank account for this batch was not found.');
  return { batch, bills: (billRows || []).map(mapBill), bankAccount: mapBank(bank) };
}

export async function getBudgetGrants(): Promise<BudgetGrant[]> {
  const { admin } = await requireActor();
  const { data, error } = await admin.from('budget_grants').select('*').order('id');
  throwIf(error);
  return (data || []).map(mapGrant);
}

export async function createOrUpdateGrant(grantInput: Partial<BudgetGrant>): Promise<BudgetGrant> {
  const { admin, actor } = await requireActor();
  assertPermission(actor.role, 'manage:budget_grants');
  if (!grantInput.departmentId || !grantInput.totalGranted || grantInput.totalGranted <= 0) {
    throw new Error('Valid department and positive grant amount are required.');
  }
  const workflow = await getWorkflow(admin);
  const financialYear = grantInput.financialYear || workflow.financialYear;
  const existing = grantInput.id
    ? (await admin.from('budget_grants').select('*').eq('id', grantInput.id).maybeSingle()).data
    : null;

  if (existing) {
    const { data: allocations, error } = await admin.from('ddo_allocations').select('allocated').eq('grant_id', existing.id);
    throwIf(error);
    const used = (allocations || []).reduce((sum, row) => sum + num(row.allocated), 0);
    if (grantInput.totalGranted < used) {
      throw new Error(`Cannot reduce grant to ₹${grantInput.totalGranted} because ₹${used} is already allocated to DDOs.`);
    }
    throwIf(
      (
        await admin
          .from('budget_grants')
          .update({ total_granted: money(grantInput.totalGranted), financial_year: financialYear })
          .eq('id', existing.id)
      ).error
    );
    await writeAudit(admin, actor, {
      actionType: 'GRANT_UPDATED',
      entityType: 'BudgetGrant',
      entityId: existing.id,
      oldValue: { totalGranted: num(existing.total_granted) },
      newValue: { totalGranted: round2(grantInput.totalGranted) },
    });
    return { id: existing.id, financialYear, departmentId: existing.department_id, totalGranted: round2(grantInput.totalGranted) };
  }

  const id = `GRT-${financialYear.split('-')[0]}-${grantInput.departmentId.replace('DEP-', '')}`;
  const { error } = await admin.from('budget_grants').insert({
    id,
    financial_year: financialYear,
    department_id: grantInput.departmentId,
    total_granted: money(grantInput.totalGranted),
  });
  if (error) {
    if (error.message.includes('uq_dept_fy') || error.message.includes('duplicate')) {
      throw new Error('A grant for this department and financial year already exists.');
    }
    throw new Error(dbError(error.message));
  }
  await writeAudit(admin, actor, {
    actionType: 'GRANT_CREATED',
    entityType: 'BudgetGrant',
    entityId: id,
    oldValue: null,
    newValue: { totalGranted: round2(grantInput.totalGranted) },
  });
  return { id, financialYear, departmentId: grantInput.departmentId, totalGranted: round2(grantInput.totalGranted) };
}

export async function getDdoAllocations(): Promise<DdoAllocation[]> {
  const { admin, actor } = await requireActor();
  let query = admin.from('ddo_allocations').select('*').order('ddo_id');
  if (['Creator', 'Verifier', 'Approver'].includes(actor.role)) {
    if (actor.ddoIds.length === 0) return [];
    query = query.in('ddo_id', actor.ddoIds);
  }
  const { data, error } = await query;
  throwIf(error);
  return (data || []).map(mapAllocation);
}

export async function updateDdoAllocation(allocationId: string, newAllocated: number): Promise<DdoAllocation> {
  const { admin, actor } = await requireActor();
  assertPermission(actor.role, 'manage:ddo_allocations');
  const { data, error } = await admin.rpc('update_ddo_allocation', {
    p_actor_id: actor.id,
    p_allocation_id: allocationId,
    p_new_allocated: round2(newAllocated),
  });
  if (error) throw new Error(dbError(error.message));
  return {
    id: data.id,
    grantId: data.grantId,
    ddoId: data.ddoId,
    allocated: num(data.allocated),
    utilized: num(data.utilized),
    remaining: num(data.remaining),
  };
}

export async function requestBudgetChange(req: {
  ddoId: string;
  type: 'increase' | 'decrease';
  amount: number;
  reason: string;
}): Promise<BudgetChangeRequest> {
  const { admin, actor } = await requireActor();
  assertPermission(actor.role, 'request:budget_change');
  if (!actor.ddoIds.includes(req.ddoId)) throw new Error('Cannot request budget change for unassigned DDO.');
  if (req.amount <= 0) throw new Error('Requested amount must be greater than zero.');
  const { data: ddo, error } = await admin.from('ddos').select('department_id').eq('id', req.ddoId).maybeSingle();
  throwIf(error);
  if (!ddo) throw new Error(`DDO ${req.ddoId} not found.`);

  const request: BudgetChangeRequest = {
    id: newId('BCR'),
    ddoId: req.ddoId,
    departmentId: ddo.department_id,
    type: req.type,
    amount: round2(req.amount),
    reason: req.reason.trim(),
    status: 'Pending',
    requestedBy: actor.id,
    requestedAt: new Date().toISOString(),
  };
  throwIf(
    (
      await admin.from('budget_change_requests').insert({
        id: request.id,
        ddo_id: request.ddoId,
        department_id: request.departmentId,
        type: request.type,
        amount: money(request.amount),
        reason: request.reason,
        status: request.status,
        requested_by: request.requestedBy,
        requested_at: request.requestedAt,
      })
    ).error
  );
  await writeAudit(admin, actor, {
    actionType: 'BUDGET_CHANGE_REQUESTED',
    entityType: 'BudgetChangeRequest',
    entityId: request.id,
    oldValue: null,
    newValue: { ...request },
  });
  return request;
}

export async function getBudgetChangeRequests(): Promise<BudgetChangeRequest[]> {
  const { admin, actor } = await requireActor();
  let query = admin.from('budget_change_requests').select('*').order('requested_at', { ascending: false });
  if (actor.role === 'Creator') {
    if (actor.ddoIds.length === 0) return [];
    query = query.in('ddo_id', actor.ddoIds);
  }
  const { data, error } = await query;
  throwIf(error);
  return (data || []).map(mapRequest);
}

export async function decideBudgetChangeRequest(
  requestId: string,
  decision: 'Approved' | 'Rejected',
  remarks?: string
): Promise<BudgetChangeRequest> {
  const { admin, actor } = await requireActor();
  assertPermission(actor.role, 'decide:budget_requests');
  const { data: row, error } = await admin.from('budget_change_requests').select('*').eq('id', requestId).maybeSingle();
  throwIf(error);
  if (!row) throw new Error(`Budget change request '${requestId}' not found.`);
  if (row.status !== 'Pending') throw new Error(`Request has already been ${row.status}.`);

  if (decision === 'Approved') {
    const { data: alloc, error: allocError } = await admin
      .from('ddo_allocations')
      .select('*')
      .eq('ddo_id', row.ddo_id)
      .maybeSingle();
    throwIf(allocError);
    if (!alloc) throw new Error(`No allocation found for DDO ${row.ddo_id}.`);
    const current = mapAllocation(alloc);
    const nextAmount = row.type === 'increase' ? current.allocated + num(row.amount) : current.allocated - num(row.amount);
    const { error: updateError } = await admin.rpc('update_ddo_allocation', {
      p_actor_id: actor.id,
      p_allocation_id: current.id,
      p_new_allocated: round2(nextAmount),
    });
    if (updateError) throw new Error(dbError(updateError.message));
  }

  const decidedAt = new Date().toISOString();
  throwIf(
    (
      await admin
        .from('budget_change_requests')
        .update({ status: decision, decided_by: actor.id, decided_at: decidedAt, remarks: remarks || null })
        .eq('id', requestId)
    ).error
  );
  await writeAudit(admin, actor, {
    actionType: `BUDGET_CHANGE_${decision.toUpperCase()}`,
    entityType: 'BudgetChangeRequest',
    entityId: requestId,
    oldValue: { status: 'Pending' },
    newValue: { status: decision, remarks },
  });
  return { ...mapRequest(row), status: decision, decidedBy: actor.id, decidedAt, remarks };
}

export async function getDepartments(): Promise<Department[]> {
  const { admin } = await requireActor();
  const { data, error } = await admin.from('departments').select('*').order('name');
  throwIf(error);
  return (data || []).map((row) => ({ id: row.id, name: row.name, createdAt: row.created_at }));
}

export async function createDepartment(dept: { name: string }): Promise<Department> {
  const { admin, actor } = await requireActor();
  assertPermission(actor.role, 'manage:departments');
  const created: Department = {
    id: `DEP-${Date.now().toString(36).toUpperCase().slice(0, 4)}`,
    name: dept.name.trim(),
    createdAt: new Date().toISOString(),
  };
  throwIf((await admin.from('departments').insert({ id: created.id, name: created.name, created_at: created.createdAt })).error);
  await writeAudit(admin, actor, {
    actionType: 'DEPARTMENT_CREATED',
    entityType: 'Department',
    entityId: created.id,
    oldValue: null,
    newValue: { ...created },
  });
  return created;
}

export async function getDDOs(): Promise<DDO[]> {
  const { admin } = await requireActor();
  const { data, error } = await admin.from('ddos').select('*').order('id');
  throwIf(error);
  return (data || []).map((row) => ({ id: row.id, name: row.name, departmentId: row.department_id }));
}

export async function createDDO(ddoData: { id: string; name: string; departmentId: string }): Promise<DDO> {
  const { admin, actor } = await requireActor();
  assertPermission(actor.role, 'manage:ddos');
  if (!isValidDdoId(ddoData.id)) throw new Error('DDO ID must be a valid 6 or 7-digit numeric code.');
  const ddo: DDO = { id: ddoData.id.trim(), name: ddoData.name.trim(), departmentId: ddoData.departmentId };
  const { error } = await admin.from('ddos').insert({ id: ddo.id, name: ddo.name, department_id: ddo.departmentId });
  if (error) {
    if (error.message.includes('duplicate') || error.message.includes('ddos_pkey')) {
      throw new Error(`DDO ID '${ddo.id}' already exists.`);
    }
    throw new Error(dbError(error.message));
  }

  const { data: grant } = await admin
    .from('budget_grants')
    .select('id')
    .eq('department_id', ddo.departmentId)
    .limit(1)
    .maybeSingle();
  if (grant) {
    throwIf(
      (
        await admin.from('ddo_allocations').insert({
          id: `ALC-${ddo.departmentId.replace('DEP-', '')}-${ddo.id}`,
          grant_id: grant.id,
          ddo_id: ddo.id,
          allocated: 0,
          utilized: 0,
        })
      ).error
    );
  }
  await writeAudit(admin, actor, {
    actionType: 'DDO_CREATED',
    entityType: 'DDO',
    entityId: ddo.id,
    oldValue: null,
    newValue: { ...ddo },
  });
  return ddo;
}

export async function getVendors(): Promise<Vendor[]> {
  const { admin } = await requireActor();
  const { data, error } = await admin
    .from('vendors')
    .select('*, vendor_documents(name, status, uploaded_at)')
    .order('id');
  throwIf(error);
  return (data || []).map(mapVendor);
}

export async function createVendor(
  vendorData: Omit<Vendor, 'id' | 'documents' | 'active'>
): Promise<Vendor> {
  const { admin, actor } = await requireActor();
  assertPermission(actor.role, 'manage:vendors');
  if (!isValidGSTIN(vendorData.gstin)) throw new Error('Invalid GSTIN format. Expected format e.g. 29ABCDE1234F1Z5.');
  if (!isValidIFSC(vendorData.ifsc)) throw new Error('Invalid IFSC format. Expected 11 alphanumeric characters e.g. CNRB0000412.');
  if (!BANK_ACCOUNT_REGEX.test(vendorData.bankAccountNumber)) {
    throw new Error('Bank account number must be 9 to 18 digits.');
  }

  const { count, error: countError } = await admin.from('vendors').select('id', { count: 'exact', head: true });
  throwIf(countError);
  const vendor: Vendor = {
    ...vendorData,
    gstin: vendorData.gstin.trim().toUpperCase(),
    ifsc: vendorData.ifsc.trim().toUpperCase(),
    id: `V-${String((count || 0) + 1).padStart(4, '0')}`,
    active: true,
    documents: [
      { name: 'PAN Card Copy', status: 'Pending' },
      { name: 'GSTIN Registration Certificate', status: 'Pending' },
      { name: 'Cancelled Bank Cheque', status: 'Pending' },
      { name: 'GBA Empanelment Order', status: 'Pending' },
    ],
  };
  throwIf(
    (
      await admin.from('vendors').insert({
        id: vendor.id,
        name: vendor.name,
        type: vendor.type,
        gstin: vendor.gstin,
        bank_account_number: vendor.bankAccountNumber,
        ifsc: vendor.ifsc,
        bank_name: vendor.bankName,
        branch_name: vendor.branchName,
        address: vendor.address,
        active: true,
      })
    ).error
  );
  throwIf(
    (
      await admin.from('vendor_documents').insert(
        vendor.documents.map((document) => ({ vendor_id: vendor.id, name: document.name, status: document.status }))
      )
    ).error
  );
  await writeAudit(admin, actor, {
    actionType: 'VENDOR_CREATED',
    entityType: 'Vendor',
    entityId: vendor.id,
    oldValue: null,
    newValue: { id: vendor.id, name: vendor.name },
  });
  return vendor;
}

export async function toggleVendorDocStatus(vendorId: string, docName: string): Promise<Vendor> {
  const { admin, actor } = await requireActor();
  assertPermission(actor.role, 'manage:vendors');
  const { data: doc, error } = await admin
    .from('vendor_documents')
    .select('*')
    .eq('vendor_id', vendorId)
    .eq('name', docName)
    .maybeSingle();
  throwIf(error);
  if (!doc) throw new Error(`Document '${docName}' not found on vendor.`);
  const nextStatus = doc.status === 'Uploaded' ? 'Pending' : 'Uploaded';
  throwIf(
    (
      await admin
        .from('vendor_documents')
        .update({ status: nextStatus, uploaded_at: nextStatus === 'Uploaded' ? new Date().toISOString() : null })
        .eq('id', doc.id)
    ).error
  );
  await writeAudit(admin, actor, {
    actionType: 'VENDOR_DOCUMENT_STATUS_CHANGED',
    entityType: 'Vendor',
    entityId: vendorId,
    oldValue: { document: docName, status: doc.status },
    newValue: { document: docName, status: nextStatus },
  });
  const vendors = await getVendors();
  const vendor = vendors.find((item) => item.id === vendorId);
  if (!vendor) throw new Error(`Vendor '${vendorId}' not found.`);
  return vendor;
}

export async function getUsers(): Promise<User[]> {
  const { admin, actor } = await requireActor();
  assertPermission(actor.role, 'manage:users');
  return loadUsers(admin);
}

export async function createUser(userData: Omit<User, 'id'>): Promise<User> {
  const { admin, actor } = await requireActor();
  assertPermission(actor.role, 'manage:users');
  const id = `USR-${Date.now().toString(36).toUpperCase()}`;
  const { data, error } = await admin.auth.admin.createUser({
    email: userData.email.trim().toLowerCase(),
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { name: userData.name, role: userData.role, profile_id: id },
  });
  if (error) throw new Error(dbError(error.message));

  const { error: profileError } = await admin.from('profiles').insert({
    id,
    auth_user_id: data.user?.id,
    name: userData.name.trim(),
    email: userData.email.trim().toLowerCase(),
    role: userData.role,
    active: userData.active,
  });
  if (profileError) throw new Error(dbError(profileError.message));

  if (userData.ddoIds?.length) {
    throwIf(
      (
        await admin.from('user_ddo_mappings').insert(userData.ddoIds.map((ddoId) => ({ user_id: id, ddo_id: ddoId })))
      ).error
    );
  }
  if (userData.creatorIds?.length) {
    throwIf(
      (
        await admin
          .from('verifier_creator_mappings')
          .insert(userData.creatorIds.map((creatorId) => ({ verifier_id: id, creator_id: creatorId })))
      ).error
    );
  }
  await writeAudit(admin, actor, {
    actionType: 'USER_CREATED',
    entityType: 'User',
    entityId: id,
    oldValue: null,
    newValue: { id, name: userData.name, role: userData.role, ddoIds: userData.ddoIds },
  });
  return { ...userData, id, email: userData.email.trim().toLowerCase() };
}

export async function updateUserMappings(
  userId: string,
  updates: { ddoIds?: string[]; creatorIds?: string[]; active?: boolean; role?: Role }
): Promise<User> {
  const { admin, actor } = await requireActor();
  assertPermission(actor.role, 'manage:users');
  const users = await loadUsers(admin);
  const target = users.find((user) => user.id === userId);
  if (!target) throw new Error(`User '${userId}' not found.`);

  if (updates.role || updates.active !== undefined) {
    throwIf(
      (
        await admin
          .from('profiles')
          .update({
            ...(updates.role ? { role: updates.role } : {}),
            ...(updates.active !== undefined ? { active: updates.active } : {}),
          })
          .eq('id', userId)
      ).error
    );
  }
  if (updates.ddoIds) {
    throwIf((await admin.from('user_ddo_mappings').delete().eq('user_id', userId)).error);
    if (updates.ddoIds.length) {
      throwIf(
        (await admin.from('user_ddo_mappings').insert(updates.ddoIds.map((ddoId) => ({ user_id: userId, ddo_id: ddoId })))).error
      );
    }
  }
  if (updates.creatorIds) {
    throwIf((await admin.from('verifier_creator_mappings').delete().eq('verifier_id', userId)).error);
    if (updates.creatorIds.length) {
      throwIf(
        (
          await admin
            .from('verifier_creator_mappings')
            .insert(updates.creatorIds.map((creatorId) => ({ verifier_id: userId, creator_id: creatorId })))
        ).error
      );
    }
  }
  await writeAudit(admin, actor, {
    actionType: 'USER_ROLE_MAPPING_UPDATED',
    entityType: 'User',
    entityId: userId,
    oldValue: { ddoIds: target.ddoIds, creatorIds: target.creatorIds || [], role: target.role },
    newValue: updates,
  });
  const refreshed = await loadUsers(admin);
  const updated = refreshed.find((user) => user.id === userId);
  if (!updated) throw new Error(`User '${userId}' not found.`);
  return updated;
}

export async function overridePassword(userId: string): Promise<{ success: boolean; message: string }> {
  const { admin, actor } = await requireActor();
  assertPermission(actor.role, 'override:passwords');
  const { data: profile, error } = await admin.from('profiles').select('*').eq('id', userId).maybeSingle();
  throwIf(error);
  if (!profile) throw new Error(`User '${userId}' not found.`);
  if (!profile.auth_user_id) throw new Error('This profile is not linked to a sign-in account.');

  const { error: authError } = await admin.auth.admin.updateUserById(profile.auth_user_id, {
    password: DEMO_PASSWORD,
  });
  if (authError) throw new Error(dbError(authError.message));
  await writeAudit(admin, actor, {
    actionType: 'PASSWORD_OVERRIDE',
    entityType: 'User',
    entityId: userId,
    oldValue: { overridden: false },
    newValue: { overridden: true, timestamp: new Date().toISOString() },
  });
  return {
    success: true,
    message: `Password for ${profile.email} was reset to the demo password and recorded in the audit log.`,
  };
}

export async function getBankAccounts(): Promise<CorporateBankAccount[]> {
  const { admin } = await requireActor();
  const { data, error } = await admin.from('corporate_bank_accounts').select('*').order('bank_name');
  throwIf(error);
  return (data || []).map(mapBank);
}

export async function getWorkflowConfig(): Promise<WorkflowConfig> {
  const { admin } = await requireActor();
  return getWorkflow(admin);
}

export async function updateWorkflowConfig(updates: Partial<WorkflowConfig>): Promise<WorkflowConfig> {
  const { admin, actor } = await requireActor();
  assertPermission(actor.role, 'manage:workflow');
  const previous = await getWorkflow(admin);
  const next: WorkflowConfig = { ...previous, ...updates };
  throwIf(
    (
      await admin
        .from('workflow_config')
        .update({
          verifier_enabled: next.verifierEnabled,
          mandatory_remarks_min_length: next.mandatoryRemarksMinLength,
          financial_year: next.financialYear,
        })
        .eq('id', 1)
    ).error
  );
  await writeAudit(admin, actor, {
    actionType: 'WORKFLOW_CONFIG_UPDATED',
    entityType: 'WorkflowConfig',
    entityId: 'SYSTEM_CONFIG',
    oldValue: { ...previous },
    newValue: { ...next },
  });
  return next;
}

export async function getAuditLogs(filters?: { actionType?: string; userId?: string; search?: string }): Promise<AuditLog[]> {
  const { admin, actor } = await requireActor();
  assertPermission(actor.role, 'view:audit_log');
  let query = admin.from('audit_logs').select('*').order('timestamp', { ascending: false });
  if (filters?.actionType && filters.actionType !== 'ALL') query = query.eq('action_type', filters.actionType);
  if (filters?.userId && filters.userId !== 'ALL') query = query.eq('user_id', filters.userId);
  const { data, error } = await query;
  throwIf(error);
  let logs = (data || []).map(mapAudit);
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    logs = logs.filter(
      (log) =>
        log.entityId.toLowerCase().includes(q) ||
        log.actionType.toLowerCase().includes(q) ||
        log.userName.toLowerCase().includes(q)
    );
  }
  return logs;
}

export async function resetDemo(): Promise<void> {
  const { admin, actor } = await requireActor();
  await seedAll(admin);
  await writeAudit(admin, actor, {
    actionType: 'DEMO_DATA_RESET',
    entityType: 'WorkflowConfig',
    entityId: 'SYSTEM_CONFIG',
    oldValue: null,
    newValue: { resetBy: actor.id },
  });
}
