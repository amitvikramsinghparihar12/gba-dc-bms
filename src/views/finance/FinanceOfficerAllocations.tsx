import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';
import { BudgetGrant, Department, DDO, DdoAllocation, BudgetChangeRequest } from '../../types';
import { formatINR, round2 } from '../../utils/calc';
import { Modal } from '../../components/common/Modal';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Layers, Edit2, CheckCircle, XCircle, ArrowUpRight, ArrowDownRight, Building } from 'lucide-react';

interface FinanceOfficerAllocationsProps {
  initialTab?: 'allocations' | 'requests';
}

export const FinanceOfficerAllocations: React.FC<FinanceOfficerAllocationsProps> = ({
  initialTab = 'allocations',
}) => {
  const { currentUser, departments, ddos, addToast } = useApp();
  const [activeTab, setActiveTab] = useState<'allocations' | 'requests'>(initialTab);

  const [selectedDeptId, setSelectedDeptId] = useState(departments[0]?.id || 'DEP-TRN');
  const [grants, setGrants] = useState<BudgetGrant[]>([]);
  const [allocations, setAllocations] = useState<DdoAllocation[]>([]);
  const [requests, setRequests] = useState<BudgetChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Allocation Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<DdoAllocation | null>(null);
  const [newAllocatedAmount, setNewAllocatedAmount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Decide Request Modal State
  const [decidingRequest, setDecidingRequest] = useState<BudgetChangeRequest | null>(null);
  const [decisionType, setDecisionType] = useState<'Approved' | 'Rejected' | null>(null);
  const [decisionRemarks, setDecisionRemarks] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [g, a, r] = await Promise.all([
        api.getBudgetGrants(),
        api.getDdoAllocations(currentUser),
        api.getBudgetChangeRequests(currentUser),
      ]);
      setGrants(g);
      setAllocations(a);
      setRequests(r);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to load allocation data', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  // Current selected department grant & DDOs
  const currentGrant = grants.find((g) => g.departmentId === selectedDeptId);
  const deptDdos = ddos.filter((d) => d.departmentId === selectedDeptId);
  const deptAllocations = allocations.filter((a) =>
    deptDdos.some((d) => d.id === a.ddoId)
  );

  const totalAllocatedInDept = deptAllocations.reduce((sum, a) => sum + a.allocated, 0);
  const unallocatedInGrant = currentGrant
    ? round2(currentGrant.totalGranted - totalAllocatedInDept)
    : 0;

  // Open Edit Dialog
  const handleOpenEditAlloc = (alloc: DdoAllocation) => {
    setEditingAllocation(alloc);
    setNewAllocatedAmount(alloc.allocated);
    setIsEditModalOpen(true);
  };

  // Submit Allocation Change
  const handleSaveAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAllocation) return;

    setIsSubmitting(true);
    try {
      await api.updateDdoAllocation(currentUser, editingAllocation.id, newAllocatedAmount);
      addToast({
        type: 'success',
        title: 'DDO Allocation Updated',
        message: `DDO ${editingAllocation.ddoId} budget cap updated to ${formatINR(newAllocatedAmount)}.`,
      });
      setIsEditModalOpen(false);
      loadData();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Allocation Adjustment Rejected', message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Decide Budget Change Request
  const handleConfirmDecision = async () => {
    if (!decidingRequest || !decisionType) return;
    setIsSubmitting(true);
    try {
      await api.decideBudgetChangeRequest(
        currentUser,
        decidingRequest.id,
        decisionType,
        decisionRemarks
      );
      addToast({
        type: decisionType === 'Approved' ? 'success' : 'info',
        title: `Request ${decisionType}`,
        message: `Budget Change Request ${decidingRequest.id} has been ${decisionType.toLowerCase()}.`,
      });
      setDecidingRequest(null);
      loadData();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Decision Failed', message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Finance Officer (Level-2): DDO Budget Cap Allocation
          </h2>
          <p className="text-xs text-slate-500">
            Apportion macro department grants into individual DDO operating limits and review adjustment requests.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('allocations')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'allocations'
                ? 'bg-white text-blue-800 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            DDO Caps & Utilization
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'requests'
                ? 'bg-white text-blue-800 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Change Requests ({requests.filter((r) => r.status === 'Pending').length})
          </button>
        </div>
      </div>

      {activeTab === 'allocations' ? (
        <div className="space-y-6">
          {/* Department Selector & Macro Card */}
          <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Choose Department to Manage
              </label>
              <select
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white font-bold text-sm rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.id})
                  </option>
                ))}
              </select>
            </div>

            {currentGrant ? (
              <div className="flex flex-wrap items-center gap-6 font-mono text-xs">
                <div>
                  <span className="text-[11px] text-slate-400 block">Macro Head Grant</span>
                  <span className="text-base font-black text-white">
                    {formatINR(currentGrant.totalGranted)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-blue-300 block">Allocated to DDOs</span>
                  <span className="text-base font-bold text-blue-300">
                    {formatINR(totalAllocatedInDept)}
                  </span>
                </div>
                <div className="pl-6 border-l border-slate-800">
                  <span className="text-[11px] text-emerald-300 block">Unallocated Head Pool</span>
                  <span className="text-base font-extrabold text-emerald-400">
                    {formatINR(unallocatedInGrant)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-amber-300">No macro grant configured for this department yet.</div>
            )}
          </div>

          {/* DDO Table with Progress Bars */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4">DDO Code</th>
                    <th className="py-3.5 px-4">Division Name</th>
                    <th className="py-3.5 px-4 text-right">Allocated Cap</th>
                    <th className="py-3.5 px-4 text-right">Utilized (Gross)</th>
                    <th className="py-3.5 px-4 text-right">Remaining Balance</th>
                    <th className="py-3.5 px-4 w-48">Utilization %</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {deptDdos.map((ddo) => {
                    const alloc = allocations.find((a) => a.ddoId === ddo.id);
                    const allocated = alloc?.allocated || 0;
                    const utilized = alloc?.utilized || 0;
                    const remaining = alloc?.remaining || 0;
                    const pct = allocated > 0 ? Math.round((utilized / allocated) * 100) : 0;

                    return (
                      <tr key={ddo.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-blue-700">{ddo.id}</td>
                        <td className="py-3.5 px-4 font-medium text-slate-900">{ddo.name}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                          {formatINR(allocated)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-blue-700">
                          {formatINR(utilized)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700">
                          {formatINR(remaining)}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  pct > 90 ? 'bg-rose-500' : pct > 75 ? 'bg-amber-500' : 'bg-blue-600'
                                }`}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                            <span className="font-mono text-[11px] font-semibold text-slate-600 w-8 text-right">
                              {pct}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {alloc && (
                            <button
                              onClick={() => handleOpenEditAlloc(alloc)}
                              className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[11px] font-bold"
                            >
                              Edit Cap
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* CHANGE REQUESTS TAB */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Request Ref</th>
                  <th className="py-3.5 px-4">DDO</th>
                  <th className="py-3.5 px-4">Adjustment Type</th>
                  <th className="py-3.5 px-4 text-right">Amount (₹)</th>
                  <th className="py-3.5 px-4">Justification Reason</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Decide</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{req.id}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-blue-700">{req.ddoId}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          req.type === 'increase' ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {req.type === 'increase' ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4" />
                        )}
                        <span className="capitalize">{req.type}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatINR(req.amount)}
                    </td>
                    <td className="py-3 px-4 max-w-sm">{req.reason}</td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={req.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {req.status === 'Pending' ? (
                        <>
                          <button
                            onClick={() => {
                              setDecidingRequest(req);
                              setDecisionType('Approved');
                              setDecisionRemarks('Approved based on work urgency.');
                            }}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setDecidingRequest(req);
                              setDecisionType('Rejected');
                              setDecisionRemarks('Budget constraint on department grant.');
                            }}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-bold"
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <span className="text-[11px] text-slate-400">Decided</span>
                      )}
                    </td>
                  </tr>
                ))}

                {requests.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No budget change requests logged.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EDIT ALLOCATION MODAL */}
      {editingAllocation && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={`Edit Budget Cap: DDO ${editingAllocation.ddoId}`}
          subtitle="Enforces transactional floor (allocated >= utilized) and department ceiling"
          maxWidth="md"
        >
          <form onSubmit={handleSaveAllocation} className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 border rounded-lg space-y-1 font-mono text-[11px]">
              <div>Current Cap: <strong>{formatINR(editingAllocation.allocated)}</strong></div>
              <div>Already Utilized: <strong className="text-blue-700">{formatINR(editingAllocation.utilized)}</strong></div>
              <div>Current Remaining: <strong className="text-emerald-700">{formatINR(editingAllocation.remaining)}</strong></div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                New Allocated Budget Cap (₹) *
              </label>
              <input
                type="number"
                min={editingAllocation.utilized}
                step="50000"
                value={newAllocatedAmount}
                onChange={(e) => setNewAllocatedAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border rounded-lg font-mono font-bold text-slate-900 text-sm"
                required
              />
              <span className="text-[11px] text-slate-500 font-mono mt-1 block">
                Formatted: {formatINR(newAllocatedAmount)}
              </span>
            </div>

            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-800 space-y-0.5">
              <span className="font-bold">Invariant Protection:</span>
              <p>
                Cannot reduce below ₹{formatINR(editingAllocation.utilized)} (currently utilized).
                Total DDO allocations cannot exceed the department grant total.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 border rounded-lg font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold shadow-xs transition-colors"
              >
                {isSubmitting ? 'Saving...' : 'Commit Allocation'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* DECIDE REQUEST MODAL */}
      {decidingRequest && (
        <Modal
          isOpen={!!decidingRequest}
          onClose={() => setDecidingRequest(null)}
          title={`${decisionType} Budget Change Request`}
          subtitle={`Request ID: ${decidingRequest.id}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-700">
            <p>
              Are you sure you wish to mark this request as <strong>{decisionType}</strong>?
            </p>

            <div className="p-3 bg-slate-50 border rounded-lg space-y-1 font-mono">
              <div>DDO: <strong>{decidingRequest.ddoId}</strong></div>
              <div>Type: <strong className="capitalize">{decidingRequest.type}</strong></div>
              <div>Amount: <strong>{formatINR(decidingRequest.amount)}</strong></div>
              <div>Reason: <em>"{decidingRequest.reason}"</em></div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Decision Remarks
              </label>
              <textarea
                value={decisionRemarks}
                onChange={(e) => setDecisionRemarks(e.target.value)}
                rows={2}
                className="w-full p-2 border rounded-lg text-xs"
                placeholder="Enter remarks..."
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDecidingRequest(null)}
                className="px-4 py-2 border rounded-lg font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDecision}
                disabled={isSubmitting}
                className={`px-4 py-2 text-white rounded-lg font-bold ${
                  decisionType === 'Approved'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {isSubmitting ? 'Processing...' : `Confirm ${decisionType}`}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
