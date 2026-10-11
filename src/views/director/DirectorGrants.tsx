import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';
import { BudgetGrant, DdoAllocation } from '../../types';
import { formatINR, round2 } from '../../utils/calc';
import { Modal } from '../../components/common/Modal';
import { BusyOverlay, PageLoader } from '../../components/common/PageLoader';
import { Layers, Plus, Edit3 } from 'lucide-react';

export const DirectorGrants: React.FC = () => {
  const { currentUser, addToast } = useApp();
  const [grants, setGrants] = useState<BudgetGrant[]>([]);
  const [allocations, setAllocations] = useState<DdoAllocation[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGrant, setEditingGrant] = useState<BudgetGrant | null>(null);
  const [headCode, setHeadCode] = useState('BH04');
  const [headName, setHeadName] = useState('');
  const [totalGranted, setTotalGranted] = useState<number>(100000000);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [headLookup, setHeadLookup] = useState('**');

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
    setHeadCode('BH04');
    setHeadName('');
    setTotalGranted(100000000);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (grant: BudgetGrant) => {
    setEditingGrant(grant);
    setHeadCode(grant.code);
    setHeadName(grant.name);
    setTotalGranted(grant.totalGranted);
    setIsModalOpen(true);
  };

  const handleSaveGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const movement = !editingGrant
        ? 'created'
        : totalGranted >= editingGrant.totalGranted
          ? 'increased'
          : 'decreased';
      await api.createOrUpdateGrant(currentUser, {
        id: editingGrant?.id,
        code: headCode,
        name: headName,
        totalGranted,
        financialYear: '2025-26',
      });
      addToast({
        type: 'success',
        title: editingGrant ? 'Budget Head Updated' : 'Budget Head Created',
        message: `${headCode} ${headName} ${movement} to ${formatINR(totalGranted)}.`,
      });
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Grant Operation Blocked', message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <PageLoader label="Loading budget heads…" />;

  const lookup = headLookup.trim();
  const visibleGrants = grants.filter((grant) => {
    if (!lookup || lookup === '**') return true;
    const query = lookup.toLowerCase();
    return grant.code.toLowerCase().includes(query) || grant.name.toLowerCase().includes(query);
  });

  return (
    <div className="space-y-6">
      {isSubmitting && <BusyOverlay label="Saving budget head…" />}
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Director of Finance: Macro Budget Head Master
          </h2>
          <p className="text-xs text-slate-500">
            Create and update budget heads such as BH01, BH02, and BH03. Raise or lower each head's grant before the Finance Officer allocates it to DDOs.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-2 transition-transform active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Create Budget Head</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1">
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Budget Head</label>
          <input
            value={headLookup}
            onChange={(event) => setHeadLookup(event.target.value)}
            placeholder="Enter ** to load all budget heads"
            className="w-full p-2 border rounded-lg text-xs font-mono"
          />
        </div>
        <p className="text-[11px] text-slate-500 sm:max-w-sm">
          Type a head code or name. ** lists every budget head in this financial year.
        </p>
      </div>

      {/* Grants Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Budget Head</th>
                <th className="py-3.5 px-4">Financial Year</th>
                <th className="py-3.5 px-4">Head Name</th>
                <th className="py-3.5 px-4 text-right">Granted Budget (Cap)</th>
                <th className="py-3.5 px-4 text-right">Allocated to DDOs</th>
                <th className="py-3.5 px-4 text-right">Unallocated Reserve</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {visibleGrants.map((grant) => {
                const deptAllocations = allocations.filter((a) => a.grantId === grant.id);
                const totalAllocatedToDdos = deptAllocations.reduce((sum, a) => sum + a.allocated, 0);
                const unallocated = round2(grant.totalGranted - totalAllocatedToDdos);

                return (
                  <tr key={grant.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">{grant.code}</td>
                    <td className="py-3 px-4 font-mono font-semibold">{grant.financialYear}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{grant.name}</div>
                      <div className="text-[10px] text-slate-400">{deptAllocations.length} DDO allocation{deptAllocations.length === 1 ? '' : 's'}</div>
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
                        <span>Increase / Decrease</span>
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
        title={editingGrant ? `Update ${editingGrant.code}` : 'Create Budget Head'}
        subtitle="Budget Head Master • increase or decrease the grant • FY 2025-26"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveGrant} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Budget head code *</label>
            <input
              value={headCode}
              onChange={(e) => setHeadCode(e.target.value.toUpperCase())}
              disabled={!!editingGrant}
              placeholder="BH04"
              className="w-full px-3 py-2 border rounded-lg font-mono font-bold"
              required
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Budget head name *</label>
            <input
              value={headName}
              onChange={(e) => setHeadName(e.target.value)}
              placeholder="Road & Transport Works"
              className="w-full px-3 py-2 border rounded-lg"
              required
            />
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
              A decrease is blocked when DDOs have already been allocated more than the new grant. An increase raises the pool the Finance Officer can assign.
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
