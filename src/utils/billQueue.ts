import { Bill, BillStatus } from '../types';

export interface BillQueuePlace {
  pendingFrom: string;
  pendingRole: string;
}

export function billQueuePlace(bill: Pick<Bill, 'status' | 'createdByName'>): BillQueuePlace {
  switch (bill.status) {
    case 'Draft':
      return { pendingFrom: bill.createdByName || 'Creator', pendingRole: 'Creator' };
    case 'Pending Verification':
      return { pendingFrom: 'Finance Officer', pendingRole: 'Finance Officer' };
    case 'Pending Approval':
      return { pendingFrom: 'Director of Finance', pendingRole: 'Director of Finance' };
    case 'Pending RTGS':
      return { pendingFrom: 'RTGS Manager', pendingRole: 'RTGS Manager' };
    case 'Rejected':
      return { pendingFrom: bill.createdByName || 'Creator', pendingRole: 'Creator' };
    case 'Paid':
      return { pendingFrom: '—', pendingRole: '—' };
  }
}

export type BillListTab = 'All Bills' | 'Pending' | 'Sent for Review' | 'Approved' | 'Rejected';

export function matchesBillTab(status: BillStatus, tab: BillListTab | string): boolean {
  if (tab === 'All Bills' || tab === 'ALL') return true;
  if (tab === 'Pending') return status === 'Draft';
  if (tab === 'Sent for Review') return status === 'Pending Verification' || status === 'Pending Approval';
  if (tab === 'Approved') return status === 'Pending RTGS' || status === 'Paid';
  if (tab === 'Rejected') return status === 'Rejected';
  return status === tab;
}
