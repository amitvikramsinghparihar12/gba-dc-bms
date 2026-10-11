export type Role =
  | 'Super Admin'
  | 'Director of Finance'
  | 'Finance Officer'
  | 'Creator'
  | 'Verifier'
  | 'Approver'
  | 'RTGS Manager';

export type BillStatus =
  | 'Draft'
  | 'Pending Verification'
  | 'Pending Approval'
  | 'Pending RTGS'
  | 'Paid'
  | 'Rejected';

export interface Department {
  id: string;
  name: string;
  createdAt: string;
}

export interface DDO {
  id: string; // 6 or 7 digits
  name: string;
  departmentId: string;
}

export interface User {
  id: string;
  name: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  mobile?: string;
  email: string;
  role: Role;
  passwordHash?: string;
  ddoIds: string[]; // mapped DDOs for Creator, Verifier, Approver
  creatorIds?: string[]; // mapped Creators for Verifier
  active: boolean;
}

export interface VendorDocument {
  name: string;
  status: 'Uploaded' | 'Pending';
  uploadedAt?: string;
  fileName?: string;
}

export interface Vendor {
  id: string; // e.g. V-0001
  name: string;
  type: 'Contractor' | 'Supplier' | 'Consultant' | 'Service Provider';
  gstin: string;
  pan?: string;
  city?: string;
  pinCode?: string;
  phone?: string;
  email?: string;
  oldId?: string;
  bankAccountNumber: string;
  ifsc: string;
  bankName: string;
  branchName: string;
  micr?: string;
  accountHolderName?: string;
  address: string;
  documents: VendorDocument[];
  active: boolean;
}

export interface BudgetGrant {
  id: string;
  code: string; // e.g. BH01
  name: string;
  financialYear: string; // e.g. '2025-26'
  departmentId: string;
  totalGranted: number;
}

export interface DdoAllocation {
  id: string;
  grantId: string;
  ddoId: string;
  allocated: number;
  utilized: number;
  remaining: number; // allocated - utilized
}

export interface BudgetChangeRequest {
  id: string;
  ddoId: string;
  departmentId: string;
  type: 'increase' | 'decrease';
  amount: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  requestedBy: string;
  requestedAt: string;
  decidedBy?: string;
  decidedAt?: string;
  remarks?: string;
}

export interface BillDeduction {
  id: number;
  label: string;
  amount: number;
}

export interface BillAttachment {
  id: string;
  name: string;
  size: string;
  uploadedAt: string;
}

export interface BillHistoryItem {
  id: string;
  status: BillStatus;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: Role;
  remarks?: string;
}

export interface Bill {
  id: string; // sequential e.g. 'IFMS 56'
  ddoId: string;
  vendorId: string;
  workOrderNo: string;
  workOrderDate: string;
  agreementNo: string;
  description: string;
  baseValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  grossValue: number;
  deductions: BillDeduction[]; // 16 entries
  totalDeductions: number;
  netPayable: number;
  status: BillStatus;
  attachments: BillAttachment[];
  history: BillHistoryItem[];
  rtgsBatchId?: string;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RtgsBatch {
  id: string; // e.g. 'RTGS-2025-0001'
  billIds: string[];
  bankAccountId: string;
  totalAmount: number; // sum of netPayable
  beneficiaryCount: number;
  generatedBy: string;
  generatedByName: string;
  generatedAt: string;
}

export interface CorporateBankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  branch: string;
  accountType: string;
  isActive: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actionType: string;
  userId: string;
  userName: string;
  role: Role;
  entityType: 'Bill' | 'DdoAllocation' | 'BudgetGrant' | 'BudgetChangeRequest' | 'User' | 'Vendor' | 'DDO' | 'Department' | 'RtgsBatch' | 'WorkflowConfig';
  entityId: string;
  oldValue: Record<string, any> | null;
  newValue: Record<string, any> | null;
}

export interface WorkflowConfig {
  verifierEnabled: boolean; // if false, bills go directly to Approver
  mandatoryRemarksMinLength: number;
  financialYear: string;
}
