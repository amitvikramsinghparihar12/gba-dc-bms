import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';
import {
  Department,
  DDO,
  Vendor,
  User,
  WorkflowConfig,
  AuditLog,
  Role,
} from '../../types';
import { isValidGSTIN, isValidIFSC, isValidDdoId } from '../../utils/validators';
import { Modal } from '../../components/common/Modal';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  Building2,
  Building,
  Briefcase,
  Users,
  Settings,
  FileSpreadsheet,
  Plus,
  Key,
  Download,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  Clock,
  Shield,
  FileText,
  Upload,
} from 'lucide-react';

export const AdminDashboard: React.FC<{ initialTab?: string }> = ({ initialTab = 'departments' }) => {
  const { currentUser, refreshData, addToast, workflowConfig } = useApp();
  const [activeTab, setActiveTab] = useState(initialTab);

  // Data states
  const [departments, setDepartments] = useState<Department[]>([]);
  const [ddos, setDdos] = useState<DDO[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [currentConfig, setCurrentConfig] = useState<WorkflowConfig | null>(workflowConfig);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [isDdoModalOpen, setIsDdoModalOpen] = useState(false);
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [auditDiffLog, setAuditDiffLog] = useState<AuditLog | null>(null);

  // Form states
  const [deptName, setDeptName] = useState('');

  const [ddoId, setDdoId] = useState('');
  const [ddoName, setDdoName] = useState('');
  const [ddoDeptId, setDdoDeptId] = useState('');

  const [vendorName, setVendorName] = useState('');
  const [vendorType, setVendorType] = useState<Vendor['type']>('Contractor');
  const [vendorGstin, setVendorGstin] = useState('');
  const [vendorBank, setVendorBank] = useState('');
  const [vendorAcct, setVendorAcct] = useState('');
  const [vendorIfsc, setVendorIfsc] = useState('');
  const [vendorBranch, setVendorBranch] = useState('');
  const [vendorAddress, setVendorAddress] = useState('');

  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState<Role>('Creator');
  const [userDdoIds, setUserDdoIds] = useState<string[]>([]);
  const [userCreatorIds, setUserCreatorIds] = useState<string[]>([]);

  // Audit search & filter
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('ALL');

  const loadAll = async () => {
    setLoading(true);
    try {
      const [d, doList, v, u, logs, cfg] = await Promise.all([
        api.getDepartments(),
        api.getDDOs(),
        api.getVendors(),
        api.getUsers(),
        api.getAuditLogs(currentUser),
        api.getWorkflowConfig(),
      ]);
      setDepartments(d);
      setDdos(doList);
      setVendors(v);
      setUsers(u);
      setAuditLogs(logs);
      setCurrentConfig(cfg);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error loading admin data', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [currentUser]);

  // Handle Create Department
  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createDepartment(currentUser, { name: deptName });
      addToast({ type: 'success', title: 'Department Created', message: deptName });
      setIsDeptModalOpen(false);
      setDeptName('');
      loadAll();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to create department', message: err.message });
    }
  };

  // Handle Create DDO (6/7 digits check)
  const handleCreateDdo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidDdoId(ddoId)) {
      addToast({
        type: 'warning',
        title: 'Invalid DDO ID',
        message: 'DDO ID must be exactly 6 or 7 digits (e.g. 100234 or 1002345).',
      });
      return;
    }

    try {
      await api.createDDO(currentUser, { id: ddoId, name: ddoName, departmentId: ddoDeptId });
      addToast({ type: 'success', title: 'DDO Registered', message: `DDO ${ddoId} linked to department.` });
      setIsDdoModalOpen(false);
      setDdoId('');
      setDdoName('');
      loadAll();
    } catch (err: any) {
      addToast({ type: 'error', title: 'DDO Creation Failed', message: err.message });
    }
  };

  // Handle Create Vendor (GSTIN & IFSC validation)
  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidGSTIN(vendorGstin)) {
      addToast({
        type: 'warning',
        title: 'Invalid GSTIN',
        message: 'Must follow standard 15-character format (e.g. 29ABCDE1234F1Z5).',
      });
      return;
    }
    if (!isValidIFSC(vendorIfsc)) {
      addToast({
        type: 'warning',
        title: 'Invalid IFSC',
        message: 'Must follow 11-character RBI IFSC pattern (e.g. CNRB0000412).',
      });
      return;
    }

    try {
      await api.createVendor(currentUser, {
        name: vendorName,
        type: vendorType,
        gstin: vendorGstin.trim().toUpperCase(),
        bankName: vendorBank,
        bankAccountNumber: vendorAcct,
        ifsc: vendorIfsc.trim().toUpperCase(),
        branchName: vendorBranch,
        address: vendorAddress,
      });
      addToast({ type: 'success', title: 'Vendor Registered', message: `${vendorName} added to master.` });
      setIsVendorModalOpen(false);
      loadAll();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Vendor Registration Failed', message: err.message });
    }
  };

  // Toggle Vendor Document status (Uploaded / Pending)
  const handleToggleDoc = async (vendorId: string, docName: string) => {
    try {
      await api.toggleVendorDocStatus(currentUser, vendorId, docName);
      addToast({
        type: 'info',
        title: 'Document Status Toggled',
        message: `Updated status for '${docName}'.`,
      });
      loadAll();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to update document', message: err.message });
    }
  };

  // Handle Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createUser(currentUser, {
        name: userName,
        email: userEmail,
        role: userRole,
        ddoIds: userDdoIds,
        creatorIds: userRole === 'Verifier' ? userCreatorIds : undefined,
        active: true,
      });
      addToast({ type: 'success', title: 'User Account Created', message: `${userName} (${userRole})` });
      setIsUserModalOpen(false);
      setUserName('');
      setUserEmail('');
      loadAll();
      refreshData();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to create user', message: err.message });
    }
  };

  // Override Password
  const handleOverridePassword = async (userId: string, targetName: string) => {
    try {
      const res = await api.overridePassword(currentUser, userId);
      addToast({
        type: 'success',
        title: 'Password Overridden & Audited',
        message: res.message,
      });
      loadAll();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Password override failed', message: err.message });
    }
  };

  // Toggle Workflow Verifier Step
  const handleToggleVerifierWorkflow = async () => {
    if (!currentConfig) return;
    try {
      const updated = await api.updateWorkflowConfig(currentUser, {
        verifierEnabled: !currentConfig.verifierEnabled,
      });
      setCurrentConfig(updated);
      addToast({
        type: 'info',
        title: 'Workflow Configuration Updated',
        message: updated.verifierEnabled
          ? 'Two-level approval restored (Verifier then Approver).'
          : 'Verifier step disabled. Bills advance directly to Approver.',
      });
      refreshData();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to update workflow', message: err.message });
    }
  };

  // Export Audit Logs to CSV
  const handleExportAuditCsv = () => {
    const headers = ['Timestamp', 'ActionType', 'User', 'Role', 'EntityType', 'EntityID', 'OldValue', 'NewValue'];
    const rows = auditLogs.map((log) => [
      log.timestamp,
      log.actionType,
      log.userName,
      log.role,
      log.entityType,
      log.entityId,
      JSON.stringify(log.oldValue || {}).replace(/"/g, '""'),
      JSON.stringify(log.newValue || {}).replace(/"/g, '""'),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((x) => `"${x}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GBA_DC_BMS_AuditLog_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast({ type: 'success', title: 'Audit Trail Exported', message: 'CSV downloaded successfully.' });
  };

  // Filtered audit logs
  const filteredAuditLogs = auditLogs.filter((log) => {
    if (auditActionFilter !== 'ALL' && log.actionType !== auditActionFilter) return false;
    if (auditSearch) {
      const q = auditSearch.toLowerCase();
      const match =
        log.entityId.toLowerCase().includes(q) ||
        log.actionType.toLowerCase().includes(q) ||
        log.userName.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Super Administrator Control Directorate
          </h2>
          <p className="text-xs text-slate-500">
            Configure departments, 6/7-digit DDOs, certified vendors, user role mappings, and audit logs.
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold overflow-x-auto">
          {[
            { id: 'departments', label: 'Departments', icon: <Building2 className="w-3.5 h-3.5" /> },
            { id: 'ddos', label: 'DDOs', icon: <Building className="w-3.5 h-3.5" /> },
            { id: 'vendors', label: 'Vendors & Docs', icon: <Briefcase className="w-3.5 h-3.5" /> },
            { id: 'users', label: 'Users & Mappings', icon: <Users className="w-3.5 h-3.5" /> },
            { id: 'workflow', label: 'Workflow', icon: <Settings className="w-3.5 h-3.5" /> },
            { id: 'audit', label: 'Audit Trail', icon: <FileSpreadsheet className="w-3.5 h-3.5" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-blue-800 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 1. DEPARTMENTS TAB */}
      {activeTab === 'departments' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setIsDeptModalOpen(true)}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Department</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b bg-slate-50 text-slate-600 uppercase text-[11px] font-semibold">
                  <th className="py-3 px-4">Department ID</th>
                  <th className="py-3 px-4">Department Name</th>
                  <th className="py-3 px-4">DDOs Associated</th>
                  <th className="py-3 px-4">Created Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {departments.map((d) => {
                  const count = ddos.filter((ddo) => ddo.departmentId === d.id).length;
                  return (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-blue-700">{d.id}</td>
                      <td className="py-3 px-4 font-medium text-slate-900">{d.name}</td>
                      <td className="py-3 px-4">{count} DDOs</td>
                      <td className="py-3 px-4 text-slate-500">{new Date(d.createdAt).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. DDOS TAB */}
      {activeTab === 'ddos' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => {
                setDdoDeptId(departments[0]?.id || '');
                setIsDdoModalOpen(true);
              }}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add New DDO (6/7 Digits)</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b bg-slate-50 text-slate-600 uppercase text-[11px] font-semibold">
                  <th className="py-3 px-4">DDO Code</th>
                  <th className="py-3 px-4">Division Name</th>
                  <th className="py-3 px-4">Parent Department</th>
                  <th className="py-3 px-4">Assigned Creators</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ddos.map((d) => {
                  const dept = departments.find((dp) => dp.id === d.departmentId);
                  const assignedUsers = users.filter((u) => u.ddoIds.includes(d.id));

                  return (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-blue-700">{d.id}</td>
                      <td className="py-3 px-4 font-medium text-slate-900">{d.name}</td>
                      <td className="py-3 px-4">{dept?.name || d.departmentId}</td>
                      <td className="py-3 px-4">
                        {assignedUsers.map((u) => (
                          <span
                            key={u.id}
                            className="inline-block mr-1.5 px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 border"
                          >
                            {u.name} ({u.role})
                          </span>
                        ))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. VENDORS & DOCUMENT CHECKLIST TAB */}
      {activeTab === 'vendors' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setIsVendorModalOpen(true)}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Register New Vendor</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b bg-slate-50 text-slate-600 uppercase text-[11px] font-semibold">
                  <th className="py-3 px-4">Vendor ID</th>
                  <th className="py-3 px-4">Vendor Name & Type</th>
                  <th className="py-3 px-4">GSTIN & Address</th>
                  <th className="py-3 px-4">Bank Details</th>
                  <th className="py-3 px-4">Statutory Document Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vendors.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">{v.id}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{v.name}</div>
                      <span className="text-[10px] text-slate-500 px-1.5 py-0.5 bg-slate-100 rounded">
                        {v.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-mono font-bold text-slate-800">{v.gstin}</div>
                      <div className="text-[11px] text-slate-500 truncate">{v.address}</div>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <div>{v.bankName}</div>
                      <div className="text-[10px] text-slate-500">
                        A/C: {v.bankAccountNumber} • IFSC: {v.ifsc}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1.5">
                        {v.documents.map((doc) => (
                          <div key={doc.name} className="flex items-center justify-between gap-2">
                            <span className="text-[11px] text-slate-600 truncate max-w-[160px]">
                              {doc.name}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <StatusBadge status={doc.status} size="sm" />
                              <button
                                onClick={() => handleToggleDoc(v.id, doc.name)}
                                className="text-[10px] text-blue-600 hover:underline px-1 py-0.5 border rounded hover:bg-blue-50"
                                title="Toggle Uploaded / Pending state"
                              >
                                Toggle
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. USERS & MAPPINGS TAB */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setIsUserModalOpen(true)}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create User & Assign DDO</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b bg-slate-50 text-slate-600 uppercase text-[11px] font-semibold">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role Tier</th>
                  <th className="py-3 px-4">Mapped DDO Codes</th>
                  <th className="py-3 px-4">Verifier Mapped Creators</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{u.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{u.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 border text-slate-800">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {u.ddoIds.length > 0 ? u.ddoIds.join(', ') : 'All / None'}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {u.creatorIds && u.creatorIds.length > 0
                        ? u.creatorIds.join(', ')
                        : '-'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOverridePassword(u.id, u.name)}
                        className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border rounded text-[11px] font-semibold flex items-center gap-1 ml-auto"
                        title="Audited password reset link"
                      >
                        <Key className="w-3.5 h-3.5 text-amber-600" />
                        <span>Override Password</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. WORKFLOW CONFIGURATION TAB */}
      {activeTab === 'workflow' && currentConfig && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs max-w-2xl space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Approval Pipeline Workflow Rules
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Configure verification stages, mandatory remark thresholds, and financial year settings.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            {/* Toggle Verifier Stage */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 block">
                  Two-Level Approval: Technical Verifier Stage
                </span>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  When enabled, Creator submits to Verifier first, who then passes to Approver.
                  If disabled, bills skip scrutiny and go directly to Approver.
                </p>
              </div>

              <button
                type="button"
                onClick={handleToggleVerifierWorkflow}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  currentConfig.verifierEnabled ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    currentConfig.verifierEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Read-only system rules */}
            <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
              <span className="font-bold text-blue-900 block uppercase tracking-wider text-[11px]">
                Enforced System Business Invariants
              </span>
              <ul className="list-disc list-inside space-y-1 text-blue-800 text-[11px]">
                <li>Budget reservation occurs at Creator submission using <strong>Gross Value</strong>.</li>
                <li>Rejection/Reverting immediately releases reserved budget back to the DDO.</li>
                <li>Mandatory rejection remarks length threshold: <strong>10 characters minimum</strong>.</li>
                <li>RTGS batch creation operates as an atomic transaction across all selected bills.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 6. IMMUTABLE AUDIT TRAIL TAB */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search audit trail..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-3">
              <select
                value={auditActionFilter}
                onChange={(e) => setAuditActionFilter(e.target.value)}
                className="text-xs px-3 py-1.5 border rounded-lg bg-slate-50 font-medium"
              >
                <option value="ALL">All Action Types</option>
                <option value="BILL_SUBMITTED">BILL_SUBMITTED</option>
                <option value="BILL_VERIFIED">BILL_VERIFIED</option>
                <option value="BILL_APPROVED">BILL_APPROVED</option>
                <option value="BILL_REJECTED_BY_VERIFIER">BILL_REJECTED_BY_VERIFIER</option>
                <option value="RTGS_BATCH_GENERATED">RTGS_BATCH_GENERATED</option>
                <option value="GRANT_CREATED">GRANT_CREATED</option>
                <option value="DDO_ALLOCATION_UPDATED">DDO_ALLOCATION_UPDATED</option>
              </select>

              <button
                onClick={handleExportAuditCsv}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b bg-slate-50 text-slate-600 uppercase text-[11px] font-semibold">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Action Type</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4">Entity</th>
                    <th className="py-3 px-4 text-right">JSON Diff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[10px]">
                          {log.actionType}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{log.userName}</div>
                        <div className="text-[10px] text-slate-400">{log.role}</div>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {log.entityType}: <span className="font-bold text-slate-800">{log.entityId}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setAuditDiffLog(log)}
                          className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border rounded text-[11px] font-semibold"
                        >
                          View Diff
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredAuditLogs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        No audit events matching criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CREATE DEPARTMENT MODAL */}
      <Modal
        isOpen={isDeptModalOpen}
        onClose={() => setIsDeptModalOpen(false)}
        title="Add Department"
        maxWidth="md"
      >
        <form onSubmit={handleCreateDept} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Department Name *
            </label>
            <input
              type="text"
              value={deptName}
              onChange={(e) => setDeptName(e.target.value)}
              placeholder="e.g. Urban Water & Sewerage Division"
              className="w-full p-2 border rounded-lg text-xs"
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsDeptModalOpen(false)}
              className="px-3 py-1.5 border rounded-lg"
            >
              Cancel
            </button>
            <button type="submit" className="px-4 py-1.5 bg-blue-700 text-white font-bold rounded-lg">
              Save Department
            </button>
          </div>
        </form>
      </Modal>

      {/* CREATE DDO MODAL */}
      <Modal
        isOpen={isDdoModalOpen}
        onClose={() => setIsDdoModalOpen(false)}
        title="Register New DDO"
        subtitle="Requires 6 or 7-digit code & Department association"
        maxWidth="md"
      >
        <form onSubmit={handleCreateDdo} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              DDO Code (6 or 7 Digits) *
            </label>
            <input
              type="text"
              pattern="[0-9]{6,7}"
              value={ddoId}
              onChange={(e) => setDdoId(e.target.value)}
              placeholder="e.g. 100234 or 1002345"
              className="w-full p-2 border rounded-lg font-mono font-bold"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Division Name *
            </label>
            <input
              type="text"
              value={ddoName}
              onChange={(e) => setDdoName(e.target.value)}
              placeholder="e.g. Executive Engineer - Road Infrastructure"
              className="w-full p-2 border rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Parent Department *
            </label>
            <select
              value={ddoDeptId}
              onChange={(e) => setDdoDeptId(e.target.value)}
              className="w-full p-2 border rounded-lg bg-white"
              required
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.id})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsDdoModalOpen(false)}
              className="px-3 py-1.5 border rounded-lg"
            >
              Cancel
            </button>
            <button type="submit" className="px-4 py-1.5 bg-blue-700 text-white font-bold rounded-lg">
              Save DDO
            </button>
          </div>
        </form>
      </Modal>

      {/* CREATE VENDOR MODAL */}
      <Modal
        isOpen={isVendorModalOpen}
        onClose={() => setIsVendorModalOpen(false)}
        title="Register Certified Vendor"
        subtitle="Validates 15-digit GSTIN and 11-digit IFSC"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateVendor} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Vendor Enterprise Name *</label>
              <input
                type="text"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                className="w-full p-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Vendor Type *</label>
              <select
                value={vendorType}
                onChange={(e) => setVendorType(e.target.value as any)}
                className="w-full p-2 border rounded-lg bg-white"
              >
                <option value="Contractor">Contractor</option>
                <option value="Supplier">Supplier</option>
                <option value="Consultant">Consultant</option>
                <option value="Service Provider">Service Provider</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">GSTIN (15 Alphanumeric) *</label>
              <input
                type="text"
                value={vendorGstin}
                onChange={(e) => setVendorGstin(e.target.value.toUpperCase())}
                placeholder="29ABCDE1234F1Z5"
                className="w-full p-2 border rounded-lg font-mono font-bold"
                required
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Bank Name *</label>
              <input
                type="text"
                value={vendorBank}
                onChange={(e) => setVendorBank(e.target.value)}
                placeholder="Canara Bank / HDFC"
                className="w-full p-2 border rounded-lg"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold mb-1">Bank Account Number *</label>
              <input
                type="text"
                value={vendorAcct}
                onChange={(e) => setVendorAcct(e.target.value)}
                className="w-full p-2 border rounded-lg font-mono"
                required
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">IFSC Code (11 Chars) *</label>
              <input
                type="text"
                value={vendorIfsc}
                onChange={(e) => setVendorIfsc(e.target.value.toUpperCase())}
                placeholder="CNRB0000412"
                className="w-full p-2 border rounded-lg font-mono font-bold"
                required
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Branch Name</label>
              <input
                type="text"
                value={vendorBranch}
                onChange={(e) => setVendorBranch(e.target.value)}
                className="w-full p-2 border rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1">Registered Business Address</label>
            <textarea
              value={vendorAddress}
              onChange={(e) => setVendorAddress(e.target.value)}
              rows={2}
              className="w-full p-2 border rounded-lg"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsVendorModalOpen(false)}
              className="px-3 py-1.5 border rounded-lg"
            >
              Cancel
            </button>
            <button type="submit" className="px-4 py-1.5 bg-blue-700 text-white font-bold rounded-lg">
              Save Vendor
            </button>
          </div>
        </form>
      </Modal>

      {/* CREATE USER MODAL */}
      <Modal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        title="Create User Account"
        subtitle="Assign role tier and mapped DDO operational scope"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Official Name *</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full p-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Govt Email *</label>
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="w-full p-2 border rounded-lg"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1">Role Tier *</label>
            <select
              value={userRole}
              onChange={(e) => setUserRole(e.target.value as Role)}
              className="w-full p-2 border rounded-lg bg-white font-bold"
            >
              <option value="Super Admin">Super Admin</option>
              <option value="Director of Finance">Director of Finance</option>
              <option value="Finance Officer">Finance Officer</option>
              <option value="Creator">Creator</option>
              <option value="Verifier">Verifier</option>
              <option value="Approver">Approver</option>
              <option value="RTGS Manager">RTGS Manager</option>
            </select>
          </div>

          {['Creator', 'Verifier', 'Approver'].includes(userRole) && (
            <div>
              <label className="block font-semibold mb-1">
                Select Mapped DDOs (Strict Isolation Scope) *
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto border p-2 rounded-lg bg-slate-50">
                {ddos.map((d) => {
                  const checked = userDdoIds.includes(d.id);
                  return (
                    <label key={d.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setUserDdoIds((prev) =>
                            checked ? prev.filter((id) => id !== d.id) : [...prev, d.id]
                          );
                        }}
                        className="rounded text-blue-600"
                      />
                      <span className="font-mono">{d.id}</span> ({d.name.substring(0, 15)}...)
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsUserModalOpen(false)}
              className="px-3 py-1.5 border rounded-lg"
            >
              Cancel
            </button>
            <button type="submit" className="px-4 py-1.5 bg-blue-700 text-white font-bold rounded-lg">
              Create User
            </button>
          </div>
        </form>
      </Modal>

      {/* AUDIT DIFF MODAL */}
      {auditDiffLog && (
        <Modal
          isOpen={!!auditDiffLog}
          onClose={() => setAuditDiffLog(null)}
          title={`Audit Log Record: ${auditDiffLog.id}`}
          subtitle={`${auditDiffLog.actionType} by ${auditDiffLog.userName} (${auditDiffLog.role})`}
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs font-mono">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg overflow-x-auto">
                <span className="font-bold text-rose-900 block mb-1">Old State:</span>
                <pre className="text-[11px] text-rose-800">
                  {JSON.stringify(auditDiffLog.oldValue, null, 2) || 'null (Newly Created)'}
                </pre>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg overflow-x-auto">
                <span className="font-bold text-emerald-900 block mb-1">New State:</span>
                <pre className="text-[11px] text-emerald-800">
                  {JSON.stringify(auditDiffLog.newValue, null, 2)}
                </pre>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 font-sans">
              Recorded at: {new Date(auditDiffLog.timestamp).toISOString()} • Immutable Append-Only Ledger
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
