import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';
import { BudgetGrant, Department, DdoAllocation } from '../../types';
import { formatINR, round2 } from '../../utils/calc';
import { Modal } from '../../components/common/Modal';
import { Layers, Plus, Edit3, Building2, CheckCircle2, AlertTriangle, TrendingUp } from 'lucide-react';

export const DirectorGrants: React.FC = () => {
  const { currentUser, departments, addToast } = useApp();
  const [grants, setGrants] = useState<BudgetGrant[]>([]);
  const [allocations, setAllocations] = useState<DdoAllocation[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGrant, setEditingGrant] = useState<BudgetGrant | null>(null);
  const [deptId, setDeptId] = useState('');
  const [totalGranted, setTotalGranted] = useState<number>(100000000);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [g, a] = await Promise.all([
        api.getBudgetGrants(),
        api.getDdoAllocations(currentUser),
      ]);
      setGrants(g);
      setAllocations(a);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to load grants', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const handleOpenCreate = () => {
    setEditingGrant(null);
    setDeptId(departments[0]?.id || '');
    setTotalGranted(100000000); // 10 Cr default
    setIsModalOpen(true);
  };

  const handleOpenEdit = (grant: BudgetGrant) => {
    setEditingGrant(grant);
    setDeptId(grant.departmentId);
    setTotalGranted(grant.totalGranted);
    setIsModalOpen(true);
  };

  const handleSaveGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.createOrUpdateGrant(currentUser, {
        id: editingGrant?.id,
        departmentId: deptId,
        totalGranted,
        financialYear: '2025-26',
      });
      addToast({
        type: 'success',
        title: editingGrant ? 'Grant Cap Updated' : 'Macro Budget Grant Provisioned',
        message: `Department grant set to ${formatINR(totalGranted)} for FY 2025-26.`,
      });
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Grant Operation Blocked', message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Director of Finance: Macro Budget Head Master
          </h2>
          <p className="text-xs text-slate-500">
            Determine and sanction total departmental grant caps for FY 2025-26 before Level-2 DDO allocation.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-2 transition-transform active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Provision New Grant</span>
        </button>
      </div>

      {/* Grants Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Grant ID</th>
                <th className="py-3.5 px-4">Financial Year</th>
                <th className="py-3.5 px-4">Department Name</th>
                <th className="py-3.5 px-4 text-right">Granted Budget (Cap)</th>
                <th className="py-3.5 px-4 text-right">Allocated to DDOs</th>
                <th className="py-3.5 px-4 text-right">Unallocated Reserve</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {grants.map((grant) => {
                const dept = departments.find((d) => d.id === grant.departmentId);
                const deptAllocations = allocations.filter((a) => a.grantId === grant.id);
                const totalAllocatedToDdos = deptAllocations.reduce((sum, a) => sum + a.allocated, 0);
                const unallocated = round2(grant.totalGranted - totalAllocatedToDdos);

                return (
                  <tr key={grant.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">{grant.id}</td>
                    <td className="py-3 px-4 font-mono font-semibold">{grant.financialYear}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{dept?.name || grant.departmentId}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{grant.departmentId}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-slate-900 text-sm">
                      {formatINR(grant.totalGranted)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-blue-700">
                      {formatINR(totalAllocatedToDdos)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                      {formatINR(unallocated)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenEdit(grant)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 ml-auto"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-blue-700" />
                        <span>Edit Cap</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT GRANT MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingGrant ? `Update Grant: ${editingGrant.id}` : 'Provision Macro Budget Head Grant'}
        subtitle="Department Grant Head Master • FY 2025-26"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveGrant} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Select Department *
            </label>
            <select
              value={deptId}
              onChange={(e) => setDeptId(e.target.value)}
              disabled={!!editingGrant}
              className="w-full px-3 py-2 border rounded-lg bg-white font-medium"
              required
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Total Sanctioned Grant Amount (₹) *
            </label>
            <input
              type="number"
              min="100000"
              step="500000"
              value={totalGranted}
              onChange={(e) => setTotalGranted(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border rounded-lg font-mono font-bold text-slate-900 text-sm"
              required
            />
            <span className="text-[11px] text-slate-500 font-mono mt-1 block">
              Formatted: {formatINR(totalGranted)}
            </span>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-900 space-y-1">
            <span className="font-bold">Fiscal Constraint Rule:</span>
            <p>
              Grant total cannot be reduced below the sum of allocations currently assigned to DDOs under
              this department.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border rounded-lg font-semibold text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold shadow-xs transition-colors"
            >
              {isSubmitting ? 'Saving...' : 'Save Department Grant'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
