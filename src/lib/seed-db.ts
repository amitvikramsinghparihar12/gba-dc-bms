import type { SupabaseClient } from '@supabase/supabase-js';
import { getInitialSeedData } from '../server/seedData';
import { DEMO_PASSWORD } from '../config/demo';
import { throwIf } from './db-error';

function paise(value: number): number {
  return Math.round((Number(value) + Number.EPSILON) * 100);
}

function rupees(paiseValue: number): string {
  return (paiseValue / 100).toFixed(2);
}

async function clearOperationalData(admin: SupabaseClient) {
  const tables = [
    'audit_logs',
    'bill_history',
    'bill_attachments',
    'bill_deductions',
    'bills',
    'rtgs_batches',
    'budget_change_requests',
    'ddo_allocations',
    'budget_grants',
    'vendor_documents',
    'vendors',
    'user_ddo_mappings',
    'verifier_creator_mappings',
    'ddos',
    'departments',
    'corporate_bank_accounts',
  ];

  for (const table of tables) {
    const { error } = await admin.from(table).delete().not('id', 'is', null);
    throwIf(error);
  }
}

async function ensureAuthUsers(admin: SupabaseClient, users: ReturnType<typeof getInitialSeedData>['users']) {
  const { data: listed, error } = await admin.auth.admin.listUsers({ perPage: 200 });
  throwIf(error);
  const byEmail = new Map((listed?.users || []).map((user) => [user.email?.toLowerCase(), user]));
  const authIds = new Map<string, string>();

  for (const user of users) {
    const existing = byEmail.get(user.email.toLowerCase());
    if (existing) {
      const { error: updateError } = await admin.auth.admin.updateUserById(existing.id, {
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { name: user.name, role: user.role, profile_id: user.id },
      });
      throwIf(updateError);
      authIds.set(user.id, existing.id);
      continue;
    }

    const { data, error: createError } = await admin.auth.admin.createUser({
      email: user.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { name: user.name, role: user.role, profile_id: user.id },
    });
    throwIf(createError);
    if (!data.user) throw new Error(`Could not create auth user for ${user.email}`);
    authIds.set(user.id, data.user.id);
  }

  return authIds;
}

