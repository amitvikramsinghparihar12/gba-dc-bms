import React from 'react';
import { Bill } from '../../types';
import { Modal } from '../common/Modal';
import { billQueuePlace } from '../../utils/billQueue';

const STEPS = [
  { key: 'Draft', title: 'Creator prepares the bill', detail: 'DDO creator drafts the contingent bill and sends it for review.' },
  { key: 'Pending Verification', title: 'Finance Officer verifies', detail: 'Scrutiny of the voucher, measurements, and deductions.' },
  { key: 'Pending Approval', title: 'Director of Finance sanctions', detail: 'Administrative and financial approval.' },
  { key: 'Pending RTGS', title: 'RTGS Manager prepares advice', detail: 'Approved bills wait for the payment batch.' },
  { key: 'Paid', title: 'Paid', detail: 'The bill is included in an RTGS batch and marked paid.' },
];

function stepIndex(status: Bill['status'] | undefined): number {
  if (!status || status === 'Rejected') return 0;
  const index = STEPS.findIndex((step) => step.key === status);
  return index === -1 ? 0 : index;
}

export const BillWorkflowModal: React.FC<{
  bill?: Bill | null;
  onClose: () => void;
}> = ({ bill, onClose }) => {
  const current = stepIndex(bill?.status);
  const place = bill ? billQueuePlace(bill) : null;

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="DC Bill Workflow"
      subtitle={bill ? `${bill.id} · ${bill.status}` : 'Creator → Finance Officer → Director of Finance → RTGS'}
      maxWidth="lg"
    >
      <ol className="space-y-3 text-xs">
        {STEPS.map((step, index) => {
          const reached = index <= current && bill?.status !== 'Rejected';
          const active = bill ? index === current && bill.status !== 'Rejected' && bill.status !== 'Paid' : index === 0;
          return (
            <li
              key={step.key}
              className={`rounded-lg border p-3 ${active ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white'}`}
            >
              <div className="font-bold text-slate-900">
                {index + 1}. {step.title}
                {active ? ' · current' : reached ? ' · complete' : ''}
              </div>
              <p className="text-slate-500 mt-1">{step.detail}</p>
            </li>
          );
        })}
        {bill?.status === 'Rejected' && (
          <li className="rounded-lg border border-rose-200 bg-rose-50 p-3">
            <div className="font-bold text-rose-800">Returned to the creator</div>
            <p className="text-rose-700 mt-1">
              Pending from {place?.pendingFrom}. The creator corrects the bill and sends it for review again.
            </p>
          </li>
        )}
      </ol>
    </Modal>
  );
};
