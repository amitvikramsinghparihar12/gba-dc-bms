import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';
import { Bill, Vendor, RtgsBatch, CorporateBankAccount } from '../../types';
import { formatINR, numberToIndianWords } from '../../utils/calc';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { BusyOverlay, PageLoader } from '../../components/common/PageLoader';
import {
  CreditCard,
  Printer,
  CheckCircle2,
  Calendar,
  Building,
  History,
  FileCheck2,
  CheckSquare,
  Square,
  Search,
  Filter,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

export const RtgsManager: React.FC = () => {
  const { currentUser, addToast } = useApp();
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

  const [pendingBills, setPendingBills] = useState<Bill[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [bankAccounts, setBankAccounts] = useState<CorporateBankAccount[]>([]);
  const [pastBatches, setPastBatches] = useState<RtgsBatch[]>([]);
  const [loading, setLoading] = useState(true);

  // Selection & Filters
  const [selectedBillIds, setSelectedBillIds] = useState<string[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [ddoFilter, setDdoFilter] = useState('ALL');

  // Confirmation & Generated Batch Preview Modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeAdviceBatch, setActiveAdviceBatch] = useState<{
    batch: RtgsBatch;
    bills: Bill[];
    bankAccount: CorporateBankAccount;
  } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allBills, allVendors, banks, batches] = await Promise.all([
        api.getBills(currentUser, { status: 'Pending RTGS' }),
        api.getVendors(),
        api.getBankAccounts(),
        api.getRtgsBatches(currentUser),
      ]);
      setPendingBills(allBills);
      setVendors(allVendors);
      setBankAccounts(banks);
      setPastBatches(batches);
      if (banks.length > 0 && !selectedBankId) {
        setSelectedBankId(banks[0].id);
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error loading RTGS data', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    setSelectedBillIds([]);
  }, [currentUser]);

  // Filtered bills
  const filteredBills = useMemo(() => {
    return pendingBills.filter((b) => {
      if (ddoFilter !== 'ALL' && b.ddoId !== ddoFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const v = vendors.find((vend) => vend.id === b.vendorId);
        const match =
          b.id.toLowerCase().includes(q) ||
          b.workOrderNo.toLowerCase().includes(q) ||
          (v && v.name.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [pendingBills, ddoFilter, searchQuery, vendors]);

  // Selected bills running total
  const selectedBills = pendingBills.filter((b) => selectedBillIds.includes(b.id));
  const runningTotalPayable = selectedBills.reduce((acc, b) => acc + b.netPayable, 0);

  // Toggle selection
  const handleToggleBill = (id: string) => {
    setSelectedBillIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Toggle select all on page
  const handleToggleSelectAll = () => {
    if (selectedBillIds.length === filteredBills.length) {
      setSelectedBillIds([]);
    } else {
      setSelectedBillIds(filteredBills.map((b) => b.id));
    }
  };

  // Generate RTGS Advice
  const handleGenerateAdvice = async () => {
    if (selectedBillIds.length === 0) {
      addToast({
        type: 'warning',
        title: 'No Bills Selected',
        message: 'Please select at least one bill to generate an RTGS batch.',
      });
      return;
    }
    if (!selectedBankId) {
      addToast({
        type: 'warning',
        title: 'Bank Account Required',
        message: 'Please choose an authorized GBA corporate debit bank account.',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const batch = await api.generateRtgsAdvice(currentUser, selectedBillIds, selectedBankId);
      addToast({
        type: 'success',
        title: 'RTGS Advice Generated',
        message: `Batch ${batch.id} generated for ${formatINR(batch.totalAmount)}. Selected bills marked Paid.`,
      });

      // Load batch details for instant print preview
      const adviceData = await api.getRtgsBatchById(currentUser, batch.id);
      setActiveAdviceBatch(adviceData);
      setShowConfirmModal(false);
      setSelectedBillIds([]);
      loadData();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Batch Generation Failed', message: err.message });
    } finally {
      setIsGenerating(false);
    }
  };

  // View past batch
  const handleViewPastBatch = async (batchId: string) => {
    setLoading(true);
    try {
      const adviceData = await api.getRtgsBatchById(currentUser, batchId);
      setActiveAdviceBatch(adviceData);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Could not load batch', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const selectedBank = bankAccounts.find((b) => b.id === selectedBankId);

  if (loading) return <PageLoader label="Loading RTGS advice…" />;

  return (
    <>
      {isGenerating && <BusyOverlay label="Generating RTGS advice…" />}
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            RTGS Bank Advice & Electronic Disbursement Portal
          </h2>
          <p className="text-xs text-slate-500">
            Batch approved contingent bills into official corporate RTGS letters for municipal bank execution.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'pending'
                ? 'bg-white text-blue-800 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pending Release ({pendingBills.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'history'
                ? 'bg-white text-blue-800 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            RTGS History & Batches ({pastBatches.length})
          </button>
        </div>
      </div>

      {activeTab === 'pending' ? (
        <div className="space-y-4">
          {/* Action & Filter Strip */}
          <div className="bg-slate-900 text-white p-4 rounded-xl shadow-md border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Running Selection Counter */}
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-600/30 rounded-xl border border-purple-400/30">
                <CreditCard className="w-6 h-6 text-purple-300" />
              </div>
              <div>
                <span className="text-xs text-purple-200 block font-medium">
                  {selectedBillIds.length} of {pendingBills.length} Bills Selected
                </span>
                <span className="text-xl font-black font-mono text-emerald-400">
                  {formatINR(runningTotalPayable)}
                </span>
                <span className="text-[11px] text-slate-300 ml-2">Total Net Disbursement</span>
              </div>
            </div>

            {/* Bank Account Picker & Advice Button */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="text-xs">
                <label className="block text-slate-300 text-[11px] font-semibold mb-1">
                  Corporate Debit Account:
                </label>
                <select
                  value={selectedBankId}
                  onChange={(e) => setSelectedBankId(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bankName} - {b.accountNumber} ({b.branch})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={selectedBillIds.length === 0}
                className={`sm:self-end px-5 py-2.5 rounded-lg text-xs font-bold shadow-md flex items-center justify-center gap-2 transition-transform active:scale-95 ${
                  selectedBillIds.length === 0
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    : 'bg-purple-600 hover:bg-purple-500 text-white'
                }`}
              >
                <Printer className="w-4 h-4" />
                <span>Generate RTGS Advice</span>
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search vendor, WO, bill..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={handleToggleSelectAll}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 flex items-center gap-1.5"
              >
                {selectedBillIds.length === filteredBills.length && filteredBills.length > 0 ? (
                  <>
                    <CheckSquare className="w-4 h-4 text-purple-600" />
                    <span>Deselect All</span>
                  </>
                ) : (
                  <>
                    <Square className="w-4 h-4 text-slate-400" />
                    <span>Select All ({filteredBills.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={
                          selectedBillIds.length === filteredBills.length && filteredBills.length > 0
                        }
                        onChange={handleToggleSelectAll}
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                      />
                    </th>
                    <th className="py-3.5 px-4">Bill ID</th>
                    <th className="py-3.5 px-4">DDO</th>
                    <th className="py-3.5 px-4">Beneficiary Vendor</th>
                    <th className="py-3.5 px-4">Vendor Bank & IFSC</th>
                    <th className="py-3.5 px-4">Work Order</th>
                    <th className="py-3.5 px-4 text-right">Gross Value</th>
                    <th className="py-3.5 px-4 text-right">Net Payable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredBills.map((bill) => {
                    const vendor = vendors.find((v) => v.id === bill.vendorId);
                    const isChecked = selectedBillIds.includes(bill.id);

                    return (
                      <tr
                        key={bill.id}
                        onClick={() => handleToggleBill(bill.id)}
                        className={`cursor-pointer transition-colors ${
                          isChecked ? 'bg-purple-50/70 hover:bg-purple-100/70' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleBill(bill.id)}
                            className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                          />
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-blue-700">{bill.id}</td>
                        <td className="py-3 px-4 font-mono text-slate-600">{bill.ddoId}</td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{vendor?.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            A/C: {vendor?.bankAccountNumber}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800">{vendor?.bankName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            IFSC: {vendor?.ifsc}
                          </div>
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate">{bill.workOrderNo}</td>
                        <td className="py-3 px-4 text-right font-mono">{formatINR(bill.grossValue)}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                          {formatINR(bill.netPayable)}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredBills.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No pending RTGS bills found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* RTGS HISTORY TAB */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Batch ID</th>
                  <th className="py-3.5 px-4">Date Generated</th>
                  <th className="py-3.5 px-4">Corporate Debit Bank</th>
                  <th className="py-3.5 px-4 text-center">Beneficiaries</th>
                  <th className="py-3.5 px-4 text-right">Total Batch Amount</th>
                  <th className="py-3.5 px-4">Generated By</th>
                  <th className="py-3.5 px-4 text-right">Print Advice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {pastBatches.map((batch) => {
                  const bank = bankAccounts.find((b) => b.id === batch.bankAccountId);
                  return (
                    <tr key={batch.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-purple-700">{batch.id}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {new Date(batch.generatedAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{bank?.bankName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {bank?.accountNumber}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-bold">
                        {batch.beneficiaryCount} Bills
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                        {formatINR(batch.totalAmount)}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{batch.generatedByName}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleViewPastBatch(batch.id)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 ml-auto"
                        >
                          <Printer className="w-3.5 h-3.5 text-blue-700" />
                          <span>View & Reprint</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {pastBatches.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No RTGS batches generated yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONFIRMATION BEFORE ADVICE GENERATION */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm RTGS Batch Generation"
        subtitle="This action will finalize selected bills into a bank advice"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs text-slate-700">
          <p>
            You are about to generate an official RTGS Advice batch for{' '}
            <strong>{selectedBillIds.length} bills</strong> totaling{' '}
            <strong className="text-emerald-700 font-mono text-sm">{formatINR(runningTotalPayable)}</strong>.
          </p>

          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg space-y-1">
            <span className="text-[11px] font-bold text-purple-900 uppercase tracking-wider block">
              Debit Bank Account:
            </span>
            <div className="font-bold text-slate-900">{selectedBank?.bankName}</div>
            <div className="font-mono text-[11px] text-slate-600">
              A/C No: {selectedBank?.accountNumber} • IFSC: {selectedBank?.ifsc}
            </div>
          </div>

          <p className="text-[11px] text-slate-500">
            * Once generated, each bill status will transition to <strong>Paid</strong> and be linked
            permanently to the batch reference.
          </p>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              onClick={() => setShowConfirmModal(false)}
              className="px-4 py-2 border rounded-lg font-semibold text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerateAdvice}
              disabled={isGenerating}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold shadow-xs transition-colors"
            >
              {isGenerating ? 'Generating...' : 'Confirm & Generate Advice'}
            </button>
          </div>
        </div>
      </Modal>

      {/* PRINT-READY GBA CORPORATION BANK ADVICE MODAL */}
      {activeAdviceBatch && (
        <Modal
          isOpen={!!activeAdviceBatch}
          onClose={() => setActiveAdviceBatch(null)}
          title={`RTGS Bank Advice: ${activeAdviceBatch.batch.id}`}
          subtitle="Print-ready corporate advice letter for scheduled bank RTGS dispatch"
          maxWidth="5xl"
        >
          <div className="space-y-6">
            {/* Print trigger button */}
            <div className="flex items-center justify-between bg-slate-100 p-3 rounded-lg border border-slate-300 print:hidden">
              <span className="text-xs text-slate-600">
                Click below to open system print dialog or save as PDF. Formatted with official government letterhead.
              </span>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg text-xs flex items-center gap-2 shadow-xs transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Print / Save as PDF</span>
              </button>
            </div>

            {/* PRINTABLE LETTERHEAD CONTENT */}
            <div className="p-8 bg-white border border-slate-300 rounded-xl shadow-xs text-slate-900 print:p-0 print:border-none print:shadow-none space-y-6 printable-advice">
              {/* LETTERHEAD */}
              <div className="text-center border-b-2 border-slate-900 pb-4">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Government of Karnataka Undertaking
                </div>
                <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase mt-0.5">
                  Greater Bengaluru Authority (GBA Corporation)
                </h1>
                <p className="text-xs text-slate-600">
                  Central Municipal Finance & Treasury Operations Directorate, N.R. Square, Bengaluru - 560002
                </p>
                <div className="text-[11px] font-mono text-slate-500 mt-1">
                  Phone: 080-22221188 • Email: treasury.rtgs@gba.karnataka.gov.in
                </div>
              </div>

              {/* METADATA BAR */}
              <div className="flex justify-between items-start text-xs font-mono">
                <div>
                  <div><strong>Advice Ref No:</strong> {activeAdviceBatch.batch.id}</div>
                  <div>
                    <strong>Date of Issue:</strong>{' '}
                    {new Date(activeAdviceBatch.batch.generatedAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </div>
                </div>

                <div className="text-right">
                  <div><strong>Dispatch Mode:</strong> Electronic RTGS / NEFT Core Banking</div>
                  <div><strong>Financial Year:</strong> 2025-26</div>
                </div>
              </div>

              {/* TO THE BRANCH MANAGER */}
              <div className="text-xs leading-relaxed space-y-1">
                <div>To,</div>
                <div className="font-bold">The Branch Manager,</div>
                <div>{activeAdviceBatch.bankAccount.bankName},</div>
                <div>{activeAdviceBatch.bankAccount.branch}.</div>
              </div>

              {/* SUBJECT */}
              <div className="text-xs font-bold text-slate-900 bg-slate-100 p-2.5 rounded border border-slate-200">
                Subject: Authorization for electronic RTGS payment debit against GBA Corporation Account No:{' '}
                <span className="font-mono">{activeAdviceBatch.bankAccount.accountNumber}</span>.
              </div>

              <p className="text-xs leading-relaxed text-slate-700">
                Sir / Madam,
                <br />
                Please arrange to debit our <strong>{activeAdviceBatch.bankAccount.accountType}</strong> No:{' '}
                <span className="font-mono font-bold">{activeAdviceBatch.bankAccount.accountNumber}</span> (IFSC:{' '}
                <span className="font-mono font-bold">{activeAdviceBatch.bankAccount.ifsc}</span>) for the total sum
                of <strong>{formatINR(activeAdviceBatch.batch.totalAmount)}</strong> and credit the respective beneficiary
                bank accounts as tabulated below towards contingent work order settlements:
              </p>

              {/* BENEFICIARY TABLE */}
              <div className="border border-slate-300 rounded overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                    <tr>
                      <th className="py-2 px-3 text-center">S.No</th>
                      <th className="py-2 px-3">Beneficiary Vendor Name</th>
                      <th className="py-2 px-3">Bank Name & Branch</th>
                      <th className="py-2 px-3 font-mono">Beneficiary A/C No</th>
                      <th className="py-2 px-3 font-mono">IFSC Code</th>
                      <th className="py-2 px-3">Bill ID(s)</th>
                      <th className="py-2 px-3 text-right">Net Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {activeAdviceBatch.bills.map((bill, index) => {
                      const vendor = vendors.find((v) => v.id === bill.vendorId);
                      return (
                        <tr key={bill.id}>
                          <td className="py-2 px-3 text-center font-mono">{index + 1}</td>
                          <td className="py-2 px-3 font-semibold">{vendor?.name || bill.vendorId}</td>
                          <td className="py-2 px-3">{vendor?.bankName}</td>
                          <td className="py-2 px-3 font-mono">{vendor?.bankAccountNumber}</td>
                          <td className="py-2 px-3 font-mono font-bold">{vendor?.ifsc}</td>
                          <td className="py-2 px-3 font-mono">{bill.id}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold">
                            {formatINR(bill.netPayable)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-900">
                    <tr>
                      <td colSpan={6} className="py-2.5 px-3 text-right uppercase">
                        Total Payable Sum:
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-sm text-slate-900">
                        {formatINR(activeAdviceBatch.batch.totalAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* AMOUNT IN WORDS */}
              <div className="p-3 bg-slate-50 border border-slate-300 rounded text-xs space-y-1">
                <span className="text-[11px] text-slate-500 uppercase font-bold tracking-wider block">
                  Amount in Words (Indian System):
                </span>
                <div className="font-extrabold text-slate-900 text-sm">
                  {numberToIndianWords(activeAdviceBatch.batch.totalAmount)}
                </div>
              </div>

              {/* DUAL AUTHORIZATION SIGNATURE BLOCKS */}
              <div className="pt-12 grid grid-cols-2 gap-8 text-xs">
                <div className="text-center">
                  <div className="w-48 border-t-2 border-slate-800 mx-auto pt-2 font-bold text-slate-900">
                    Senior Accounts Officer
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Treasury & Disbursements Wing, GBA
                  </div>
                </div>

                <div className="text-center">
                  <div className="w-48 border-t-2 border-slate-800 mx-auto pt-2 font-bold text-slate-900">
                    Finance Controller / Commissioner
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Greater Bengaluru Authority (GBA)
                  </div>
                </div>
              </div>

              {/* FOOTER NOTICE */}
              <div className="text-[10px] text-slate-400 text-center pt-4 border-t border-slate-200">
                Official Computer-Generated Advice Document • Generated by {activeAdviceBatch.batch.generatedByName} on{' '}
                {new Date(activeAdviceBatch.batch.generatedAt).toLocaleString()}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
    </>
  );
};
