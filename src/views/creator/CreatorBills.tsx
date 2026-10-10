import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';
import { Bill, Vendor, DdoAllocation, BillDeduction, BillAttachment } from '../../types';
import { calculateBillFinancials, formatINR, round2 } from '../../utils/calc';
import { STANDARD_DEDUCTIONS } from '../../config/config';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import {
  FileText,
  Plus,
  Search,
  Filter,
  AlertCircle,
  CheckCircle2,
  Paperclip,
  Upload,
  Trash2,
  Calculator,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  FileCheck,
  Calendar,
  Building2,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface CreatorBillsProps {
  initialOpenCreate?: boolean;
}

export const CreatorBills: React.FC<CreatorBillsProps> = ({ initialOpenCreate = false }) => {
  const { currentUser, addToast } = useApp();
  const [bills, setBills] = useState<Bill[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [allocations, setAllocations] = useState<DdoAllocation[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDdo, setSelectedDdo] = useState(currentUser.ddoIds[0] || '');

  // Form Modal State
  const [isModalOpen, setIsModalOpen] = useState(initialOpenCreate);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [showDeductionsGrid, setShowDeductionsGrid] = useState(true);

  // Form Fields
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [workOrderNo, setWorkOrderNo] = useState('');
  const [workOrderDate, setWorkOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [agreementNo, setAgreementNo] = useState('');
  const [description, setDescription] = useState('');
  const [baseValue, setBaseValue] = useState<number>(0);
  const [cgst, setCgst] = useState<number>(0);
  const [sgst, setSgst] = useState<number>(0);
  const [igst, setIgst] = useState<number>(0);

  // 16 Deductions
  const [deductions, setDeductions] = useState<BillDeduction[]>(
    STANDARD_DEDUCTIONS.map((lbl, idx) => ({ id: idx + 1, label: lbl, amount: 0 }))
  );

  // Attachments
  const [attachments, setAttachments] = useState<BillAttachment[]>([]);
  const [mockFileName, setMockFileName] = useState('');

  // Selected Bill for History/Details View
  const [viewingBill, setViewingBill] = useState<Bill | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [b, v, a] = await Promise.all([
        api.getBills(currentUser),
        api.getVendors(),
        api.getDdoAllocations(currentUser),
      ]);
      setBills(b);
      setVendors(v);
      setAllocations(a);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to load bills', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (currentUser.ddoIds.length > 0) {
      setSelectedDdo(currentUser.ddoIds[0]);
    }
  }, [currentUser]);

  // Current active DDO allocation
  const currentAllocation = allocations.find((a) => a.ddoId === selectedDdo);
  const selectedVendor = vendors.find((v) => v.id === selectedVendorId);

  // Live Financial Calculation
  const financials = useMemo(() => {
    return calculateBillFinancials({
      baseValue,
      cgst,
      sgst,
      igst,
      deductions,
    });
  }, [baseValue, cgst, sgst, igst, deductions]);

  // Live Budget Check
  const availableRemaining = currentAllocation ? currentAllocation.remaining : 0;
  // If editing a bill that is already draft or rejected, remaining is currently intact
  const remainingAfterBill = round2(availableRemaining - financials.grossValue);
  const isBudgetExceeded = financials.grossValue > availableRemaining;

  // Open Form for New Bill
  const handleOpenNew = () => {
    setEditingBill(null);
    setSelectedVendorId(vendors[0]?.id || '');
    setWorkOrderNo(`WO/GBA/${selectedDdo}/${new Date().getFullYear()}/${Math.floor(100 + Math.random() * 900)}`);
    setWorkOrderDate(new Date().toISOString().split('T')[0]);
    setAgreementNo(`AGR/${new Date().getFullYear()}/${Math.floor(10 + Math.random() * 90)}`);
    setDescription('');
    setBaseValue(500000);
    setCgst(45000); // 9%
    setSgst(45000); // 9%
    setIgst(0);
    setDeductions(
      STANDARD_DEDUCTIONS.map((lbl, idx) => {
        let amt = 0;
        if (idx === 0) amt = 11800; // 2% TDS
        if (idx === 1) amt = 11800; // 2% GST TDS
        if (idx === 2) amt = 5900;  // 1% Cess
        if (idx === 3) amt = 29500; // 5% SD
        return { id: idx + 1, label: lbl, amount: amt };
      })
    );
    setAttachments([
      { id: 'att-init-1', name: 'Measurement_Book_Scanned_Copy.pdf', size: '2.4 MB', uploadedAt: new Date().toISOString() },
      { id: 'att-init-2', name: 'Work_Completion_Certificate_Signed.pdf', size: '1.2 MB', uploadedAt: new Date().toISOString() },
    ]);
    setIsModalOpen(true);
  };

  // Open Form for Editing/Resubmitting
  const handleEditBill = (bill: Bill) => {
    setEditingBill(bill);
    setSelectedDdo(bill.ddoId);
    setSelectedVendorId(bill.vendorId);
    setWorkOrderNo(bill.workOrderNo);
    setWorkOrderDate(bill.workOrderDate);
    setAgreementNo(bill.agreementNo);
    setDescription(bill.description);
    setBaseValue(bill.baseValue);
    setCgst(bill.cgst);
    setSgst(bill.sgst);
    setIgst(bill.igst);
    setDeductions(bill.deductions);
    setAttachments(bill.attachments);
    setIsModalOpen(true);
  };

  // Update deduction amount
  const handleDeductionChange = (idx: number, amount: number) => {
    setDeductions((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], amount: isNaN(amount) ? 0 : amount };
      return copy;
    });
  };

  // Mock Attachment Upload
  const handleAddAttachment = () => {
    if (!mockFileName.trim()) return;
    const newAtt: BillAttachment = {
      id: `att-${Date.now()}`,
      name: mockFileName.trim().endsWith('.pdf') ? mockFileName.trim() : `${mockFileName.trim()}.pdf`,
      size: `${(Math.random() * 3 + 0.5).toFixed(1)} MB`,
      uploadedAt: new Date().toISOString(),
    };
    setAttachments((prev) => [...prev, newAtt]);
    setMockFileName('');
  };

  // Remove Attachment
  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Save Draft
  const handleSaveDraft = async () => {
    setIsSubmitting(true);
    try {
      await api.saveDraftBill(currentUser, {
        id: editingBill?.id,
        ddoId: selectedDdo,
        vendorId: selectedVendorId,
        workOrderNo,
        workOrderDate,
        agreementNo,
        description,
        baseValue,
        cgst,
        sgst,
        igst,
        deductions,
        attachments,
      });
      addToast({
        type: 'success',
        title: 'Draft Saved Successfully',
        message: 'You can modify and submit this bill whenever ready.',
      });
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to Save Draft', message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit for Verification
  const handleSubmitVerification = async () => {
    setIsSubmitting(true);
    try {
      await api.submitBill(currentUser, {
        id: editingBill?.id,
        ddoId: selectedDdo,
        vendorId: selectedVendorId,
        workOrderNo,
        workOrderDate,
        agreementNo,
        description,
        baseValue,
        cgst,
        sgst,
        igst,
        deductions,
        attachments,
      });

      addToast({
        type: 'success',
        title: 'Bill Submitted for Verification',
        message: `Gross amount ${formatINR(financials.grossValue)} has been reserved against DDO ${selectedDdo}.`,
      });
      setShowConfirmSubmit(false);
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Submission Blocked',
        message: err.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered bills
  const filteredBills = bills.filter((b) => {
    if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        b.id.toLowerCase().includes(q) ||
        b.workOrderNo.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        b.vendorId.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900">My Contingent (DC) Bills</h2>
          <p className="text-xs text-slate-500">
            Create, verify calculations, monitor DDO budget reservation, and track approval states.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {currentUser.ddoIds.length > 1 && (
            <select
              value={selectedDdo}
              onChange={(e) => setSelectedDdo(e.target.value)}
              className="text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg bg-slate-50"
            >
              {currentUser.ddoIds.map((id) => (
                <option key={id} value={id}>
                  Filter DDO {id}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleOpenNew}
            className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-2 transition-transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create New DC Bill</span>
          </button>
        </div>
      </div>

      {/* DDO Allocation Status Header Bar */}
      {currentAllocation && (
        <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white p-4 rounded-xl shadow-xs border border-blue-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/30 rounded-lg border border-blue-400/30">
              <Building2 className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <div className="text-[11px] text-blue-200 uppercase font-semibold tracking-wider">
                Active Operational Budget Head
              </div>
              <div className="text-sm font-bold">
                DDO {currentAllocation.ddoId} • FY 2025-26
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 font-mono text-xs">
            <div>
              <span className="text-[11px] text-blue-300 block">Total Allocated</span>
              <span className="font-bold">{formatINR(currentAllocation.allocated)}</span>
            </div>
            <div>
              <span className="text-[11px] text-amber-300 block">Utilized (Gross)</span>
              <span className="font-bold text-amber-200">{formatINR(currentAllocation.utilized)}</span>
            </div>
            <div className="pl-4 border-l border-blue-800">
              <span className="text-[11px] text-emerald-300 block">Available Balance</span>
              <span className="font-extrabold text-emerald-300 text-sm">
                {formatINR(currentAllocation.remaining)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Bill ID, WO #, Vendor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          {['ALL', 'Draft', 'Pending Verification', 'Pending Approval', 'Pending RTGS', 'Paid', 'Rejected'].map(
            (status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {status}
              </button>
            )
          )}
        </div>
      </div>

      {/* Bills Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Bill ID</th>
                <th className="py-3.5 px-4">Vendor & Details</th>
                <th className="py-3.5 px-4">Work Order / Agreement</th>
                <th className="py-3.5 px-4 text-right">Base Value</th>
                <th className="py-3.5 px-4 text-right">Gross Value</th>
                <th className="py-3.5 px-4 text-right">Deductions</th>
                <th className="py-3.5 px-4 text-right">Net Payable</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredBills.map((bill) => {
                const vendor = vendors.find((v) => v.id === bill.vendorId);
                const isRejected = bill.status === 'Rejected';
                const isDraft = bill.status === 'Draft';

                return (
                  <tr key={bill.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">
                      {bill.id}
                      <span className="block text-[10px] text-slate-400 font-normal font-sans">
                        {new Date(bill.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{vendor?.name || bill.vendorId}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        GST: {vendor?.gstin || 'N/A'}
                      </div>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-medium text-slate-900">{bill.workOrderNo}</div>
                      <div className="text-[11px] text-slate-500 truncate" title={bill.description}>
                        {bill.description}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono">{formatINR(bill.baseValue)}</td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-blue-800">
                      {formatINR(bill.grossValue)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-rose-600">
                      -{formatINR(bill.totalDeductions)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatINR(bill.netPayable)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={bill.status} size="sm" />
                      {isRejected && (
                        <div className="text-[10px] text-rose-600 mt-1 font-semibold">
                          Reverted with remarks
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => setViewingBill(bill)}
                        className="px-2 py-1 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-[11px] font-semibold"
                      >
                        Details
                      </button>

                      {isDraft && (
                        <button
                          onClick={() => handleEditBill(bill)}
                          className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[11px] font-bold"
                        >
                          Edit & Submit
                        </button>
                      )}

                      {isRejected && (
                        <button
                          onClick={() => handleEditBill(bill)}
                          className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded text-[11px] font-bold"
                          title="View Rejection Remarks and Resubmit"
                        >
                          Edit & Resubmit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredBills.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No bills found matching your current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT BILL COMPREHENSIVE MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBill ? `Edit DC Bill (${editingBill.id})` : 'New Contingent (DC) Bill Preparation'}
        subtitle="Enforces 16 statutory deductions, GST tax calculations, and real-time DDO budget validation"
        maxWidth="5xl"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT 8 COLS: FORM INPUTS */}
          <div className="lg:col-span-8 space-y-6">
            {/* Show Rejection remarks if editing a rejected bill */}
            {editingBill?.status === 'Rejected' && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
                <div className="flex items-center gap-2 text-xs font-bold text-rose-800 mb-1">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>Rejection / Revert Remarks from Scrutiny Authority:</span>
                </div>
                <p className="text-xs text-rose-700 italic bg-white p-3 rounded-lg border border-rose-100">
                  {editingBill.history[editingBill.history.length - 1]?.remarks ||
                    'Discrepancies found in measurements or documents.'}
                </p>
                <p className="text-[11px] text-slate-500 mt-2">
                  * Note: Budget reserved for this bill was released upon rejection. Submitting will re-check and reserve the gross amount.
                </p>
              </div>
            )}

            {/* SECTION 1: DDO & VENDOR DETAILS */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                  1
                </span>
                <span>DDO & Vendor Particulars</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Operating DDO Code (Locked)
                  </label>
                  <input
                    type="text"
                    value={`DDO ${selectedDdo}`}
                    disabled
                    className="w-full px-3 py-2 text-xs bg-slate-200 border border-slate-300 rounded-lg text-slate-700 font-mono font-bold cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Registered Vendor *
                  </label>
                  <select
                    value={selectedVendorId}
                    onChange={(e) => setSelectedVendorId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  >
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.gstin})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Vendor Bank Autofill details */}
              {selectedVendor && (
                <div className="bg-white p-3 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">Bank & Branch</span>
                    <span className="font-semibold text-slate-800">
                      {selectedVendor.bankName} - {selectedVendor.branchName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Account Number</span>
                    <span className="font-mono font-bold text-slate-800">
                      {selectedVendor.bankAccountNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">IFSC Code</span>
                    <span className="font-mono font-bold text-slate-800">
                      {selectedVendor.ifsc}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 2: WORK ORDER & AGREEMENT */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                  2
                </span>
                <span>Work Order & Contract Details</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Work Order No. *
                  </label>
                  <input
                    type="text"
                    value={workOrderNo}
                    onChange={(e) => setWorkOrderNo(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 font-mono"
                    placeholder="WO/GBA/..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Work Order Date *
                  </label>
                  <input
                    type="date"
                    value={workOrderDate}
                    onChange={(e) => setWorkOrderDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Agreement No. *
                  </label>
                  <input
                    type="text"
                    value={agreementNo}
                    onChange={(e) => setAgreementNo(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 font-mono"
                    placeholder="AGR/2025/..."
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Scope of Work / Description *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Detailed description of goods/services provided and MB reference..."
                  required
                />
              </div>
            </div>

            {/* SECTION 3: BASE FINANCIALS & TAXES */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                  3
                </span>
                <span>Base Value & GST Schedule</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Base Value (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={baseValue}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setBaseValue(val);
                      // Auto calculate 9% CGST and 9% SGST
                      setCgst(round2(val * 0.09));
                      setSgst(round2(val * 0.09));
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    CGST (₹) @ 9%
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={cgst}
                    onChange={(e) => setCgst(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-mono focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    SGST (₹) @ 9%
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={sgst}
                    onChange={(e) => setSgst(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-mono focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    IGST (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={igst}
                    onChange={(e) => setIgst(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-mono focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg flex items-center justify-between text-xs font-semibold text-blue-900">
                <span>Calculated Gross Value (Base + Taxes):</span>
                <span className="font-mono text-sm font-bold">{formatINR(financials.grossValue)}</span>
              </div>
            </div>

            {/* SECTION 4: 16 DEDUCTIONS HEADS */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                    4
                  </span>
                  <span>16 Statutory Deductions Schedule</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setShowDeductionsGrid(!showDeductionsGrid)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                >
                  {showDeductionsGrid ? (
                    <>
                      <span>Collapse 16 Rows</span>
                      <ChevronUp className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      <span>Expand 16 Rows</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>

              {showDeductionsGrid && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto p-1 border rounded-lg bg-white">
                  {deductions.map((ded, idx) => (
                    <div
                      key={ded.id}
                      className="p-2 border border-slate-100 rounded-lg bg-slate-50/50 flex items-center justify-between gap-2"
                    >
                      <span
                        className="text-[11px] font-medium text-slate-700 truncate max-w-[200px]"
                        title={ded.label}
                      >
                        {idx + 1}. {ded.label}
                      </span>
                      <div className="relative w-32 shrink-0">
                        <span className="absolute left-2 top-1.5 text-[10px] text-slate-400">₹</span>
                        <input
                          type="number"
                          min="0"
                          value={ded.amount || ''}
                          placeholder="0.00"
                          onChange={(e) => handleDeductionChange(idx, parseFloat(e.target.value) || 0)}
                          className="w-full pl-5 pr-2 py-1 text-xs text-right border border-slate-300 rounded bg-white font-mono"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold text-rose-900">
                <span>Total Statutory Deductions:</span>
                <span className="font-mono text-sm font-bold">
                  -{formatINR(financials.totalDeductions)}
                </span>
              </div>
            </div>

            {/* SECTION 5: ATTACHMENTS */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                  5
                </span>
                <span>Supporting Proofs & Measurement Books (Attachments)</span>
              </h4>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Third_Party_Quality_Test_Report.pdf"
                  value={mockFileName}
                  onChange={(e) => setMockFileName(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                />
                <button
                  type="button"
                  onClick={handleAddAttachment}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Attach Document</span>
                </button>
              </div>

              {/* Chips */}
              <div className="flex flex-wrap gap-2 pt-1">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs shadow-2xs"
                  >
                    <Paperclip className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="font-medium text-slate-800">{att.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">({att.size})</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(att.id)}
                      className="text-slate-400 hover:text-rose-600 ml-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT 4 COLS: STICKY BUDGET WIDGET & LIVE CALCULATOR */}
          <div className="lg:col-span-4 space-y-4">
            {/* LIVE FINANCIAL CALCULATOR */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3 sticky top-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 pb-2 border-b border-slate-100">
                <Calculator className="w-4 h-4 text-blue-700" />
                <span>Financial Calculator</span>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between text-slate-600">
                  <span>Base Value:</span>
                  <span>{formatINR(financials.baseValue)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>CGST (9%):</span>
                  <span>{formatINR(financials.cgst)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>SGST (9%):</span>
                  <span>{formatINR(financials.sgst)}</span>
                </div>
                {financials.igst > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>IGST:</span>
                    <span>{formatINR(financials.igst)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-blue-900 pt-1.5 border-t border-slate-100">
                  <span>Gross Value:</span>
                  <span>{formatINR(financials.grossValue)}</span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>Total Deductions:</span>
                  <span>-{formatINR(financials.totalDeductions)}</span>
                </div>
                <div className="flex justify-between font-extrabold text-sm text-emerald-800 pt-2 border-t-2 border-slate-200">
                  <span>Net Payable:</span>
                  <span>{formatINR(financials.netPayable)}</span>
                </div>
              </div>

              {!financials.isValid && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-semibold">
                  {financials.error}
                </div>
              )}

              {/* STICKY BUDGET WIDGET */}
              <div
                className={`p-4 rounded-xl border transition-all mt-4 ${
                  isBudgetExceeded
                    ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    DDO Budget Impact
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-600">
                    DDO {selectedDdo}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-slate-600">
                    <span>Granted / Allocated:</span>
                    <span>{formatINR(currentAllocation?.allocated)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Currently Utilized:</span>
                    <span>{formatINR(currentAllocation?.utilized)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-slate-800">
                    <span>Current Remaining:</span>
                    <span>{formatINR(availableRemaining)}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
                    <span>Remaining After Bill:</span>
                    <span className={isBudgetExceeded ? 'text-rose-600 font-black' : 'text-emerald-700'}>
                      {formatINR(remainingAfterBill)}
                    </span>
                  </div>
                </div>

                {/* EXACT REQUIRED BUDGET ERROR BANNER */}
                {isBudgetExceeded && (
                  <div className="mt-3 p-3 bg-rose-600 text-white rounded-lg text-xs font-black flex items-start gap-2 animate-bounce">
                    <ShieldAlert className="w-5 h-5 shrink-0" />
                    <div>
                      <div className="uppercase tracking-wide">Insufficient DDO Budget Balance.</div>
                      <div className="text-[10px] font-normal mt-0.5 text-rose-100">
                        Gross amount ({formatINR(financials.grossValue)}) exceeds available DDO balance (
                        {formatINR(availableRemaining)}).
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ACTION BUTTONS */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmSubmit(true)}
                  disabled={isBudgetExceeded || !financials.isValid || isSubmitting}
                  className={`w-full py-2.5 px-4 rounded-lg text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-all ${
                    isBudgetExceeded || !financials.isValid || isSubmitting
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-98'
                  }`}
                >
                  <FileCheck className="w-4 h-4" />
                  <span>
                    {isBudgetExceeded ? 'Blocked by Budget Limit' : 'Submit for Verification'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isSubmitting}
                  className="w-full py-2 px-4 rounded-lg text-xs font-semibold border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 transition-colors"
                >
                  Save as Draft
                </button>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* CONFIRMATION MODAL BEFORE SUBMIT */}
      <Modal
        isOpen={showConfirmSubmit}
        onClose={() => setShowConfirmSubmit(false)}
        title="Confirm Bill Submission"
        subtitle="This action will reserve DDO budget immediately"
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-700 leading-relaxed">
            Are you sure you want to submit this bill for technical verification?
          </p>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs space-y-1 font-mono">
            <div>Gross Value to Reserve: <strong>{formatINR(financials.grossValue)}</strong></div>
            <div>Net Payable: <strong>{formatINR(financials.netPayable)}</strong></div>
            <div>Vendor: <strong>{selectedVendor?.name}</strong></div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setShowConfirmSubmit(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitVerification}
              disabled={isSubmitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
            >
              {isSubmitting ? 'Reserving & Submitting...' : 'Yes, Confirm & Submit'}
            </button>
          </div>
        </div>
      </Modal>

      {/* BILL DETAILS / TIMELINE MODAL */}
      {viewingBill && (
        <Modal
          isOpen={!!viewingBill}
          onClose={() => setViewingBill(null)}
          title={`Bill Record: ${viewingBill.id}`}
          subtitle={`DDO ${viewingBill.ddoId} • Current Status: ${viewingBill.status}`}
          maxWidth="3xl"
        >
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border text-xs">
              <div>
                <span className="text-slate-400 block">Work Order</span>
                <span className="font-bold">{viewingBill.workOrderNo}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Gross Value</span>
                <span className="font-bold font-mono text-blue-700">
                  {formatINR(viewingBill.grossValue)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Deductions</span>
                <span className="font-bold font-mono text-rose-600">
                  -{formatINR(viewingBill.totalDeductions)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Net Payable</span>
                <span className="font-bold font-mono text-emerald-700">
                  {formatINR(viewingBill.netPayable)}
                </span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Lifecycle Audit Timeline
              </h4>
              <div className="space-y-3 border-l-2 border-blue-600 pl-4">
                {viewingBill.history.map((h, i) => (
                  <div key={h.id || i} className="text-xs relative">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-white" />
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{h.status}</span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(h.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5">
                      By: <strong>{h.userName}</strong> ({h.userRole})
                    </div>
                    {h.remarks && (
                      <div className="p-2 bg-slate-100 rounded text-slate-700 mt-1 italic text-[11px]">
                        "{h.remarks}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
