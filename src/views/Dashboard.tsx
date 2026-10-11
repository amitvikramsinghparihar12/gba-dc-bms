import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import { Bill, DdoAllocation, BudgetGrant, DDO } from '../types';
import { formatINR } from '../utils/calc';
import { StatCard } from '../components/common/StatCard';
import { PageLoader } from '../components/common/PageLoader';
import { StatusBadge } from '../components/common/StatusBadge';
import { billQueuePlace } from '../utils/billQueue';
import {
  FileText,
  Clock,
  CheckCircle,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Building,
  Sparkles,
  PieChart,
} from 'lucide-react';

interface DashboardProps {
  onNavigate: (view: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { currentUser, ddos, departments } = useApp();
  const [bills, setBills] = useState<Bill[]>([]);
  const [allocations, setAllocations] = useState<DdoAllocation[]>([]);
  const [grants, setGrants] = useState<BudgetGrant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [b, a, g] = await Promise.all([
          api.getBills(currentUser),
          api.getDdoAllocations(currentUser),
          api.getBudgetGrants(),
        ]);
        setBills(b);
        setAllocations(a);
        setGrants(g);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [currentUser]);

  // Derived metrics
  const totalBills = bills.length;
  const draftBills = bills.filter((b) => b.status === 'Draft');
  const pendingVerification = bills.filter((b) => b.status === 'Pending Verification');
  const pendingApproval = bills.filter((b) => b.status === 'Pending Approval');
  const pendingRtgs = bills.filter((b) => b.status === 'Pending RTGS');
  const paidBills = bills.filter((b) => b.status === 'Paid');
  const rejectedBills = bills.filter((b) => b.status === 'Rejected');

  const totalAllocated = allocations.reduce((acc, a) => acc + a.allocated, 0);
  const totalUtilized = allocations.reduce((acc, a) => acc + a.utilized, 0);
  const totalRemaining = allocations.reduce((acc, a) => acc + a.remaining, 0);
  const utilizationPct = totalAllocated > 0 ? Math.round((totalUtilized / totalAllocated) * 100) : 0;

  const totalPayablePendingRtgs = pendingRtgs.reduce((acc, b) => acc + b.netPayable, 0);

