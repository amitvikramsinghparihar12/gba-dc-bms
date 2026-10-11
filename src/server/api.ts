import {
  User,
  Bill,
  BudgetGrant,
  DdoAllocation,
  BudgetChangeRequest,
  Vendor,
  DDO,
  Department,
  RtgsBatch,
  CorporateBankAccount,
  AuditLog,
  WorkflowConfig,
  BillStatus,
  Role,
} from '../types';
import { db } from './db';
import { calculateBillFinancials, round2 } from '../utils/calc';
import { isValidGSTIN, isValidIFSC, isValidDdoId, canTransitionStatus, assertVendorMaster, assertUserIdentity } from '../utils/validators';
import { assertPermission } from '../config/permissions';
import { STANDARD_DEDUCTIONS } from '../config/config';

// Simulate slight network latency for realistic async feel
const delay = (ms = 40) => new Promise((resolve) => setTimeout(resolve, ms));

export const api = {
  // ==========================================
  // BILLS (Operational)
  // ==========================================

  async getBills(currentUser: User, filters?: { status?: string; search?: string; ddoId?: string }): Promise<Bill[]> {
    await delay();
    const state = db.getState();
    let bills = state.bills;

    // Strict DDO isolation based on role
    if (currentUser.role === 'Creator') {
      bills = bills.filter((b) => currentUser.ddoIds.includes(b.ddoId));
    } else if (currentUser.role === 'Verifier') {
      bills = bills.filter((b) => currentUser.ddoIds.includes(b.ddoId));
      // In production or when mapped to specific creators, also restrict
      if (currentUser.creatorIds && currentUser.creatorIds.length > 0) {
        bills = bills.filter((b) => !b.createdBy || currentUser.creatorIds!.includes(b.createdBy));
      }
    } else if (currentUser.role === 'Approver') {
      bills = bills.filter((b) => currentUser.ddoIds.includes(b.ddoId));
    } else if (
      (currentUser.role === 'Finance Officer' || currentUser.role === 'Director of Finance') &&
      currentUser.ddoIds.length > 0
    ) {
      bills = bills.filter((b) => currentUser.ddoIds.includes(b.ddoId));
    } else if (currentUser.role === 'RTGS Manager') {
      // RTGS Manager handles bills pending RTGS or paid
      bills = bills.filter((b) => b.status === 'Pending RTGS' || b.status === 'Paid');
    }

    if (filters?.status && filters.status !== 'ALL') {
      bills = bills.filter((b) => b.status === filters.status);
    }

    if (filters?.ddoId && filters.ddoId !== 'ALL') {
      bills = bills.filter((b) => b.ddoId === filters.ddoId);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      bills = bills.filter(
        (b) =>
          b.id.toLowerCase().includes(q) ||
          b.workOrderNo.toLowerCase().includes(q) ||
          b.description.toLowerCase().includes(q) ||
          b.vendorId.toLowerCase().includes(q)
      );
    }

    // Sort newest first
    return bills.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getBillById(currentUser: User, billId: string): Promise<Bill> {
    await delay();
    const state = db.getState();
    const bill = state.bills.find((b) => b.id === billId);
    if (!bill) {
      throw new Error(`Bill '${billId}' not found.`);
    }

    // DDO isolation check
    if (
      ['Creator', 'Verifier', 'Approver'].includes(currentUser.role) &&
      !currentUser.ddoIds.includes(bill.ddoId)
    ) {
      throw new Error(`Forbidden: Access denied to DDO ${bill.ddoId} bill (HTTP 403)`);
    }

    return bill;
  },

  async saveDraftBill(currentUser: User, billData: Partial<Bill>): Promise<Bill> {
    assertPermission(currentUser.role, 'create:bill');

    return db.runTransaction('SAVE_DRAFT_BILL', (draft) => {
      if (!billData.ddoId || !currentUser.ddoIds.includes(billData.ddoId)) {
        throw new Error(`DDO Isolation Error: You can only create bills for your assigned DDO.`);
      }

      const existingIndex = billData.id ? draft.bills.findIndex((b) => b.id === billData.id) : -1;
      const isNew = existingIndex === -1;

      const billId = isNew ? `IFMS ${draft.nextBillNumber++}` : billData.id!;

      const deductions =
        billData.deductions && billData.deductions.length === 16
          ? billData.deductions
          : STANDARD_DEDUCTIONS.map((lbl, idx) => ({ id: idx + 1, label: lbl, amount: 0 }));

      const financials = calculateBillFinancials({
        baseValue: billData.baseValue || 0,
        cgst: billData.cgst || 0,
        sgst: billData.sgst || 0,
        igst: billData.igst || 0,
        deductions,
      });

      const bill: Bill = {
        id: billId,
        ddoId: billData.ddoId,
        vendorId: billData.vendorId || '',
        workOrderNo: billData.workOrderNo || '',
        workOrderDate: billData.workOrderDate || new Date().toISOString().split('T')[0],
        agreementNo: billData.agreementNo || '',
        description: billData.description || '',
        baseValue: financials.baseValue,
        cgst: financials.cgst,
        sgst: financials.sgst,
        igst: financials.igst,
        grossValue: financials.grossValue,
        deductions,
        totalDeductions: financials.totalDeductions,
        netPayable: financials.netPayable,
        status: 'Draft',
        attachments: billData.attachments || [],
        history: isNew
          ? [
              {
                id: `H-${Date.now()}`,
                status: 'Draft',
                timestamp: new Date().toISOString(),
                userId: currentUser.id,
                userName: currentUser.name,
                userRole: currentUser.role,
                remarks: 'Draft created by Creator.',
              },
            ]
          : draft.bills[existingIndex].history,
        createdBy: isNew ? currentUser.id : draft.bills[existingIndex].createdBy,
        createdByName: isNew ? currentUser.name : draft.bills[existingIndex].createdByName,
        createdAt: isNew ? new Date().toISOString() : draft.bills[existingIndex].createdAt,
        updatedAt: new Date().toISOString(),
      };

      if (isNew) {
        draft.bills.push(bill);
      } else {
        draft.bills[existingIndex] = bill;
      }

      db.appendAuditLog(draft, {
        actionType: isNew ? 'BILL_DRAFT_CREATED' : 'BILL_DRAFT_UPDATED',
        userId: currentUser.id,
        userName: currentUser.name,
        role: currentUser.role,
        entityType: 'Bill',
        entityId: bill.id,
        oldValue: isNew ? null : { id: bill.id },
        newValue: { id: bill.id, grossValue: bill.grossValue, status: bill.status },
      });

      return bill;
    });
  },

  /**
   * Submit Bill for verification:
   * 1. Validates financials and non-negative net payable
   * 2. Reserves DDO budget using grossValue
   * 3. Blocks with exact error: "Insufficient DDO Budget Balance." if grossValue > remaining
   * 4. Updates status to Pending Verification
   * 5. Appends history & audit log
   */
  async submitBill(currentUser: User, billInput: { id?: string } & Partial<Bill>): Promise<Bill> {
    assertPermission(currentUser.role, 'submit:bill');

    return db.runTransaction('SUBMIT_BILL', (draft) => {
      // 1. Identify bill or create from draft input
      let billIndex = billInput.id ? draft.bills.findIndex((b) => b.id === billInput.id) : -1;
      let existingBill = billIndex !== -1 ? draft.bills[billIndex] : null;

      const ddoId = existingBill ? existingBill.ddoId : billInput.ddoId;
      if (!ddoId || !currentUser.ddoIds.includes(ddoId)) {
        throw new Error('DDO Isolation Error: Cannot submit bill for unassigned DDO.');
      }

      // Check current status transition
      if (existingBill) {
        if (!canTransitionStatus(existingBill.status, 'Pending Verification')) {
          throw new Error(`Invalid status transition from '${existingBill.status}' to 'Pending Verification'.`);
        }
      }

      const deductions =
        billInput.deductions && billInput.deductions.length === 16
          ? billInput.deductions
          : existingBill
          ? existingBill.deductions
          : STANDARD_DEDUCTIONS.map((lbl, idx) => ({ id: idx + 1, label: lbl, amount: 0 }));

      const baseValue = billInput.baseValue !== undefined ? billInput.baseValue : existingBill?.baseValue || 0;
      const cgst = billInput.cgst !== undefined ? billInput.cgst : existingBill?.cgst || 0;
      const sgst = billInput.sgst !== undefined ? billInput.sgst : existingBill?.sgst || 0;
      const igst = billInput.igst !== undefined ? billInput.igst : existingBill?.igst || 0;

      const financials = calculateBillFinancials({ baseValue, cgst, sgst, igst, deductions });
      if (!financials.isValid) {
        throw new Error(financials.error || 'Invalid bill financial calculation.');
      }

      if (!billInput.vendorId && !existingBill?.vendorId) {
        throw new Error('Please select a valid registered vendor.');
      }

      // 2. Budget Check & Reservation (Key Decision #1: grossValue is reserved on submission)
      const alloc = draft.ddoAllocations.find((a) => a.ddoId === ddoId);
      if (!alloc) {
        throw new Error(`No budget allocation found for DDO ${ddoId}.`);
      }

      // If resubmitting a previously rejected bill, its budget was already released on rejection,
      // so we check full grossValue against current alloc.remaining
      const availableRemaining = round2(alloc.allocated - alloc.utilized);
      if (financials.grossValue > availableRemaining) {
        // EXACT required error string
        throw new Error('Insufficient DDO Budget Balance.');
      }

      // Reserve budget: increment utilized
      alloc.utilized = round2(alloc.utilized + financials.grossValue);
      alloc.remaining = round2(alloc.allocated - alloc.utilized);

      // Determine next status based on workflow configuration
      const nextStatus: BillStatus = draft.workflowConfig.verifierEnabled
        ? 'Pending Verification'
        : 'Pending Approval';

      const billId = existingBill ? existingBill.id : `IFMS ${draft.nextBillNumber++}`;

      const updatedBill: Bill = {
        id: billId,
        ddoId,
        vendorId: billInput.vendorId || existingBill?.vendorId || '',
        workOrderNo: billInput.workOrderNo || existingBill?.workOrderNo || '',
        workOrderDate: billInput.workOrderDate || existingBill?.workOrderDate || new Date().toISOString().split('T')[0],
        agreementNo: billInput.agreementNo || existingBill?.agreementNo || '',
        description: billInput.description || existingBill?.description || 'Bill submitted for verification',
        baseValue: financials.baseValue,
        cgst: financials.cgst,
        sgst: financials.sgst,
        igst: financials.igst,
        grossValue: financials.grossValue,
        deductions,
        totalDeductions: financials.totalDeductions,
        netPayable: financials.netPayable,
        status: nextStatus,
        attachments: billInput.attachments || existingBill?.attachments || [],
        history: [
          ...(existingBill?.history || []),
          {
            id: `H-${Date.now()}`,
            status: nextStatus,
            timestamp: new Date().toISOString(),
            userId: currentUser.id,
            userName: currentUser.name,
            userRole: currentUser.role,
            remarks: existingBill?.status === 'Rejected' ? 'Resubmitted with modifications.' : 'Submitted for verification.',
          },
        ],
        createdBy: existingBill ? existingBill.createdBy : currentUser.id,
        createdByName: existingBill ? existingBill.createdByName : currentUser.name,
        createdAt: existingBill ? existingBill.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (billIndex === -1) {
        draft.bills.push(updatedBill);
      } else {
        draft.bills[billIndex] = updatedBill;
      }

      // Audit trail entry
      db.appendAuditLog(draft, {
        actionType: 'BILL_SUBMITTED',
        userId: currentUser.id,
        userName: currentUser.name,
        role: currentUser.role,
        entityType: 'Bill',
        entityId: updatedBill.id,
        oldValue: existingBill ? { status: existingBill.status, grossValue: existingBill.grossValue } : null,
        newValue: {
          status: updatedBill.status,
          grossValue: updatedBill.grossValue,
          ddoUtilized: alloc.utilized,
          ddoRemaining: alloc.remaining,
        },
      });

      return updatedBill;
    });
  },

  /**
   * Verifier approves a bill in read-only mode -> moves to Pending Approval
   */
  async verifyBill(currentUser: User, billId: string, remarks?: string): Promise<Bill> {
    assertPermission(currentUser.role, 'verify:bill');

    return db.runTransaction('VERIFY_BILL', (draft) => {
      const bill = draft.bills.find((b) => b.id === billId);
      if (!bill) throw new Error(`Bill '${billId}' not found.`);

      if (!currentUser.ddoIds.includes(bill.ddoId)) {
        throw new Error(`DDO Isolation Error: Bill DDO ${bill.ddoId} is not mapped to you.`);
      }

      if (bill.status !== 'Pending Verification') {
        throw new Error(`Cannot verify bill in status '${bill.status}'. Must be 'Pending Verification'.`);
      }

      const prevStatus = bill.status;
      bill.status = 'Pending Approval';
      bill.updatedAt = new Date().toISOString();

      bill.history.push({
        id: `H-${Date.now()}`,
        status: 'Pending Approval',
        timestamp: new Date().toISOString(),
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        remarks: remarks?.trim() || 'Verified all bill measurements, deductions and vouchers.',
      });

      db.appendAuditLog(draft, {
        actionType: 'BILL_VERIFIED',
        userId: currentUser.id,
        userName: currentUser.name,
        role: currentUser.role,
        entityType: 'Bill',
        entityId: bill.id,
        oldValue: { status: prevStatus },
        newValue: { status: bill.status, remarks },
      });

      return bill;
    });
  },

  /**
   * Verifier or Approver rejects/reverts a bill:
   * Mandatory remarks (min 10 characters).
   * Key Decision #2: Releases reserved grossValue back to DDO allocation.
   */
  async rejectBill(currentUser: User, billId: string, remarks: string): Promise<Bill> {
    if (currentUser.role === 'Verifier' || currentUser.role === 'Finance Officer') {
      assertPermission(currentUser.role, 'reject:verifier_bill');
    } else if (currentUser.role === 'Approver' || currentUser.role === 'Director of Finance') {
      assertPermission(currentUser.role, 'revert:approver_bill');
    } else {
      throw new Error(`Role '${currentUser.role}' cannot reject bills.`);
    }

    if (!remarks || remarks.trim().length < 10) {
      throw new Error('Mandatory remarks must be at least 10 characters explaining the rejection reason.');
    }

    return db.runTransaction('REJECT_BILL', (draft) => {
      const bill = draft.bills.find((b) => b.id === billId);
      if (!bill) throw new Error(`Bill '${billId}' not found.`);

      if (!currentUser.ddoIds.includes(bill.ddoId)) {
        throw new Error(`DDO Isolation Error: Bill DDO ${bill.ddoId} is not mapped to you.`);
      }

      if (bill.status !== 'Pending Verification' && bill.status !== 'Pending Approval') {
        throw new Error(`Cannot reject bill with status '${bill.status}'.`);
      }

      const prevStatus = bill.status;
      bill.status = 'Rejected';
      bill.updatedAt = new Date().toISOString();

      // Release reserved budget (Key Decision #2)
      const alloc = draft.ddoAllocations.find((a) => a.ddoId === bill.ddoId);
      if (alloc) {
        alloc.utilized = round2(Math.max(0, alloc.utilized - bill.grossValue));
        alloc.remaining = round2(alloc.allocated - alloc.utilized);
      }

      bill.history.push({
        id: `H-${Date.now()}`,
        status: 'Rejected',
        timestamp: new Date().toISOString(),
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        remarks: remarks.trim(),
      });

      db.appendAuditLog(draft, {
        actionType: currentUser.role === 'Verifier' ? 'BILL_REJECTED_BY_VERIFIER' : 'BILL_REVERTED_BY_APPROVER',
        userId: currentUser.id,
        userName: currentUser.name,
        role: currentUser.role,
        entityType: 'Bill',
        entityId: bill.id,
        oldValue: { status: prevStatus, grossValue: bill.grossValue },
        newValue: {
          status: 'Rejected',
          remarks: remarks.trim(),
          ddoUtilizedReleased: bill.grossValue,
          ddoRemainingNow: alloc?.remaining,
        },
      });

      return bill;
    });
  },

  /**
   * Approver approves verified bill -> moves to Pending RTGS
   */
  async approveBill(currentUser: User, billId: string, remarks?: string): Promise<Bill> {
    assertPermission(currentUser.role, 'approve:bill');

    return db.runTransaction('APPROVE_BILL', (draft) => {
      const bill = draft.bills.find((b) => b.id === billId);
      if (!bill) throw new Error(`Bill '${billId}' not found.`);

      if (!currentUser.ddoIds.includes(bill.ddoId)) {
        throw new Error(`DDO Isolation Error: Bill DDO ${bill.ddoId} is not mapped to you.`);
      }

      if (bill.status !== 'Pending Approval') {
        throw new Error(`Cannot approve bill with status '${bill.status}'. Must be 'Pending Approval'.`);
      }

      const prevStatus = bill.status;
      bill.status = 'Pending RTGS';
      bill.updatedAt = new Date().toISOString();

      bill.history.push({
        id: `H-${Date.now()}`,
        status: 'Pending RTGS',
        timestamp: new Date().toISOString(),
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        remarks: remarks?.trim() || 'Sanction accorded. Approved for RTGS disbursement.',
      });

      db.appendAuditLog(draft, {
        actionType: 'BILL_APPROVED',
        userId: currentUser.id,
        userName: currentUser.name,
        role: currentUser.role,
        entityType: 'Bill',
        entityId: bill.id,
        oldValue: { status: prevStatus },
        newValue: { status: bill.status, remarks },
      });

      return bill;
    });
  },

  // ==========================================
  // RTGS BATCH GENERATION (Executional)
  // ==========================================

  /**
   * Atomic RTGS Advice Generation:
   * 1. Multi-select bills in Pending RTGS
   * 2. If ANY selected bill is not in Pending RTGS or already belongs to an RTGS batch,
   *    fails the WHOLE batch atomically and changes nothing.
   * 3. Creates RtgsBatch record
   * 4. Updates all bills to 'Paid', links rtgsBatchId
   * 5. Appends audit log
   */
  async generateRtgsAdvice(
    currentUser: User,
    billIds: string[],
    bankAccountId: string
  ): Promise<RtgsBatch> {
    assertPermission(currentUser.role, 'generate:rtgs_advice');

    if (!billIds || billIds.length === 0) {
      throw new Error('Please select at least one bill to generate an RTGS batch.');
    }

    return db.runTransaction('GENERATE_RTGS_BATCH', (draft) => {
      // Validate bank account exists and is active
      const bank = draft.bankAccounts.find((b) => b.id === bankAccountId && b.isActive);
      if (!bank) {
        throw new Error('Selected corporate bank account is invalid or inactive.');
      }

      // Check all bills exist and satisfy invariants
      let totalAmount = 0;
      const targetBills: Bill[] = [];

      for (const id of billIds) {
        const bill = draft.bills.find((b) => b.id === id);
        if (!bill) {
          throw new Error(`Atomic Batch Error: Bill '${id}' does not exist.`);
        }

        if (bill.status !== 'Pending RTGS') {
          throw new Error(
            `Atomic Batch Error: Bill '${id}' is not in 'Pending RTGS' status (current status: '${bill.status}'). Entire batch cancelled.`
          );
        }

        if (bill.rtgsBatchId) {
          throw new Error(
            `Atomic Batch Error: Bill '${id}' is already included in batch '${bill.rtgsBatchId}'. Entire batch cancelled.`
          );
        }

        totalAmount += bill.netPayable;
        targetBills.push(bill);
      }

      totalAmount = round2(totalAmount);

      const batchId = `RTGS-${draft.workflowConfig.financialYear.split('-')[0]}-${String(
        draft.nextRtgsNumber++
      ).padStart(4, '0')}`;

      const batch: RtgsBatch = {
        id: batchId,
        billIds: [...billIds],
        bankAccountId,
        totalAmount,
        beneficiaryCount: billIds.length,
        generatedBy: currentUser.id,
        generatedByName: currentUser.name,
        generatedAt: new Date().toISOString(),
      };

      // Mark all bills as Paid and link batch ID
      for (const bill of targetBills) {
        const prevStatus = bill.status;
        bill.status = 'Paid';
        bill.rtgsBatchId = batchId;
        bill.updatedAt = new Date().toISOString();

        bill.history.push({
          id: `H-${Date.now()}`,
          status: 'Paid',
          timestamp: new Date().toISOString(),
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          remarks: `Included in RTGS Advice ${batchId} drawn on ${bank.bankName} (${bank.accountNumber}).`,
        });
      }

      draft.rtgsBatches.unshift(batch);

      db.appendAuditLog(draft, {
        actionType: 'RTGS_BATCH_GENERATED',
        userId: currentUser.id,
        userName: currentUser.name,
        role: currentUser.role,
        entityType: 'RtgsBatch',
        entityId: batch.id,
        oldValue: null,
        newValue: {
          batchId: batch.id,
          billCount: batch.billIds.length,
          totalAmount: batch.totalAmount,
          bankAccountId: batch.bankAccountId,
        },
      });

      return batch;
    });
  },

  async getRtgsBatches(currentUser: User): Promise<RtgsBatch[]> {
    await delay();
    return db.getState().rtgsBatches;
  },

  async getRtgsBatchById(currentUser: User, batchId: string): Promise<{ batch: RtgsBatch; bills: Bill[]; bankAccount: CorporateBankAccount }> {
    await delay();
    const state = db.getState();
    const batch = state.rtgsBatches.find((b) => b.id === batchId);
    if (!batch) throw new Error(`RTGS Batch '${batchId}' not found.`);

    const bills = state.bills.filter((b) => batch.billIds.includes(b.id));
    const bankAccount = state.bankAccounts.find((b) => b.id === batch.bankAccountId) || state.bankAccounts[0];

    return { batch, bills, bankAccount };
  },

  // ==========================================
  // BUDGET & ALLOCATIONS (Administrative)
  // ==========================================

  async getBudgetGrants(): Promise<BudgetGrant[]> {
    await delay();
    return db.getState().budgetGrants;
  },

  async createOrUpdateGrant(currentUser: User, grantInput: Partial<BudgetGrant>): Promise<BudgetGrant> {
    assertPermission(currentUser.role, 'manage:budget_grants');

    return db.runTransaction('CREATE_OR_UPDATE_GRANT', (draft) => {
      const code = (grantInput.code || '').trim().toUpperCase();
      const name = (grantInput.name || '').trim();
      if (!code || !name || !grantInput.totalGranted || grantInput.totalGranted <= 0) {
        throw new Error('Budget head code, name, and a positive grant amount are required.');
      }

      const existingIndex = grantInput.id ? draft.budgetGrants.findIndex((g) => g.id === grantInput.id) : -1;
      const isNew = existingIndex === -1;
      const grantId = isNew ? code : grantInput.id!;

      // Consistency check: new grant amount cannot be less than currently allocated to DDOs
      const currentAllocated = draft.ddoAllocations
        .filter((a) => isNew ? false : a.grantId === grantId)
        .reduce((sum, a) => sum + a.allocated, 0);

      if (grantInput.totalGranted < currentAllocated) {
        throw new Error(
          `Cannot decrease this budget head to ₹${grantInput.totalGranted} because ₹${currentAllocated} is already allocated to DDOs.`
        );
      }

      const grant: BudgetGrant = {
        id: grantId,
        code,
        name,
        financialYear: grantInput.financialYear || draft.workflowConfig.financialYear,
        departmentId: '',
        totalGranted: round2(grantInput.totalGranted),
      };

      if (isNew) {
        draft.budgetGrants.push(grant);
      } else {
        draft.budgetGrants[existingIndex] = grant;
      }

      db.appendAuditLog(draft, {
        actionType: isNew ? 'GRANT_CREATED' : 'GRANT_UPDATED',
        userId: currentUser.id,
        userName: currentUser.name,
        role: currentUser.role,
        entityType: 'BudgetGrant',
        entityId: grant.id,
        oldValue: isNew ? null : { totalGranted: currentAllocated },
        newValue: { totalGranted: grant.totalGranted },
      });

      return grant;
    });
  },

  async getDdoAllocations(currentUser: User): Promise<DdoAllocation[]> {
    await delay();
    const state = db.getState();
    if (['Creator', 'Verifier', 'Approver'].includes(currentUser.role)) {
      return state.ddoAllocations.filter((a) => currentUser.ddoIds.includes(a.ddoId));
    }
    return state.ddoAllocations;
  },

  async updateDdoAllocation(currentUser: User, allocationId: string, newAllocated: number): Promise<DdoAllocation> {
    assertPermission(currentUser.role, 'manage:ddo_allocations');

    return db.runTransaction('UPDATE_DDO_ALLOCATION', (draft) => {
      const alloc = draft.ddoAllocations.find((a) => a.id === allocationId);
      if (!alloc) throw new Error(`DDO Allocation '${allocationId}' not found.`);

      const grant = draft.budgetGrants.find((g) => g.id === alloc.grantId);
      if (!grant) throw new Error(`Associated grant '${alloc.grantId}' not found.`);

      // Consistency rule 5: cannot reduce below current utilized
      if (round2(newAllocated) < round2(alloc.utilized)) {
        throw new Error(
          `Cannot reduce allocation to ₹${newAllocated}. DDO has already utilized ₹${alloc.utilized}.`
        );
      }

      // Check sum of department allocations <= grant total
      const otherAllocationsSum = draft.ddoAllocations
        .filter((a) => a.grantId === grant.id && a.id !== allocationId)
        .reduce((sum, a) => sum + a.allocated, 0);

      if (round2(otherAllocationsSum + newAllocated) > round2(grant.totalGranted)) {
        const available = round2(grant.totalGranted - otherAllocationsSum);
        throw new Error(
          `Total department allocations would exceed grant cap. Maximum available for this DDO is ₹${available}.`
        );
      }

      const oldAllocated = alloc.allocated;
      alloc.allocated = round2(newAllocated);
      alloc.remaining = round2(alloc.allocated - alloc.utilized);

      db.appendAuditLog(draft, {
        actionType: 'DDO_ALLOCATION_UPDATED',
        userId: currentUser.id,
        userName: currentUser.name,
        role: currentUser.role,
        entityType: 'DdoAllocation',
        entityId: alloc.id,
        oldValue: { allocated: oldAllocated },
        newValue: { allocated: alloc.allocated, remaining: alloc.remaining },
      });

      return alloc;
    });
  },

  async requestBudgetChange(
    currentUser: User,
    req: { ddoId: string; type: 'increase' | 'decrease'; amount: number; reason: string }
  ): Promise<BudgetChangeRequest> {
    assertPermission(currentUser.role, 'request:budget_change');

    return db.runTransaction('REQUEST_BUDGET_CHANGE', (draft) => {
      if (!currentUser.ddoIds.includes(req.ddoId)) {
        throw new Error('Cannot request budget change for unassigned DDO.');
      }
      if (req.amount <= 0) {
        throw new Error('Requested amount must be greater than zero.');
      }

      const ddo = draft.ddos.find((d) => d.id === req.ddoId);
      if (!ddo) throw new Error(`DDO ${req.ddoId} not found.`);

      const request: BudgetChangeRequest = {
        id: `BCR-${Date.now().toString(36).toUpperCase()}`,
        ddoId: req.ddoId,
        departmentId: ddo.departmentId,
        type: req.type,
        amount: round2(req.amount),
        reason: req.reason.trim(),
        status: 'Pending',
        requestedBy: currentUser.id,
        requestedAt: new Date().toISOString(),
      };

      draft.budgetChangeRequests.unshift(request);

      db.appendAuditLog(draft, {
        actionType: 'BUDGET_CHANGE_REQUESTED',
        userId: currentUser.id,
        userName: currentUser.name,
        role: currentUser.role,
        entityType: 'BudgetChangeRequest',
        entityId: request.id,
        oldValue: null,
        newValue: { ...request },
      });

      return request;
    });
  },

  async getBudgetChangeRequests(currentUser: User): Promise<BudgetChangeRequest[]> {
    await delay();
    const state = db.getState();
    if (['Creator'].includes(currentUser.role)) {
      return state.budgetChangeRequests.filter((r) => currentUser.ddoIds.includes(r.ddoId));
    }
    return state.budgetChangeRequests;
  },

  async decideBudgetChangeRequest(
    currentUser: User,
    requestId: string,
    decision: 'Approved' | 'Rejected',
    remarks?: string
  ): Promise<BudgetChangeRequest> {
    assertPermission(currentUser.role, 'decide:budget_requests');

    return db.runTransaction('DECIDE_BUDGET_CHANGE', (draft) => {
      const req = draft.budgetChangeRequests.find((r) => r.id === requestId);
      if (!req) throw new Error(`Budget change request '${requestId}' not found.`);
      if (req.status !== 'Pending') throw new Error(`Request has already been ${req.status}.`);

      req.status = decision;
      req.decidedBy = currentUser.id;
      req.decidedAt = new Date().toISOString();
      req.remarks = remarks;

      if (decision === 'Approved') {
        const alloc = draft.ddoAllocations.find((a) => a.ddoId === req.ddoId);
        if (!alloc) throw new Error(`No allocation found for DDO ${req.ddoId}.`);

        const newAllocated = req.type === 'increase' ? alloc.allocated + req.amount : alloc.allocated - req.amount;

        if (newAllocated < alloc.utilized) {
          throw new Error(`Cannot approve decrease: DDO has already utilized ₹${alloc.utilized}.`);
        }

        alloc.allocated = round2(newAllocated);
        alloc.remaining = round2(alloc.allocated - alloc.utilized);
      }

      db.appendAuditLog(draft, {
        actionType: `BUDGET_CHANGE_${decision.toUpperCase()}`,
        userId: currentUser.id,
        userName: currentUser.name,
        role: currentUser.role,
        entityType: 'BudgetChangeRequest',
        entityId: req.id,
        oldValue: { status: 'Pending' },
        newValue: { status: decision, remarks },
      });

      return req;
    });
  },

  // ==========================================
  // MASTER DATA & ADMIN (Super Admin)
  // ==========================================

  async getDepartments(): Promise<Department[]> {
    await delay();
    return db.getState().departments;
  },

  async createDepartment(currentUser: User, dept: { name: string }): Promise<Department> {
    assertPermission(currentUser.role, 'manage:departments');
    return db.runTransaction('CREATE_DEPT', (draft) => {
      const newDept: Department = {
        id: `DEP-${Date.now().toString(36).toUpperCase().substring(0, 4)}`,
        name: dept.name.trim(),
        createdAt: new Date().toISOString(),
      };
      draft.departments.push(newDept);
      db.appendAuditLog(draft, {
        actionType: 'DEPARTMENT_CREATED',
        userId: currentUser.id,
        userName: currentUser.name,
        role: currentUser.role,
        entityType: 'Department',
        entityId: newDept.id,
        oldValue: null,
        newValue: newDept,
      });
      return newDept;
    });
  },

  async getDDOs(): Promise<DDO[]> {
    await delay();
    return db.getState().ddos;
  },

  async createDDO(currentUser: User, ddoData: { id: string; name: string; departmentId: string }): Promise<DDO> {
    assertPermission(currentUser.role, 'manage:ddos');
    if (!isValidDdoId(ddoData.id)) {
      throw new Error('DDO ID must be a valid 6 or 7-digit numeric code.');
    }

    return db.runTransaction('CREATE_DDO', (draft) => {
      if (draft.ddos.some((d) => d.id === ddoData.id)) {
        throw new Error(`DDO ID '${ddoData.id}' already exists.`);
      }
      if (!ddoData.departmentId) {
        throw new Error('A DDO must belong to one department.');
      }

      const ddo: DDO = {
        id: ddoData.id.trim(),
        name: ddoData.name.trim(),
        departmentId: ddoData.departmentId,
      };
      draft.ddos.push(ddo);

      db.appendAuditLog(draft, {
        actionType: 'DDO_CREATED',
        userId: currentUser.id,
        userName: currentUser.name,
        role: currentUser.role,
        entityType: 'DDO',
        entityId: ddo.id,
        oldValue: null,
        newValue: ddo,
      });

      return ddo;
    });
  },

  async getVendors(): Promise<Vendor[]> {
    await delay();
    return db.getState().vendors;
  },

  async createVendor(currentUser: User, vendorData: Omit<Vendor, 'id' | 'documents' | 'active'>): Promise<Vendor> {
    assertPermission(currentUser.role, 'manage:vendors');

    if (!isValidGSTIN(vendorData.gstin)) {
      throw new Error('Invalid GSTIN format. Expected format e.g. 29ABCDE1234F1Z5.');
    }
    if (!isValidIFSC(vendorData.ifsc)) {
      throw new Error('Invalid IFSC format. Expected 11 alphanumeric characters e.g. CNRB0000412.');
    }
    assertVendorMaster(vendorData);

    return db.runTransaction('CREATE_VENDOR', (draft) => {
      const nextNum = draft.vendors.length + 1;
      const vendor: Vendor = {
        ...vendorData,
        pan: vendorData.pan?.trim().toUpperCase(),
        gstin: vendorData.gstin.trim().toUpperCase(),
        ifsc: vendorData.ifsc.trim().toUpperCase(),
        id: `V-${String(nextNum).padStart(4, '0')}`,
        active: true,
        documents: [
          { name: 'PAN Card Copy', status: 'Pending' },
          { name: 'GSTIN Registration Certificate', status: 'Pending' },
          { name: 'Cancelled Bank Cheque', status: 'Pending' },
          { name: 'GBA Empanelment Order', status: 'Pending' },
        ],
      };
      draft.vendors.push(vendor);

      db.appendAuditLog(draft, {
        actionType: 'VENDOR_CREATED',
        userId: currentUser.id,
        userName: currentUser.name,
        role: currentUser.role,
        entityType: 'Vendor',
        entityId: vendor.id,
        oldValue: null,
        newValue: vendor,
      });

      return vendor;
    });
  },

  async toggleVendorDocStatus(currentUser: User, vendorId: string, docName: string): Promise<Vendor> {
    assertPermission(currentUser.role, 'manage:vendors');

    return db.runTransaction('TOGGLE_VENDOR_DOC', (draft) => {
      const vendor = draft.vendors.find((v) => v.id === vendorId);
      if (!vendor) throw new Error(`Vendor '${vendorId}' not found.`);

      const doc = vendor.documents.find((d) => d.name === docName);
      if (!doc) throw new Error(`Document '${docName}' not found on vendor.`);

      const oldStatus = doc.status;
      doc.status = doc.status === 'Uploaded' ? 'Pending' : 'Uploaded';
      if (doc.status === 'Uploaded') {
        doc.uploadedAt = new Date().toISOString();
      }

      db.appendAuditLog(draft, {
        actionType: 'VENDOR_DOCUMENT_STATUS_CHANGED',
        userId: currentUser.id,
        userName: currentUser.name,
        role: currentUser.role,
        entityType: 'Vendor',
        entityId: vendor.id,
        oldValue: { document: docName, status: oldStatus },
        newValue: { document: docName, status: doc.status },
      });

      return vendor;
    });
  },

  async getUsers(): Promise<User[]> {
    await delay();
    return db.getState().users;
  },

  async createUser(currentUser: User, userData: Omit<User, 'id'> & { password?: string }): Promise<User> {
    assertPermission(currentUser.role, 'manage:users');
    assertUserIdentity(userData);

    return db.runTransaction('CREATE_USER', (draft) => {
      const username = userData.username?.trim();
      if (draft.users.some((user) => user.username?.toLowerCase() === username?.toLowerCase())) {
        throw new Error(`User name ${username} is already in use.`);
      }
      if (userData.role === 'Creator' && userData.ddoIds.length > 1) {
        throw new Error('A Creator can belong to only one DDO.');
      }
      if (userData.role === 'Creator' && userData.ddoIds.length === 1) {
        const taken = draft.users.find(
          (user) => user.role === 'Creator' && user.active && user.ddoIds.includes(userData.ddoIds[0])
        );
        if (taken) throw new Error(`DDO ${userData.ddoIds[0]} already has creator ${taken.name}.`);
      }
      const { password: _password, ...stored } = userData;
      const user: User = {
        ...stored,
        name: `${userData.firstName?.trim()} ${userData.lastName?.trim()}`.trim(),
        username,
        id: `USR-${Date.now().toString(36).toUpperCase()}`,
      };
      draft.users.push(user);

      db.appendAuditLog(draft, {
        actionType: 'USER_CREATED',
        userId: currentUser.id,
        userName: currentUser.name,
        role: currentUser.role,
        entityType: 'User',
        entityId: user.id,
        oldValue: null,
        newValue: { id: user.id, name: user.name, role: user.role, ddoIds: user.ddoIds },
      });

      return user;
    });
  },

  async updateUserMappings(
    currentUser: User,
    userId: string,
    updates: { ddoIds?: string[]; creatorIds?: string[]; active?: boolean; role?: Role }
  ): Promise<User> {
    assertPermission(currentUser.role, 'manage:users');

    return db.runTransaction('UPDATE_USER_MAPPINGS', (draft) => {
      const user = draft.users.find((u) => u.id === userId);
      if (!user) throw new Error(`User '${userId}' not found.`);

      const oldState = { ddoIds: [...user.ddoIds], creatorIds: [...(user.creatorIds || [])], role: user.role };

      const nextRole = updates.role || user.role;
      const nextDdoIds = updates.ddoIds || user.ddoIds;
      if (nextRole === 'Creator' && nextDdoIds.length > 1) {
        throw new Error('A Creator can belong to only one DDO.');
      }
      if (nextRole === 'Creator' && nextDdoIds.length === 1) {
        const taken = draft.users.find(
          (other) => other.id !== user.id && other.role === 'Creator' && other.active && other.ddoIds.includes(nextDdoIds[0])
        );
        if (taken) throw new Error(`DDO ${nextDdoIds[0]} already has creator ${taken.name}.`);
      }
      if (updates.ddoIds) user.ddoIds = updates.ddoIds;
      if (updates.creatorIds) user.creatorIds = updates.creatorIds;
      if (updates.active !== undefined) user.active = updates.active;
      if (updates.role) user.role = updates.role;

      db.appendAuditLog(draft, {
        actionType: 'USER_ROLE_MAPPING_UPDATED',
        userId: currentUser.id,
        userName: currentUser.name,
        role: currentUser.role,
        entityType: 'User',
        entityId: user.id,
        oldValue: oldState,
        newValue: { ddoIds: user.ddoIds, creatorIds: user.creatorIds, role: user.role },
      });

      return user;
    });
  },

  async overridePassword(currentUser: User, userId: string): Promise<{ success: boolean; message: string }> {
    assertPermission(currentUser.role, 'override:passwords');

    return db.runTransaction('OVERRIDE_PASSWORD', (draft) => {
      const targetUser = draft.users.find((u) => u.id === userId);
      if (!targetUser) throw new Error(`User '${userId}' not found.`);

      db.appendAuditLog(draft, {
        actionType: 'PASSWORD_OVERRIDE',
        userId: currentUser.id,
        userName: currentUser.name,
        role: currentUser.role,
        entityType: 'User',
        entityId: targetUser.id,
        oldValue: { overridden: false },
        newValue: { overridden: true, timestamp: new Date().toISOString() },
      });

      return {
        success: true,
        message: `Temporary password reset link dispatched to ${targetUser.email}.`,
      };
    });
  },

  async getBankAccounts(): Promise<CorporateBankAccount[]> {
    await delay();
    return db.getState().bankAccounts;
  },

  async getWorkflowConfig(): Promise<WorkflowConfig> {
    await delay();
    return db.getState().workflowConfig;
  },

  async updateWorkflowConfig(currentUser: User, updates: Partial<WorkflowConfig>): Promise<WorkflowConfig> {
    assertPermission(currentUser.role, 'manage:workflow');

    return db.runTransaction('UPDATE_WORKFLOW_CONFIG', (draft) => {
      const oldCfg = { ...draft.workflowConfig };
      draft.workflowConfig = { ...draft.workflowConfig, ...updates };

      db.appendAuditLog(draft, {
        actionType: 'WORKFLOW_CONFIG_UPDATED',
        userId: currentUser.id,
        userName: currentUser.name,
        role: currentUser.role,
        entityType: 'WorkflowConfig',
        entityId: 'SYSTEM_CONFIG',
        oldValue: oldCfg,
        newValue: draft.workflowConfig,
      });

      return draft.workflowConfig;
    });
  },

  async getAuditLogs(
    currentUser: User,
    filters?: { actionType?: string; userId?: string; search?: string }
  ): Promise<AuditLog[]> {
    assertPermission(currentUser.role, 'view:audit_log');
    await delay();
    let logs = db.getState().auditLogs;

    if (filters?.actionType && filters.actionType !== 'ALL') {
      logs = logs.filter((l) => l.actionType === filters.actionType);
    }
    if (filters?.userId && filters.userId !== 'ALL') {
      logs = logs.filter((l) => l.userId === filters.userId);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      logs = logs.filter(
        (l) =>
          l.entityId.toLowerCase().includes(q) ||
          l.actionType.toLowerCase().includes(q) ||
          l.userName.toLowerCase().includes(q)
      );
    }

    return logs;
  },

  resetDemo(): void {
    db.resetDemoData();
  },
};
