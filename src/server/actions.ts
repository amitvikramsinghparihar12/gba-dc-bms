'use server';

import * as dc from '../lib/dc-service';
import type {
  Bill,
  BudgetGrant,
  DDO,
  Role,
  User,
  Vendor,
  WorkflowConfig,
} from '../types';

type Result<T> = { data: T | null; error: string | null };

async function run<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { data: await fn(), error: null };
  } catch (error: any) {
    return { data: null, error: error?.message || 'Request failed' };
  }
}

export async function getBootstrapAction() {
  return run(() => dc.getBootstrap());
}

export async function getBillsAction(filters?: { status?: string; search?: string; ddoId?: string }) {
  return run(() => dc.getBills(filters));
}

export async function saveDraftBillAction(bill: Partial<Bill>) {
  return run(() => dc.saveDraftBill(bill));
}

export async function submitBillAction(bill: Partial<Bill>) {
  return run(() => dc.submitBill(bill));
}

export async function verifyBillAction(billId: string, remarks?: string) {
  return run(() => dc.verifyBill(billId, remarks));
}

export async function rejectBillAction(billId: string, remarks: string) {
  return run(() => dc.rejectBill(billId, remarks));
}

export async function approveBillAction(billId: string, remarks?: string) {
  return run(() => dc.approveBill(billId, remarks));
}

export async function generateRtgsAdviceAction(billIds: string[], bankAccountId: string) {
  return run(() => dc.generateRtgsAdvice(billIds, bankAccountId));
}

export async function getRtgsBatchesAction() {
  return run(() => dc.getRtgsBatches());
}

export async function getRtgsBatchByIdAction(batchId: string) {
  return run(() => dc.getRtgsBatchById(batchId));
}

export async function getBudgetGrantsAction() {
  return run(() => dc.getBudgetGrants());
}

export async function createOrUpdateGrantAction(grant: Partial<BudgetGrant>) {
  return run(() => dc.createOrUpdateGrant(grant));
}

export async function getDdoAllocationsAction() {
  return run(() => dc.getDdoAllocations());
}

export async function updateDdoAllocationAction(allocationId: string, newAllocated: number) {
  return run(() => dc.updateDdoAllocation(allocationId, newAllocated));
}

export async function assignDdoToBudgetHeadAction(ddoId: string, grantId: string) {
  return run(() => dc.assignDdoToBudgetHead(ddoId, grantId));
}

export async function requestBudgetChangeAction(req: {
  ddoId: string;
  type: 'increase' | 'decrease';
  amount: number;
  reason: string;
}) {
  return run(() => dc.requestBudgetChange(req));
}

export async function getBudgetChangeRequestsAction() {
  return run(() => dc.getBudgetChangeRequests());
}

export async function decideBudgetChangeRequestAction(
  requestId: string,
  decision: 'Approved' | 'Rejected',
  remarks?: string
) {
  return run(() => dc.decideBudgetChangeRequest(requestId, decision, remarks));
}

export async function getDepartmentsAction() {
  return run(() => dc.getDepartments());
}

export async function createDepartmentAction(dept: { name: string }) {
  return run(() => dc.createDepartment(dept));
}

export async function getDDOsAction() {
  return run(() => dc.getDDOs());
}

export async function createDDOAction(ddo: { id: string; name: string; departmentId: string }) {
  return run(() => dc.createDDO(ddo));
}

export async function getVendorsAction() {
  return run(() => dc.getVendors());
}

export async function createVendorAction(vendor: Omit<Vendor, 'id' | 'documents' | 'active'>) {
  return run(() => dc.createVendor(vendor));
}

export async function toggleVendorDocStatusAction(vendorId: string, docName: string) {
  return run(() => dc.toggleVendorDocStatus(vendorId, docName));
}

export async function getUsersAction() {
  return run(() => dc.getUsers());
}

export async function createUserAction(user: Omit<User, 'id'> & { password?: string }) {
  return run(() => dc.createUser(user));
}

export async function updateUserMappingsAction(
  userId: string,
  updates: { ddoIds?: string[]; creatorIds?: string[]; active?: boolean; role?: Role }
) {
  return run(() => dc.updateUserMappings(userId, updates));
}

export async function overridePasswordAction(userId: string) {
  return run(() => dc.overridePassword(userId));
}

export async function getBankAccountsAction() {
  return run(() => dc.getBankAccounts());
}

export async function getWorkflowConfigAction() {
  return run(() => dc.getWorkflowConfig());
}

export async function updateWorkflowConfigAction(updates: Partial<WorkflowConfig>) {
  return run(() => dc.updateWorkflowConfig(updates));
}

export async function getAuditLogsAction(filters?: { actionType?: string; userId?: string; search?: string }) {
  return run(() => dc.getAuditLogs(filters));
}

export async function resetDemoAction() {
  return run(() => dc.resetDemo());
}