export async function seedAll(admin: SupabaseClient) {
  const seed = getInitialSeedData();
  const authIds = await ensureAuthUsers(admin, seed.users);

  const { error: profileError } = await admin.from('profiles').upsert(
    seed.users.map((user) => ({
      id: user.id,
      auth_user_id: authIds.get(user.id),
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
    }))
  );
  throwIf(profileError);

  await clearOperationalData(admin);

  throwIf((await admin.from('departments').insert(
    seed.departments.map((department) => ({
      id: department.id,
      name: department.name,
      created_at: department.createdAt,
    }))
  )).error);

  throwIf((await admin.from('ddos').insert(
    seed.ddos.map((ddo) => ({
      id: ddo.id,
      name: ddo.name,
      department_id: ddo.departmentId,
    }))
  )).error);

  const ddoMappings = seed.users.flatMap((user) =>
    user.ddoIds.map((ddoId) => ({ user_id: user.id, ddo_id: ddoId }))
  );
  if (ddoMappings.length) throwIf((await admin.from('user_ddo_mappings').insert(ddoMappings)).error);

  const creatorMappings = seed.users.flatMap((user) =>
    (user.creatorIds || []).map((creatorId) => ({ verifier_id: user.id, creator_id: creatorId }))
  );
  if (creatorMappings.length) {
    throwIf((await admin.from('verifier_creator_mappings').insert(creatorMappings)).error);
  }

  throwIf((await admin.from('vendors').insert(
    seed.vendors.map((vendor) => ({
      id: vendor.id,
      name: vendor.name,
      type: vendor.type,
      gstin: vendor.gstin,
      bank_account_number: vendor.bankAccountNumber,
      ifsc: vendor.ifsc,
      bank_name: vendor.bankName,
      branch_name: vendor.branchName,
      address: vendor.address,
      active: vendor.active,
    }))
  )).error);

  const documents = seed.vendors.flatMap((vendor) =>
    vendor.documents.map((document) => ({
      vendor_id: vendor.id,
      name: document.name,
      status: document.status,
      uploaded_at: document.uploadedAt || null,
    }))
  );
  throwIf((await admin.from('vendor_documents').insert(documents)).error);

  throwIf((await admin.from('budget_grants').insert(
    seed.budgetGrants.map((grant) => ({
      id: grant.id,
      financial_year: grant.financialYear,
      department_id: grant.departmentId,
      total_granted: rupees(paise(grant.totalGranted)),
    }))
  )).error);

  throwIf((await admin.from('ddo_allocations').insert(
    seed.ddoAllocations.map((allocation) => ({
      id: allocation.id,
      grant_id: allocation.grantId,
      ddo_id: allocation.ddoId,
      allocated: rupees(paise(allocation.allocated)),
      utilized: rupees(paise(allocation.utilized)),
    }))
  )).error);

  throwIf((await admin.from('corporate_bank_accounts').insert(
    seed.bankAccounts.map((account) => ({
      id: account.id,
      bank_name: account.bankName,
      account_number: account.accountNumber,
      ifsc: account.ifsc,
      branch: account.branch,
      account_type: account.accountType,
      is_active: account.isActive,
    }))
  )).error);

  throwIf((await admin.from('rtgs_batches').insert(
    seed.rtgsBatches.map((batch) => ({
      id: batch.id,
      bill_ids: batch.billIds,
      bank_account_id: batch.bankAccountId,
      total_amount: rupees(paise(batch.totalAmount)),
      beneficiary_count: batch.beneficiaryCount,
      generated_by: batch.generatedBy,
      generated_by_name: batch.generatedByName,
      generated_at: batch.generatedAt,
    }))
  )).error);

  const billRows = seed.bills.map((bill) => {
    const base = paise(bill.baseValue);
    const cgst = paise(bill.cgst);
    const sgst = paise(bill.sgst);
    const igst = paise(bill.igst);
    const gross = base + cgst + sgst + igst;
    const deductions = bill.deductions.reduce((sum, item) => sum + paise(item.amount), 0);
    return {
      id: bill.id,
      ddo_id: bill.ddoId,
      vendor_id: bill.vendorId,
      work_order_no: bill.workOrderNo,
      work_order_date: bill.workOrderDate,
      agreement_no: bill.agreementNo,
      description: bill.description,
      base_value: rupees(base),
      cgst: rupees(cgst),
      sgst: rupees(sgst),
      igst: rupees(igst),
      gross_value: rupees(gross),
      total_deductions: rupees(deductions),
      net_payable: rupees(gross - deductions),
      status: bill.status,
      rtgs_batch_id: bill.rtgsBatchId || null,
      created_by: bill.createdBy,
      created_by_name: bill.createdByName || null,
      created_at: bill.createdAt,
      updated_at: bill.updatedAt,
    };
  });
  throwIf((await admin.from('bills').insert(billRows)).error);

  const deductionRows = seed.bills.flatMap((bill) =>
    bill.deductions.map((item, index) => ({
      bill_id: bill.id,
      deduction_head_index: item.id || index + 1,
      label: item.label,
      amount: rupees(paise(item.amount)),
    }))
  );
  throwIf((await admin.from('bill_deductions').insert(deductionRows)).error);

  const attachmentRows = seed.bills.flatMap((bill) =>
    bill.attachments.map((attachment) => ({
      id: attachment.id,
      bill_id: bill.id,
      name: attachment.name,
      size: attachment.size,
      uploaded_at: attachment.uploadedAt,
    }))
  );
  if (attachmentRows.length) throwIf((await admin.from('bill_attachments').insert(attachmentRows)).error);

  const historyRows = seed.bills.flatMap((bill) =>
    bill.history.map((item) => ({
      id: item.id,
      bill_id: bill.id,
      status: item.status,
      timestamp: item.timestamp,
      user_id: item.userId,
      user_name: item.userName,
      user_role: item.userRole,
      remarks: item.remarks || null,
    }))
  );
  if (historyRows.length) throwIf((await admin.from('bill_history').insert(historyRows)).error);

  throwIf((await admin.from('audit_logs').insert(
    seed.auditLogs.map((log) => ({
      id: log.id,
      timestamp: log.timestamp,
      action_type: log.actionType,
      user_id: log.userId,
      user_name: log.userName,
      role: log.role,
      entity_type: log.entityType,
      entity_id: log.entityId,
      old_value: log.oldValue,
      new_value: log.newValue,
    }))
  )).error);

  throwIf((await admin.from('workflow_config').upsert({
    id: 1,
    verifier_enabled: seed.workflowConfig.verifierEnabled,
    mandatory_remarks_min_length: seed.workflowConfig.mandatoryRemarksMinLength,
    financial_year: seed.workflowConfig.financialYear,
  })).error);

  throwIf((await admin.from('app_counters').upsert([
    { key: 'bill', value: 67 },
    { key: 'rtgs', value: 1 },
  ])).error);
}
