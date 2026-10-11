import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';
import { Bill, Vendor, DdoAllocation } from '../../types';
import { formatINR } from '../../utils/calc';
import { StatusBadge } from '../../components/common/StatusBadge';
import { BillWorkflowModal } from '../../components/bills/BillWorkflowModal';
import { billQueuePlace } from '../../utils/billQueue';
import { Modal } from '../../components/common/Modal';
import { BusyOverlay, PageLoader } from '../../components/common/PageLoader';
import {
  CheckCircle,
  XCircle,
  FileText,
  Clock,
  Building,
  Paperclip,
  AlertTriangle,
  History,
  ShieldCheck,
  Building2,
  Calendar,
  Lock,
} from 'lucide-react';

interface ReviewQueueProps {
  roleStage: 'Verifier' | 'Approver';
}

export const ReviewQueue: React.FC<ReviewQueueProps> = ({ roleStage }) => {
  const { currentUser, addToast } = useApp();
  const [bills, setBills] = useState<Bill[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [allocations, setAllocations] = useState<DdoAllocation[]>([]);
  const [loading, setLoading] = useState(true);

  // Review Modal State
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [workflowBill, setWorkflowBill] = useState<Bill | null>(null);
  const [remarks, setRemarks] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const targetStatus = roleStage === 'Verifier' ? 'Pending Verification' : 'Pending Approval';

  const loadData = async () => {
    setLoading(true);
    try {
      const [allBills, allVendors, allAllocations] = await Promise.all([
        api.getBills(currentUser),
        api.getVendors(),
        api.getDdoAllocations(currentUser),
      ]);
      setBills(allBills.filter((b) => b.status === targetStatus));
      setVendors(allVendors);
      setAllocations(allAllocations);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error loading queue', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    setSelectedBill(null);
  }, [currentUser, roleStage]);

  const handleOpenReview = (bill: Bill) => {
    setSelectedBill(bill);
    setRemarks('');
    setActionType(null);
  };

  const handleApprove = () => {
    setActionType('approve');
    setShowConfirmModal(true);
  };

  const handleRejectClick = () => {
    if (!remarks.trim() || remarks.trim().length < 10) {
      addToast({
        type: 'warning',
        title: 'Mandatory Remarks Required',
        message: 'Please provide detailed remarks (minimum 10 characters) explaining why this bill is being rejected/reverted.',
      });
      return;
    }
    setActionType('reject');
    setShowConfirmModal(true);
  };

  const executeAction = async () => {
    if (!selectedBill || !actionType) return;
    setIsProcessing(true);

    try {
      if (actionType === 'approve') {
        if (roleStage === 'Verifier') {
          await api.verifyBill(currentUser, selectedBill.id, remarks || 'Verified measurements and statutory deductions.');
          addToast({
            type: 'success',
            title: 'Bill Verified Successfully',
            message: `${selectedBill.id} has advanced to Approver sanction queue.`,
          });
        } else {
          await api.approveBill(currentUser, selectedBill.id, remarks || 'Sanction accorded. Forwarded for RTGS payment.');
          addToast({
            type: 'success',
            title: 'Sanction Accorded',
            message: `${selectedBill.id} is now approved and queued for RTGS batching.`,
          });
        }
      } else {
        // Rejection / Revert
        await api.rejectBill(currentUser, selectedBill.id, remarks);
        addToast({
          type: 'info',
          title: roleStage === 'Verifier' ? 'Bill Rejected' : 'Bill Reverted',
          message: `${selectedBill.id} has been returned to the Creator. Reserved budget of ${formatINR(selectedBill.grossValue)} was released.`,
        });
      }

      setShowConfirmModal(false);
      setSelectedBill(null);
      loadData();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Action Failed', message: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <PageLoader label="Loading review queue…" />;

  const activeVendor = selectedBill ? vendors.find((v) => v.id === selectedBill.vendorId) : null;
  const activeAllocation = selectedBill
    ? allocations.find((a) => a.ddoId === selectedBill.ddoId)
    : null;

  return (
    <div className="space-y-6">
      {workflowBill && <BillWorkflowModal bill={workflowBill} onClose={() => setWorkflowBill(null)} />}
      {isProcessing && <BusyOverlay label="Updating bill…" />}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">
              {roleStage === 'Verifier' ? 'Finance Officer Verification Queue' : 'Director of Finance Sanction Queue'}
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
              {bills.length} Pending
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {roleStage === 'Verifier'
              ? 'Technical scrutiny of measurements, vouchers, and 16 statutory deduction schedules (Read-Only).'
              : 'Administrative and financial sanction prior to RTGS disbursement (Read-Only).'}
          </p>
        </div>

        <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-slate-500" />
          <span>Strict Read-Only Scrutiny Mode Enforced</span>
        </div>
      </div>

      {/* Queue Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">DC No.</th>
                <th className="py-3.5 px-4">DDO</th>
                <th className="py-3.5 px-4">Creator</th>
                <th className="py-3.5 px-4">Pending Role</th>
                <th className="py-3.5 px-4">Narration</th>
                <th className="py-3.5 px-4">Vendor</th>
                <th className="py-3.5 px-4 text-right">Gross Value</th>
                <th className="py-3.5 px-4 text-right">Deductions</th>
                <th className="py-3.5 px-4 text-right">Net Payable</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Review Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {bills.map((bill) => {
                const vendor = vendors.find((v) => v.id === bill.vendorId);
                const place = billQueuePlace(bill);
                return (
                  <tr key={bill.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">{bill.id}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{bill.ddoId}</td>
                    <td className="py-3 px-4">{bill.createdByName || 'Creator'}</td>
                    <td className="py-3 px-4">{place.pendingRole}</td>
                    <td className="py-3 px-4 max-w-[160px] truncate" title={bill.description}>{bill.description}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{vendor?.name || bill.vendorId}</div>
                      <div className="text-[10px] text-slate-400 font-mono">GST: {vendor?.gstin}</div>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate">{bill.workOrderNo}</td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-slate-900">
                      {formatINR(bill.grossValue)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-rose-600">
                      -{formatINR(bill.totalDeductions)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                      {formatINR(bill.netPayable)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={bill.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <button
                        type="button"
                        onClick={() => setWorkflowBill(bill)}
                        className="px-2 py-1.5 rounded-lg text-xs font-bold text-blue-700 border border-blue-200"
                      >
                        Workflow
                      </button>
                      <button
                        onClick={() => handleOpenReview(bill)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-xs transition-colors ${
                          roleStage === 'Verifier'
                            ? 'bg-amber-600 hover:bg-amber-700'
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        Scrutinize & Review
                      </button>
                    </td>
                  </tr>
                );
              })}

              {bills.length === 0 && (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-70" />
                    <p className="font-semibold text-slate-700">Queue is completely clear!</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      No pending bills require your review at this time.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* STRICT READ-ONLY REVIEW MODAL */}
      {selectedBill && (
        <Modal
          isOpen={!!selectedBill}
          onClose={() => setSelectedBill(null)}
          title={`Bill Scrutiny: ${selectedBill.id}`}
          subtitle={`Read-only Scrutiny Mode • Operating DDO: ${selectedBill.ddoId}`}
          maxWidth="4xl"
        >
          <div className="space-y-6">
            {/* READ-ONLY BANNER */}
            <div className="bg-slate-100 border border-slate-300 rounded-lg p-3 text-xs text-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-500" />
                <span className="font-semibold">
                  All form fields rendered in plain text. No modifications permitted during review.
                </span>
              </div>
              <StatusBadge status={selectedBill.status} size="sm" />
            </div>

            {/* VENDOR & BANK PARTICULARS (PLAIN TEXT) */}
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                1. Vendor & Beneficiary Particulars
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Vendor Name</span>
                  <span className="font-bold text-slate-900">{activeVendor?.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">GSTIN</span>
                  <span className="font-mono font-bold text-slate-800">{activeVendor?.gstin}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Bank & Branch</span>
                  <span className="font-medium text-slate-800">
                    {activeVendor?.bankName} ({activeVendor?.branchName})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Account & IFSC</span>
                  <span className="font-mono font-bold text-slate-800">
                    {activeVendor?.bankAccountNumber} • {activeVendor?.ifsc}
                  </span>
                </div>
              </div>
            </div>

            {/* WORK ORDER & AGREEMENT (PLAIN TEXT) */}
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                2. Contractual Sanctions
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Work Order Number</span>
                  <span className="font-mono font-bold text-slate-900">{selectedBill.workOrderNo}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Work Order Date</span>
                  <span className="font-medium text-slate-800">{selectedBill.workOrderDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Agreement Number</span>
                  <span className="font-mono font-bold text-slate-900">{selectedBill.agreementNo}</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 text-xs">
                <span className="text-slate-400 block text-[11px]">Work Scope Description</span>
                <p className="text-slate-700 mt-0.5 leading-relaxed">{selectedBill.description}</p>
              </div>
            </div>

            {/* FINANCIAL SUMMARY & TAX BREAKDOWN (PLAIN TEXT) */}
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                3. Financial Breakdown
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-400 block text-[11px]">Base Value</span>
                  <span className="font-bold text-slate-900">{formatINR(selectedBill.baseValue)}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-400 block text-[11px]">CGST (9%)</span>
                  <span className="font-bold text-slate-900">{formatINR(selectedBill.cgst)}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-400 block text-[11px]">SGST (9%)</span>
                  <span className="font-bold text-slate-900">{formatINR(selectedBill.sgst)}</span>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <span className="text-blue-600 block text-[11px]">Gross Value (Reserved)</span>
                  <span className="font-black text-blue-900">{formatINR(selectedBill.grossValue)}</span>
                </div>
              </div>
            </div>

            {/* 16 DEDUCTIONS TABLE (PLAIN TEXT) */}
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                4. Statutory Deductions Schedule (16 Heads)
              </h4>
              <div className="max-h-52 overflow-y-auto border border-slate-100 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-500 text-[11px]">
                    <tr className="border-b">
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Statutory Head</th>
                      <th className="py-2 px-3 text-right">Deducted Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {selectedBill.deductions.map((d, i) => (
                      <tr key={d.id} className={d.amount > 0 ? 'bg-amber-50/40 font-semibold' : ''}>
                        <td className="py-1.5 px-3 text-slate-400">{i + 1}</td>
                        <td className="py-1.5 px-3 text-slate-800">{d.label}</td>
                        <td className="py-1.5 px-3 text-right text-rose-700">
                          {d.amount > 0 ? `-${formatINR(d.amount)}` : '₹ 0.00'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 p-3 bg-slate-900 text-white rounded-lg flex items-center justify-between text-xs font-mono">
                <span>Net Payable to Beneficiary:</span>
                <span className="text-emerald-400 font-black text-base">
                  {formatINR(selectedBill.netPayable)}
                </span>
              </div>
            </div>

            {/* ATTACHMENTS (PLAIN TEXT) */}
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                5. Attached Verification Vouchers
              </h4>
              <div className="flex flex-wrap gap-2">
                {selectedBill.attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                  >
                    <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                    <span className="font-semibold text-slate-800">{att.name}</span>
                    <span className="text-[10px] text-slate-400">({att.size})</span>
                  </div>
                ))}
              </div>
            </div>

            {/* DDO BUDGET IMPACT AUDIT */}
            {activeAllocation && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs font-mono flex items-center justify-between">
                <span>DDO {selectedBill.ddoId} Budget Balance:</span>
                <div className="space-x-4">
                  <span>Utilized: {formatINR(activeAllocation.utilized)}</span>
                  <span>Available: <strong>{formatINR(activeAllocation.remaining)}</strong></span>
                </div>
              </div>
            )}

            {/* TIMELINE / HISTORY */}
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                <History className="w-4 h-4 text-blue-600" />
                <span>Audit & Action History</span>
              </h4>
              <div className="space-y-3 border-l-2 border-slate-300 pl-4">
                {selectedBill.history.map((h, i) => (
                  <div key={h.id || i} className="text-xs">
                    <div className="font-bold text-slate-900">
                      {h.status} • <span className="font-normal text-slate-500">{h.userName} ({h.userRole})</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {new Date(h.timestamp).toLocaleString()}
                    </div>
                    {h.remarks && (
                      <div className="mt-1 text-slate-700 bg-slate-50 p-2 rounded text-[11px] italic">
                        "{h.remarks}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* SCRUTINY REMARKS BOX */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Official Scrutiny Remarks
                <span className="text-rose-600 ml-1">
                  *(Mandatory min 10 characters if rejecting/reverting)
                </span>
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter technical verification notes, sanction observations, or reasons for rejection..."
                rows={3}
                className="w-full p-2.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="text-[11px] text-slate-400 text-right">
                {remarks.trim().length} characters entered
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleRejectClick}
                className="px-4 py-2.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <XCircle className="w-4 h-4" />
                <span>
                  {roleStage === 'Verifier' ? 'Reject with Remarks' : 'Revert with Remarks'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleApprove}
                className={`px-5 py-2.5 rounded-lg text-xs font-bold text-white shadow-xs flex items-center gap-1.5 transition-colors ${
                  roleStage === 'Verifier'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                <span>
                  {roleStage === 'Verifier' ? 'Verify & pass to Director of Finance' : 'Sanction & Release for RTGS'}
                </span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* CONFIRMATION DIALOG */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title={actionType === 'approve' ? 'Confirm Approval Action' : 'Confirm Rejection / Revert'}
        subtitle={`Bill ID: ${selectedBill?.id}`}
        maxWidth="md"
      >
        <div className="space-y-4 text-xs text-slate-700">
          {actionType === 'approve' ? (
            <p>
              Are you sure you wish to accord approval to <strong>{selectedBill?.id}</strong>?{' '}
              {roleStage === 'Verifier'
                ? 'The bill will advance to the Approver stage.'
                : 'The bill will advance to Pending RTGS for treasury advice generation.'}
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-rose-700 font-semibold">
                This bill will be set to Rejected and returned to the Creator.
              </p>
              <p>
                <strong>Budget Impact:</strong> The reserved amount of{' '}
                <strong>{formatINR(selectedBill?.grossValue)}</strong> will be immediately released back to DDO{' '}
                {selectedBill?.ddoId}.
              </p>
              <div className="p-2.5 bg-slate-100 rounded text-slate-800 italic">
                "{remarks}"
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              onClick={() => setShowConfirmModal(false)}
              className="px-4 py-2 border rounded-lg font-semibold text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={executeAction}
              disabled={isProcessing}
              className={`px-4 py-2 rounded-lg font-bold text-white transition-colors ${
                actionType === 'approve'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {isProcessing ? 'Processing...' : 'Confirm Action'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
