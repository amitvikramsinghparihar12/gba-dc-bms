import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Building2,
  FileText,
  CheckCircle,
  FileCheck2,
  CreditCard,
  PieChart,
  ShieldAlert,
  RotateCcw,
  Users,
  Layers,
  FileSpreadsheet,
  Settings,
  HelpCircle,
  FlaskConical,
  LogOut,
  Building,
  Briefcase,
  AlertOctagon,
  Sparkles,
} from 'lucide-react';
import { ToastContainer } from '../common/ToastContainer';
import { Modal } from '../common/Modal';

interface ShellProps {
  currentView: string;
  onNavigate: (view: string) => void;
  children: React.ReactNode;
}

export const Shell: React.FC<ShellProps> = ({ currentView, onNavigate, children }) => {
  const {
    currentUser,
    resetDemoData,
    signOut,
    workflowConfig,
  } = useApp();

  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Dynamic Sidebar Navigation based on Role
  const getNavItems = () => {
    switch (currentUser.role) {
      case 'Super Admin':
        return [
          { id: 'dashboard', label: 'Overview', icon: <PieChart className="w-4 h-4" /> },
          { id: 'admin-departments', label: 'Departments', icon: <Building2 className="w-4 h-4" /> },
          { id: 'admin-ddos', label: 'DDO Management', icon: <Building className="w-4 h-4" /> },
          { id: 'admin-vendors', label: 'Vendors & Docs', icon: <Briefcase className="w-4 h-4" /> },
          { id: 'admin-users', label: 'Users & Mappings', icon: <Users className="w-4 h-4" /> },
          { id: 'admin-workflow', label: 'Approval Workflow', icon: <Settings className="w-4 h-4" /> },
          { id: 'admin-audit', label: 'Immutable Audit Log', icon: <FileSpreadsheet className="w-4 h-4" /> },
        ];

      case 'Director of Finance':
        return [
          { id: 'dashboard', label: 'Overview', icon: <PieChart className="w-4 h-4" /> },
          { id: 'director-grants', label: 'Budget Head Master', icon: <Layers className="w-4 h-4" /> },
          { id: 'approver-queue', label: 'Sanction & Approval', icon: <FileCheck2 className="w-4 h-4" /> },
        ];

      case 'Finance Officer':
        return [
          { id: 'dashboard', label: 'Overview', icon: <PieChart className="w-4 h-4" /> },
          { id: 'fo-allocations', label: 'Budget Head Management', icon: <Layers className="w-4 h-4" /> },
          { id: 'verifier-queue', label: 'Verification Queue', icon: <CheckCircle className="w-4 h-4" /> },
          { id: 'fo-requests', label: 'Budget Change Requests', icon: <FileCheck2 className="w-4 h-4" /> },
        ];

      case 'Creator':
        return [
          { id: 'dashboard', label: 'Overview', icon: <PieChart className="w-4 h-4" /> },
          { id: 'creator-bills', label: 'My DC Bills', icon: <FileText className="w-4 h-4" /> },
          { id: 'creator-new-bill', label: 'Create New Bill', icon: <Sparkles className="w-4 h-4" /> },
        ];

      case 'Verifier':
        return [
          { id: 'dashboard', label: 'Overview', icon: <PieChart className="w-4 h-4" /> },
          { id: 'verifier-queue', label: 'Verification Queue', icon: <CheckCircle className="w-4 h-4" /> },
        ];

      case 'Approver':
        return [
          { id: 'dashboard', label: 'Overview', icon: <PieChart className="w-4 h-4" /> },
          { id: 'approver-queue', label: 'Sanction & Approval Queue', icon: <FileCheck2 className="w-4 h-4" /> },
        ];

      case 'RTGS Manager':
        return [
          { id: 'dashboard', label: 'Overview', icon: <PieChart className="w-4 h-4" /> },
          { id: 'rtgs-pending', label: 'Pending RTGS Advice', icon: <CreditCard className="w-4 h-4" /> },
          { id: 'rtgs-history', label: 'RTGS Batches & Archive', icon: <FileSpreadsheet className="w-4 h-4" /> },
        ];

      default:
        return [{ id: 'dashboard', label: 'Overview', icon: <PieChart className="w-4 h-4" /> }];
    }
  };

  const navItems = getNavItems();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <ToastContainer />

      {/* TOP HEADER */}
      <header className="sticky top-0 z-40 bg-[#142A5C] text-white border-b border-blue-900 shadow-md">
        <div className="px-4 lg:px-6 py-2.5 flex items-center justify-between gap-4">
          {/* Brand Logo & Subhead */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white text-base shadow-inner border border-blue-400/40">
              GBA
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-white text-base">
                  GBA CORPORATION
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/30 text-blue-200 border border-blue-400/30">
                  DC-BMS
                </span>
                <span className="hidden sm:inline-block text-[11px] font-mono px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-200 border border-amber-400/30">
                  FY {workflowConfig?.financialYear || '2025-26'}
                </span>
              </div>
              <p className="text-[11px] text-blue-200/80 -mt-0.5 hidden sm:block">
                Greater Bengaluru Authority • Detailed Contingent Bill Portal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Test Runner Button */}
            <button
              onClick={() => onNavigate('test-runner')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                currentView === 'test-runner'
                  ? 'bg-amber-500 text-slate-900 border-amber-400 font-bold'
                  : 'bg-blue-900/80 hover:bg-blue-800 text-amber-300 border-amber-400/40'
              }`}
              title="Run 10 Automated Vitest Specifications"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Run Vitest Suite</span>
            </button>

            {/* Reset Demo Data Button */}
            <button
              onClick={() => setIsResetConfirmOpen(true)}
              className="p-1.5 rounded-lg bg-blue-900/60 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 border border-blue-700/60 hover:border-rose-500 transition-colors text-xs flex items-center gap-1"
              title="Reset Database to Clean Seed State"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden xl:inline text-[11px]">Reset Demo</span>
            </button>

            {/* User Profile & Login modal trigger */}
            <div className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-lg bg-blue-950 border border-blue-800 text-left">
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-xs">
                {currentUser.name.charAt(0)}
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-bold leading-tight text-white flex items-center gap-1">
                  <span>{currentUser.name}</span>
                </div>
                <div className="text-[10px] text-blue-300 leading-tight">
                  {currentUser.role}
                  {currentUser.ddoIds.length > 0 && ` • DDO ${currentUser.ddoIds[0]}`}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* BODY WITH SIDEBAR AND MAIN CONTENT */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT SIDEBAR */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 shadow-xs hidden md:flex">
          {/* Role Status Banner */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/70">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Active Privilege Tier
            </span>
            <div className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-blue-700" />
              <span>{currentUser.role}</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {currentUser.ddoIds.length > 0 ? (
                <span className="inline-block bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-mono text-[11px] border border-blue-200">
                  DDO: {currentUser.ddoIds.join(', ')}
                </span>
              ) : (
                <span className="text-slate-400 text-[11px]">Departmental Authority</span>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-800 font-bold border-l-4 border-blue-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span className={isActive ? 'text-blue-700' : 'text-slate-400'}>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Sidebar Footer Info */}
          <div className="p-4 border-t border-slate-100 bg-slate-50 text-xs text-slate-500">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-700">Workflow:</span>
              <span className="text-emerald-700 font-medium">
                {workflowConfig?.verifierEnabled ? '2-Tier (Verifier + Approver)' : '1-Tier (Approver Only)'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] mt-1.5">
              <span className="font-semibold text-slate-700">Storage:</span>
              <span className="font-mono text-slate-600">Supabase</span>
            </div>
            <button
              onClick={() => void signOut()}
              className="mt-3 w-full py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-semibold rounded border border-slate-200 flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
            <button
              onClick={() => onNavigate('test-runner')}
              className="mt-2 w-full py-1.5 px-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-[11px] font-semibold rounded flex items-center justify-center gap-1.5 transition-colors"
            >
              <FlaskConical className="w-3.5 h-3.5 text-blue-700" />
              <span>Verify System Specs</span>
            </button>
          </div>
        </aside>

        {/* MAIN VIEW CONTENT AREA */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">{children}</div>
        </main>
      </div>

      {/* RESET CONFIRMATION MODAL */}
      <Modal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        title="Reset Demo Database"
        subtitle="Restore all seed grants, allocations, bills, and logs"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3 text-xs text-amber-800">
            <AlertOctagon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p>
              This restores departments, grants, DDO caps, bills, and the audit log in Supabase
              to the original GBA Corporation baseline. Sign-in accounts stay in place.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setIsResetConfirmOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                void resetDemoData();
                setIsResetConfirmOpen(false);
                onNavigate('dashboard');
              }}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
            >
              Confirm Reset
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