  if (loading) return <PageLoader label="Loading dashboard…" />;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#142A5C] via-[#1E3A8A] to-[#1E40AF] rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-100 border border-blue-400/30">
                {currentUser.role} Workspace
              </span>
              {currentUser.ddoIds.length > 0 && (
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-400/30">
                  DDO: {currentUser.ddoIds.join(', ')}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-black tracking-tight mt-2">
              Welcome, {currentUser.name}
            </h1>
            <p className="text-xs text-blue-200 max-w-xl mt-1 leading-relaxed">
              Greater Bengaluru Authority DC Bill Scrutiny, Multi-Tier Budget Control, and RTGS Processing Engine.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {currentUser.role === 'Creator' && (
              <button
                onClick={() => onNavigate('creator-new-bill')}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-bold text-xs shadow-md flex items-center gap-2 transition-transform active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>Create New DC Bill</span>
              </button>
            )}

            {currentUser.role === 'Verifier' && (
              <button
                onClick={() => onNavigate('verifier-queue')}
                className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs shadow-md flex items-center gap-2"
              >
                <Clock className="w-4 h-4" />
                <span>Pending Scrutiny ({pendingVerification.length})</span>
              </button>
            )}

            {currentUser.role === 'Approver' && (
              <button
                onClick={() => onNavigate('approver-queue')}
                className="px-4 py-2.5 rounded-xl bg-blue-400 hover:bg-blue-500 text-slate-950 font-bold text-xs shadow-md flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Sanction Queue ({pendingApproval.length})</span>
              </button>
            )}

            {currentUser.role === 'RTGS Manager' && (
              <button
                onClick={() => onNavigate('rtgs-pending')}
                className="px-4 py-2.5 rounded-xl bg-purple-400 hover:bg-purple-500 text-slate-950 font-bold text-xs shadow-md flex items-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                <span>Process RTGS ({pendingRtgs.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* KPI METRIC CARDS BASED ON ROLE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Creator KPIs */}
        {currentUser.role === 'Creator' && (
          <>
            <StatCard
              title="Assigned DDO Remaining Budget"
              value={formatINR(totalRemaining)}
              subtitle={`Total Allocated: ${formatINR(totalAllocated)}`}
              icon={<TrendingUp className="w-5 h-5" />}
              colorScheme={totalRemaining < 1000000 ? 'amber' : 'emerald'}
              trend={`${utilizationPct}% utilized`}
              trendPositive={utilizationPct < 85}
            />
            <StatCard
              title="My DC Bills"
              value={totalBills}
              subtitle={`${draftBills.length} drafts in progress`}
              icon={<FileText className="w-5 h-5" />}
              colorScheme="blue"
              onClick={() => onNavigate('creator-bills')}
            />
            <StatCard
              title="Pending Verification"
              value={pendingVerification.length}
              subtitle="Awaiting Verifier scrutiny"
              icon={<Clock className="w-5 h-5" />}
              colorScheme="amber"
              onClick={() => onNavigate('creator-bills')}
            />
            <StatCard
              title="Rejected Bills"
              value={rejectedBills.length}
              subtitle="Click to edit and resubmit"
              icon={<AlertTriangle className="w-5 h-5" />}
              colorScheme={rejectedBills.length > 0 ? 'rose' : 'slate'}
              onClick={() => onNavigate('creator-bills')}
            />
          </>
        )}

        {/* Verifier KPIs */}
        {currentUser.role === 'Verifier' && (
          <>
            <StatCard
              title="Pending Scrutiny"
              value={pendingVerification.length}
              subtitle="Bills requiring technical verification"
              icon={<Clock className="w-5 h-5" />}
              colorScheme="amber"
              onClick={() => onNavigate('verifier-queue')}
            />
            <StatCard
              title="Passed to Approval"
              value={pendingApproval.length}
              subtitle="Successfully verified by you"
              icon={<CheckCircle className="w-5 h-5" />}
              colorScheme="blue"
            />
            <StatCard
              title="Total Disbursed"
              value={paidBills.length}
              subtitle="Paid through RTGS advice"
              icon={<CreditCard className="w-5 h-5" />}
              colorScheme="emerald"
            />
            <StatCard
              title="Rejected by Verification"
              value={rejectedBills.length}
              subtitle="Reverted with remarks"
              icon={<AlertTriangle className="w-5 h-5" />}
              colorScheme="rose"
            />
          </>
        )}

        {/* Approver KPIs */}
        {currentUser.role === 'Approver' && (
          <>
            <StatCard
              title="Pending Sanction"
              value={pendingApproval.length}
              subtitle="Verified bills awaiting sanction"
              icon={<Clock className="w-5 h-5" />}
              colorScheme="blue"
              onClick={() => onNavigate('approver-queue')}
            />
            <StatCard
              title="Approved for RTGS"
              value={pendingRtgs.length}
              subtitle={`Total: ${formatINR(totalPayablePendingRtgs)}`}
              icon={<CheckCircle className="w-5 h-5" />}
              colorScheme="purple"
            />
            <StatCard
              title="Total Paid Bills"
              value={paidBills.length}
              subtitle="Completed bank disbursements"
              icon={<CreditCard className="w-5 h-5" />}
              colorScheme="emerald"
            />
            <StatCard
              title="Managed DDO Budget Head"
              value={formatINR(totalRemaining)}
              subtitle={`Utilized: ${formatINR(totalUtilized)}`}
              icon={<TrendingUp className="w-5 h-5" />}
              colorScheme="slate"
            />
          </>
        )}

        {/* RTGS Manager KPIs */}
        {currentUser.role === 'RTGS Manager' && (
          <>
            <StatCard
              title="Awaiting RTGS Generation"
              value={pendingRtgs.length}
              subtitle="Approved bills ready for batching"
              icon={<Clock className="w-5 h-5" />}
              colorScheme="purple"
              onClick={() => onNavigate('rtgs-pending')}
            />
            <StatCard
              title="Net Payable Pending RTGS"
              value={formatINR(totalPayablePendingRtgs)}
              subtitle="Total liability awaiting payment"
              icon={<CreditCard className="w-5 h-5" />}
              colorScheme="blue"
              onClick={() => onNavigate('rtgs-pending')}
            />
            <StatCard
              title="Completed Batches"
              value={paidBills.length}
              subtitle="Bills paid via bank advice"
              icon={<CheckCircle className="w-5 h-5" />}
              colorScheme="emerald"
              onClick={() => onNavigate('rtgs-history')}
            />
            <StatCard
              title="Active Bank Accounts"
              value="2 Accounts"
              subtitle="Canara Bank & HDFC Bank"
              icon={<Building className="w-5 h-5" />}
              colorScheme="slate"
            />
          </>
        )}

        {/* Admin / Director / Finance Officer KPIs */}
        {['Super Admin', 'Director of Finance', 'Finance Officer'].includes(currentUser.role) && (
          <>
            <StatCard
              title="Total Granted Budget"
              value={formatINR(grants.reduce((acc, g) => acc + g.totalGranted, 0))}
              subtitle={`Across ${grants.length} Departments`}
              icon={<TrendingUp className="w-5 h-5" />}
              colorScheme="blue"
            />
            <StatCard
              title="DDO Utilized Budget"
              value={formatINR(totalUtilized)}
              subtitle={`Remaining: ${formatINR(totalRemaining)}`}
              icon={<PieChart className="w-5 h-5" />}
              colorScheme="emerald"
              trend={`${utilizationPct}% utilized`}
              trendPositive={utilizationPct < 85}
            />
            <StatCard
              title="Active DC Bills"
              value={bills.length}
              subtitle={`${pendingRtgs.length} pending RTGS, ${paidBills.length} paid`}
              icon={<FileText className="w-5 h-5" />}
              colorScheme="purple"
            />
            <StatCard
              title="Awaiting Sanction & Scrutiny"
              value={pendingVerification.length + pendingApproval.length}
              subtitle="Under review in approval pipeline"
              icon={<Clock className="w-5 h-5" />}
              colorScheme="amber"
            />
          </>
        )}
      </div>

      {/* DDO BUDGET UTILIZATION VISUALIZER */}
      {allocations.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                DDO Budget Cap & Utilization Snapshot (FY 2025-26)
              </h3>
              <p className="text-xs text-slate-500">
                Gross bill submission reserves budget automatically. Isolation strictly applied.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700">
              {allocations.length} DDO Allocation{allocations.length > 1 ? 's' : ''} Monitored
            </span>
          </div>

          <div className="space-y-4">
            {allocations.map((alloc) => {
              const ddoInfo = ddos.find((d: DDO) => d.id === alloc.ddoId);
              const pct = alloc.allocated > 0 ? Math.round((alloc.utilized / alloc.allocated) * 100) : 0;
              const isNearLimit = pct >= 90;

              return (
                <div key={alloc.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">
                        DDO {alloc.ddoId} - {ddoInfo?.name || 'Department Division'}
                      </span>
                      {isNearLimit && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          Near Cap ({pct}%)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-slate-600 font-mono text-[11px]">
                      <span>Allocated: <strong>{formatINR(alloc.allocated)}</strong></span>
                      <span>Utilized: <strong className="text-blue-700">{formatINR(alloc.utilized)}</strong></span>
                      <span>Remaining: <strong className="text-emerald-700">{formatINR(alloc.remaining)}</strong></span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        pct > 90
                          ? 'bg-rose-500'
                          : pct > 75
                          ? 'bg-amber-500'
                          : 'bg-blue-600'
                      }`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* RECENT ACTIVITY & PENDING ACTION LIST */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent DC Bills in Scope</h3>
            <p className="text-xs text-slate-500">Live operational ledger filtered to your mapped access</p>
          </div>
          {currentUser.role === 'Creator' && (
            <button
              onClick={() => onNavigate('creator-bills')}
              className="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1"
            >
              <span>View All Bills</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">DC No.</th>
                <th className="py-3 px-4">DDO</th>
                <th className="py-3 px-4">Creator</th>
                <th className="py-3 px-4">Pending from</th>
                <th className="py-3 px-4">Pending Role</th>
                <th className="py-3 px-4">Narration</th>
                <th className="py-3 px-4 text-right">Gross Value</th>
                <th className="py-3 px-4 text-right">Net Payable</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {bills.slice(0, 7).map((bill) => {
                const place = billQueuePlace(bill);
                return (
                <tr key={bill.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-blue-700">{bill.id}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{bill.ddoId}</td>
                  <td className="py-3 px-4">{bill.createdByName || 'Creator'}</td>
                  <td className="py-3 px-4">{place.pendingFrom}</td>
                  <td className="py-3 px-4">{place.pendingRole}</td>
                  <td className="py-3 px-4 max-w-xs truncate" title={bill.description}>
                    {bill.description}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-medium">
                    {formatINR(bill.grossValue)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                    {formatINR(bill.netPayable)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <StatusBadge status={bill.status} size="sm" />
                  </td>
                  <td className="py-3 px-4 text-right">
                    {currentUser.role === 'Creator' && (
                      <button
                        onClick={() => onNavigate('creator-bills')}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                      >
                        Inspect
                      </button>
                    )}
                    {currentUser.role === 'Verifier' && bill.status === 'Pending Verification' && (
                      <button
                        onClick={() => onNavigate('verifier-queue')}
                        className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded text-[11px]"
                      >
                        Verify
                      </button>
                    )}
                    {currentUser.role === 'Approver' && bill.status === 'Pending Approval' && (
                      <button
                        onClick={() => onNavigate('approver-queue')}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-[11px]"
                      >
                        Approve
                      </button>
                    )}
                    {currentUser.role === 'RTGS Manager' && bill.status === 'Pending RTGS' && (
                      <button
                        onClick={() => onNavigate('rtgs-pending')}
                        className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded text-[11px]"
                      >
                        Batch
                      </button>
                    )}
                  </td>
                </tr>
              );
              })}

              {bills.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    No DC bills found matching your mapped scope.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
