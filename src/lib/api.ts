import type { Bill, BudgetGrant, DDO, Role, User, Vendor, WorkflowConfig } from '../types';
import {
  approveBillAction,
  createDDOAction,
  createDepartmentAction,
  createOrUpdateGrantAction,
  createUserAction,
  createVendorAction,
  decideBudgetChangeRequestAction,
  generateRtgsAdviceAction,
  getAuditLogsAction,
  getBankAccountsAction,
  getBillsAction,
  getBudgetChangeRequestsAction,
  getBudgetGrantsAction,
  getDDOsAction,
  getDepartmentsAction,
  getDdoAllocationsAction,
  getRtgsBatchByIdAction,
  getRtgsBatchesAction,
  getUsersAction,
  getVendorsAction,
  getWorkflowConfigAction,
  overridePasswordAction,
  rejectBillAction,
  requestBudgetChangeAction,
  resetDemoAction,
  saveDraftBillAction,
  submitBillAction,
  toggleVendorDocStatusAction,
  updateDdoAllocationAction,
  updateUserMappingsAction,
  updateWorkflowConfigAction,
  verifyBillAction,
} from '../server/actions';

async function unwrap<T>(pending: Promise<{ data: T | null; error: string | null }>): Promise<T> {
  const result = await pending;
  if (result.error) throw new Error(result.error);
  return result.data as T;
}

/**
 * Same call shape as the prototype API. The signed-in Supabase user is the actor;
 * the currentUser argument is ignored so a browser cannot impersonate another role.
 */
export const api = {
  getBills: (_user: User, filters?: { status?: string; search?: string; ddoId?: string }) =>
    unwrap(getBillsAction(filters)),
  saveDraftBill: (_user: User, bill: Partial<Bill>) => unwrap(saveDraftBillAction(bill)),
  submitBill: (_user: User, bill: Partial<Bill>) => unwrap(submitBillAction(bill)),
  verifyBill: (_user: User, billId: string, remarks?: string) => unwrap(verifyBillAction(billId, remarks)),
  rejectBill: (_user: User, billId: string, remarks: string) => unwrap(rejectBillAction(billId, remarks)),
  approveBill: (_user: User, billId: string, remarks?: string) => unwrap(approveBillAction(billId, remarks)),
  generateRtgsAdvice: (_user: User, billIds: string[], bankAccountId: string) =>
    unwrap(generateRtgsAdviceAction(billIds, bankAccountId)),
  getRtgsBatches: (_user: User) => unwrap(getRtgsBatchesAction()),
  getRtgsBatchById: (_user: User, batchId: string) => unwrap(getRtgsBatchByIdAction(batchId)),
  getBudgetGrants: () => unwrap(getBudgetGrantsAction()),
  createOrUpdateGrant: (_user: User, grant: Partial<BudgetGrant>) => unwrap(createOrUpdateGrantAction(grant)),
  getDdoAllocations: (_user: User) => unwrap(getDdoAllocationsAction()),
  updateDdoAllocation: (_user: User, allocationId: string, newAllocated: number) =>
    unwrap(updateDdoAllocationAction(allocationId, newAllocated)),
  requestBudgetChange: (
    _user: User,
    req: { ddoId: string; type: 'increase' | 'decrease'; amount: number; reason: string }
  ) => unwrap(requestBudgetChangeAction(req)),
  getBudgetChangeRequests: (_user: User) => unwrap(getBudgetChangeRequestsAction()),
  decideBudgetChangeRequest: (
    _user: User,
    requestId: string,
    decision: 'Approved' | 'Rejected',
    remarks?: string
  ) => unwrap(decideBudgetChangeRequestAction(requestId, decision, remarks)),
  getDepartments: () => unwrap(getDepartmentsAction()),
  createDepartment: (_user: User, dept: { name: string }) => unwrap(createDepartmentAction(dept)),
  getDDOs: () => unwrap(getDDOsAction()),
  createDDO: (_user: User, ddo: { id: string; name: string; departmentId: string }) => unwrap(createDDOAction(ddo)),
  getVendors: () => unwrap(getVendorsAction()),
  createVendor: (_user: User, vendor: Omit<Vendor, 'id' | 'documents' | 'active'>) =>
    unwrap(createVendorAction(vendor)),
  toggleVendorDocStatus: (_user: User, vendorId: string, docName: string) =>
    unwrap(toggleVendorDocStatusAction(vendorId, docName)),
  getUsers: () => unwrap(getUsersAction()),
  createUser: (_user: User, user: Omit<User, 'id'>) => unwrap(createUserAction(user)),
  updateUserMappings: (
    _user: User,
    userId: string,
    updates: { ddoIds?: string[]; creatorIds?: string[]; active?: boolean; role?: Role }
  ) => unwrap(updateUserMappingsAction(userId, updates)),
  overridePassword: (_user: User, userId: string) => unwrap(overridePasswordAction(userId)),
  getBankAccounts: () => unwrap(getBankAccountsAction()),
  getWorkflowConfig: () => unwrap(getWorkflowConfigAction()),
  updateWorkflowConfig: (_user: User, updates: Partial<WorkflowConfig>) =>
    unwrap(updateWorkflowConfigAction(updates)),
  getAuditLogs: (_user: User, filters?: { actionType?: string; userId?: string; search?: string }) =>
    unwrap(getAuditLogsAction(filters)),
  resetDemo: () => unwrap(resetDemoAction()),
};
