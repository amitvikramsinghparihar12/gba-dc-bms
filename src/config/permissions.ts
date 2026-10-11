import { Role } from '../types';

export type Action =
  // Super Admin
  | 'manage:departments'
  | 'manage:ddos'
  | 'manage:vendors'
  | 'manage:users'
  | 'manage:workflow'
  | 'view:audit_log'
  | 'override:passwords'
  // Director of Finance
  | 'manage:budget_grants'
  // Finance Officer
  | 'manage:ddo_allocations'
  | 'decide:budget_requests'
  // Creator
  | 'create:bill'
  | 'edit:draft_bill'
  | 'submit:bill'
  | 'delete:draft_bill'
  | 'request:budget_change'
  // Verifier
  | 'verify:bill'
  | 'reject:verifier_bill'
  // Approver
  | 'approve:bill'
  | 'revert:approver_bill'
  // RTGS Manager
  | 'view:pending_rtgs'
  | 'generate:rtgs_advice'
  | 'view:rtgs_history';

export const ROLE_PERMISSIONS: Record<Role, Action[]> = {
  'Super Admin': [
    'manage:departments',
    'manage:ddos',
    'manage:vendors',
    'manage:users',
    'manage:workflow',
    'view:audit_log',
    'override:passwords',
  ],
  'Director of Finance': [
    'manage:budget_grants',
    'approve:bill',
    'revert:approver_bill',
  ],
  'Finance Officer': [
    'manage:ddo_allocations',
    'decide:budget_requests',
    'verify:bill',
    'reject:verifier_bill',
  ],
  'Creator': [
    'create:bill',
    'edit:draft_bill',
    'submit:bill',
    'delete:draft_bill',
    'request:budget_change',
  ],
  'Verifier': [
    'verify:bill',
    'reject:verifier_bill',
  ],
  'Approver': [
    'approve:bill',
    'revert:approver_bill',
  ],
  'RTGS Manager': [
    'view:pending_rtgs',
    'generate:rtgs_advice',
    'view:rtgs_history',
  ],
};

export function hasPermission(role: Role, action: Action): boolean {
  const allowed = ROLE_PERMISSIONS[role];
  return allowed ? allowed.includes(action) : false;
}

export function assertPermission(role: Role, action: Action): void {
  if (!hasPermission(role, action)) {
    throw new Error(`Forbidden: Role '${role}' lacks permission '${action}' (HTTP 403)`);
  }
}
