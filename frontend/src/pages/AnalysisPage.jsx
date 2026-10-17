import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, RefreshCw, FileText, ArrowRight, ShieldAlert, Layers, ExternalLink } from 'lucide-react';

export default function AnalysisPage() {
  const [crossVerify, setCrossVerify] = useState(null);
  const [dupes, setDupes] = useState([]);
  const [splitPayments, setSplitPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const token = localStorage.getItem('findoc_token') || localStorage.getItem('token') || '';
  const headers = { Authorization: `Bearer ${token}` };

  const fetchAnalysisData = async () => {
    try {
      const [cvRes, dupRes, splitRes] = await Promise.all([
        fetch('/api/v1/analysis/cross-verify', { headers }).then(r => r.json()),
        fetch('/api/v1/analysis/duplicates',   { headers }).then(r => r.json()),
        fetch('/api/v1/analysis/split-payments', { headers }).then(r => r.json()).catch(() => ({ split_payments: [] })),
      ]);
      setCrossVerify(cvRes);
      setDupes(dupRes.duplicates || []);
      setSplitPayments(splitRes.split_payments || []);
    } catch (err) {
      console.error('Error fetching cross-verification data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalysisData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalysisData();
  };

  if (loading) {
    return (
      <div className="p-8 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-[#0b3861] border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xs text-slate-600 font-mono">Running Cross-Document Verification & Multi-source Cross-Matching...</p>
      </div>
    );
  }

  const bankCredits = crossVerify?.bank_credits || 0;
  const gstTurnover = crossVerify?.gst_turnover || 0;
  const invoiceTotal = crossVerify?.invoice_total || 0;
  const bankGstDiff = crossVerify?.bank_gst_diff || 0;
  const hasDiscrepancy = crossVerify?.flag;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Official Audit Header Banner */}
      <div className="bg-[#ffffff] border border-[#cccccc] p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold text-[#0b3861] uppercase tracking-wider">
            Schedule C-VR | Form 3CD Clause 34 &amp; Section 148 Statutory Register
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
            Cross-Document Verification &amp; Reconciliation Register
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Automated three-way statutory audit matching Banking Inflows, GSTR-3B Taxable Turnover, and Tax Invoices.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-secondary text-xs flex items-center gap-1.5 px-3 py-1.5"
            title="Re-run reconciliation analysis"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Re-analyzing...' : 'Refresh Register'}</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: Three-Way Statutory Reconciliation Summary */}
      <div className="itr-card p-5 space-y-5">
        <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-[#0b3861] inline-block"></span>
              Schedule 1: Three-Way Turnover Reconciliation (Bank vs GSTR-3B vs Invoices)
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Assessing undisclosed business receipts and turnover suppression under Section 68 / 148 of Income Tax Act, 1961.
            </p>
          </div>
          {hasDiscrepancy ? (
            <span className="bg-red-100 text-red-800 border border-red-300 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider">
              High Discrepancy Flagged
            </span>
          ) : (
            <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider">
              Reconciled ✓
            </span>
          )}
        </div>

        {/* 3 Metric Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-slate-300 bg-slate-50 p-4">
            <div className="text-[11px] font-bold uppercase text-slate-600 tracking-wide">
              1. Gross Bank Credits
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
              ₹{bankCredits.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-600 mt-1">
              Total credited receipts across verified bank statements
            </div>
          </div>

          <div className="border border-slate-300 bg-slate-50 p-4">
            <div className="text-[11px] font-bold uppercase text-slate-600 tracking-wide">
              2. GSTR-3B Taxable Turnover
            </div>
            <div className="text-2xl font-black text-[#0b3861] mt-1 font-mono">
              ₹{gstTurnover.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-600 mt-1">
              Aggregate outward taxable supply declared to GSTN portal
            </div>
          </div>

          <div className="border border-slate-300 bg-slate-50 p-4">
            <div className="text-[11px] font-bold uppercase text-slate-600 tracking-wide">
              3. Total Billed Invoices
            </div>
            <div className="text-2xl font-black text-slate-800 mt-1 font-mono">
              ₹{invoiceTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-600 mt-1">
              Sum of extracted purchase &amp; sales tax invoices
            </div>
          </div>
        </div>

        {/* Statutory Discrepancy Callout */}
        {hasDiscrepancy ? (
          <div className="border-l-4 border-red-600 bg-red-50 p-4 text-red-950 space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              <strong className="text-sm font-bold text-red-900 uppercase">
                Section 148 / 68 Statutory Discrepancy Detected
              </strong>
            </div>
            <p className="text-xs leading-relaxed text-red-800">
              Gross banking inflows exceed declared GSTR-3B taxable turnover by{' '}
              <strong className="text-red-950 font-bold font-mono">
                ₹{Math.abs(bankGstDiff).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>{' '}
              ({bankCredits > 0 ? ((Math.abs(bankGstDiff) / bankCredits) * 100).toFixed(1) : 0}% unexplained excess credit variance).
              This constitutes prima facie evidence of turnover under-reporting and cash routing warranting statutory notice under Section 148A.
            </p>
          </div>
        ) : (
          <div className="border-l-4 border-emerald-600 bg-emerald-50 p-3 text-emerald-900 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Bank credits align within acceptable tolerance threshold with GST returns and verified invoices.</span>
          </div>
        )}

        {/* Detailed Breakdown Table */}
        <div className="overflow-x-auto">
          <table className="itr-grid text-left">
            <thead>
              <tr>
                <th className="w-12 text-center">Sr.</th>
                <th>Reconciliation Component</th>
                <th>Statutory Evidence Base</th>
                <th className="text-right">Reported Value (₹)</th>
                <th className="text-right">Variance vs Bank (₹)</th>
                <th>Audit Finding / Risk Classification</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="text-center font-mono">01</td>
                <td className="font-semibold text-slate-900">Gross Banking Credits</td>
                <td className="text-slate-600 text-xs">Kotak Mahindra Current A/c Statement</td>
                <td className="text-right font-mono font-bold text-slate-900">
                  ₹{bankCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="text-right font-mono text-slate-500">—</td>
                <td>
                  <span className="text-xs font-semibold text-slate-700">Baseline Inflow Benchmark</span>
                </td>
              </tr>
              <tr>
                <td className="text-center font-mono">02</td>
                <td className="font-semibold text-slate-900">GSTR-3B Taxable Turnover</td>
                <td className="text-slate-600 text-xs">Table 3.1(a) Outward Taxable Supplies</td>
                <td className="text-right font-mono font-bold text-[#0b3861]">
                  ₹{gstTurnover.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="text-right font-mono font-bold text-red-700">
                  -₹{Math.abs(bankCredits - gstTurnover).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td>
                  <span className="text-xs font-bold text-red-700">
                    {bankCredits > gstTurnover ? 'Suppression of Sales / Turnover Gap' : 'Turnover Reconciled'}
                  </span>
                </td>
              </tr>
              <tr>
                <td className="text-center font-mono">03</td>
                <td className="font-semibold text-slate-900">Verified Invoice Vouchers</td>
                <td className="text-slate-600 text-xs">Extracted Tax Invoices &amp; Debit Notes</td>
                <td className="text-right font-mono font-bold text-slate-800">
                  ₹{invoiceTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="text-right font-mono font-bold text-red-700">
                  -₹{Math.abs(bankCredits - invoiceTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td>
                  <span className="text-xs font-bold text-amber-700">
                    Unsubstantiated Banking Credits (Missing Invoices)
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: Duplicate Invoices & Circular Billing Register */}
      <div className="itr-card p-5 space-y-4">
        <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-red-600 inline-block"></span>
              Schedule 2: Duplicate Invoices &amp; Circular Claim Register
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Identifies circular vouchers, repeated invoice numbers, and identical billing amounts under Section 16(2) CGST Act.
            </p>
          </div>
          {dupes.length > 0 ? (
            <span className="bg-red-100 text-red-800 border border-red-300 px-2 py-0.5 text-xs font-bold uppercase tracking-wider">
              {dupes.length} Duplicate Entry Flagged
            </span>
          ) : (
            <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 text-xs font-bold uppercase tracking-wider">
              0 Duplicates ✓
            </span>
          )}
        </div>

        {dupes.length === 0 ? (
          <div className="p-4 bg-slate-50 border border-slate-200 text-slate-600 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>No duplicate invoices or circular vouchers identified across the uploaded document register.</span>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="border-l-4 border-amber-600 bg-amber-50 p-3 text-amber-950 text-xs">
              <strong>Audit Observation:</strong> Duplicate invoice vouchers detected with identical serial numbers and exact billing sums. 
              Dual entry inflates expenditure deductions and creates ineligible Input Tax Credit (ITC) claims.
            </div>

            <div className="overflow-x-auto">
              <table className="itr-grid text-left">
                <thead>
                  <tr>
                    <th className="w-12 text-center">Sr.</th>
                    <th>Original Reference</th>
                    <th>Duplicate Reference</th>
                    <th>Vendor Legal Entity</th>
                    <th>Voucher Date</th>
                    <th className="text-right">Billed Amount (₹)</th>
                    <th>Forensic Detection Rationale</th>
                  </tr>
                </thead>
                <tbody>
                  {dupes.map((d, idx) => (
                    <tr key={idx}>
                      <td className="text-center font-mono font-bold text-slate-700">
                        {String(idx + 1).padStart(2, '0')}
                      </td>
                      <td className="font-mono font-bold text-[#0b3861]">
                        {d.original}
                      </td>
                      <td className="font-mono font-bold text-red-700">
                        {d.duplicate}
                      </td>
                      <td className="font-semibold text-slate-900">
                        {d.vendor}
                      </td>
                      <td className="font-mono text-slate-700">
                        {d.date || '—'}
                      </td>
                      <td className="text-right font-mono font-bold text-red-700">
                        ₹{Number(d.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="text-xs text-red-800 font-medium">
                        {d.reason || 'Identical invoice number and exact billed amount (potential circular voucher)'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3: Split Payments & Smurfing Structuring Register */}
      <div className="itr-card p-5 space-y-4">
        <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-amber-600 inline-block"></span>
              Schedule 3: Structured Split Payments &amp; Threshold Avoidance Register
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Identifies repetitive structured transfers below statutory reporting ceilings under Section 40A(3) and Rule 6DD.
            </p>
          </div>
          {splitPayments.length > 0 ? (
            <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 text-xs font-bold uppercase tracking-wider">
              {splitPayments.length} Structuring Pattern Detected
            </span>
          ) : (
            <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 text-xs font-bold uppercase tracking-wider">
              No Structuring Detected ✓
            </span>
          )}
        </div>

        {splitPayments.length === 0 ? (
          <div className="p-4 bg-slate-50 border border-slate-200 text-slate-600 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>No structured split payments or threshold avoidance patterns detected in verified banking logs.</span>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="border-l-4 border-amber-600 bg-amber-50 p-3 text-amber-950 text-xs">
              <strong>Statutory Finding:</strong> Multiple debits issued to the same beneficiary in rapid succession right below 
              statutory reporting thresholds (e.g. ₹5,00,000 / ₹10,000). Indicates deliberate transaction structuring (smurfing).
            </div>

            <div className="overflow-x-auto">
              <table className="itr-grid text-left">
                <thead>
                  <tr>
                    <th className="w-12 text-center">Sr.</th>
                    <th>Beneficiary / Narration</th>
                    <th>Execution Dates</th>
                    <th className="text-right">Split Leg Values (₹)</th>
                    <th className="text-right">Cumulative Value (₹)</th>
                    <th>Statutory Non-Compliance Classification</th>
                  </tr>
                </thead>
                <tbody>
                  {splitPayments.map((sp, idx) => (
                    <tr key={idx}>
                      <td className="text-center font-mono font-bold text-slate-700">
                        {String(idx + 1).padStart(2, '0')}
                      </td>
                      <td className="font-semibold text-slate-900 font-mono text-xs">
                        {sp.description}
                      </td>
                      <td className="font-mono text-xs text-slate-700">
                        {sp.transactions?.map(t => t.date).filter(Boolean).join(', ') || 'Consecutive'}
                      </td>
                      <td className="text-right font-mono text-xs text-slate-800">
                        {sp.transactions?.map(t => `₹${Number(t.amount || 0).toLocaleString('en-IN')}`).join(' + ')}
                      </td>
                      <td className="text-right font-mono font-bold text-red-700">
                        ₹{Number(sp.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="text-xs text-amber-800 font-medium">
                        Structured Split Debits (Section 40A(3) Disallowance Exposure)
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Statutory Footer Citation */}
      <div className="text-[11px] text-slate-500 border-t border-slate-200 pt-3 flex flex-wrap items-center justify-between gap-2">
        <span>Verified under FinDocAI Statutory Cross-Document Verification Engine v2.4</span>
        <span className="font-mono">CBDT RMS Rules: Section 68 / 148 / 40A(3) / 16(2) CGST</span>
      </div>
    </div>
  );
}

export { AnalysisPage };
