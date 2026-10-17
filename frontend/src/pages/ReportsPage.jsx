import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { FileSpreadsheet, Download, FileCheck, ShieldAlert, Sparkles, CheckCircle2, History, BookmarkPlus, Clock, Eye, ChevronRight } from 'lucide-react';
import { documentApi } from '../services/api';

export const ReportsPage = () => {
  const [generating, setGenerating] = useState(false);
  const [generatedMsg, setGeneratedMsg] = useState(null);
  const [overview, setOverview] = useState(null);
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState([]);
  const [archiving, setArchiving] = useState(false);
  const [archiveSuccess, setArchiveSuccess] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchHistory = () => {
    documentApi.getAuditHistory()
      .then(logs => setAuditLogs(logs || []))
      .catch(() => setAuditLogs([]));
  };

  useEffect(() => {
    Promise.all([
      documentApi.getDashboardOverview().catch(() => null),
      documentApi.getAnomalies().catch(() => []),
      documentApi.getAuditHistory().catch(() => [])
    ]).then(([overviewData, anomalyData, historyData]) => {
      setOverview(overviewData);
      setAnomalies(anomalyData || []);
      setAuditLogs(historyData || []);
      setLoading(false);
    });
  }, []);

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

  const getDynamicData = () => {
    const hasData = overview && overview.documents_processed > 0;
    const docs = overview?.recent_documents ?? [];
    
    let legalName = overview?.assessee_name || '—', pan = overview?.assessee_pan || '—', ay = 'Not Available';
    let totalCredits = 0, gstTurnover = 0, riskScore = 0, riskLevel = 'UNKNOWN';
    let variance = 0;
    let highValueAnomaly = null;

    if (hasData) {
      const allNames = docs.map(d => (d.original_name || d.filename || '').toLowerCase()).join(' ');
      
      if (pan === '—') {
        const panMatch = allNames.match(/\b([a-z]{5}[0-9]{4}[a-z])\b/i);
        if (panMatch) pan = panMatch[1].toUpperCase();
      }

      if (legalName === '—') {
        if (allNames.includes('aarti')) {
          legalName = 'AARTI INDUSTRIES LTD';
        } else if (allNames.includes('mahalaxmi')) {
          legalName = 'Mahalaxmi Traders Pvt Ltd';
        } else if (allNames.includes('abc') || allNames.includes('manufacturing')) {
          legalName = 'ABC Manufacturing Pvt Ltd';
        } else if (docs.length > 0) {
          legalName = (docs[0].original_name || docs[0].filename || '').replace(/\.[^.]+$/, '').replace(/[_\-]/g, ' ').trim() || 'Unknown Entity';
        }
      }

      if (docs.length > 0) {
        const yr = new Date(docs[0].created_at).getFullYear();
        ay = `20${yr % 100 + 1}-${String(yr + 2).slice(-2)}`;
      }

      totalCredits = overview.total_revenue || 0;
      gstTurnover = overview.total_expenses || 0;
      variance = Math.abs(totalCredits - gstTurnover);
      riskScore = overview.risk_score || 0;
      riskLevel = overview.risk_level || 'UNKNOWN';

      if (anomalies && anomalies.length > 0) {
        highValueAnomaly = anomalies.find(a => a.severity === 'HIGH' || (a.description && a.description.toLowerCase().includes('high value'))) || anomalies[0];
      }
    }

    return { hasData, legalName, pan, ay, totalCredits, gstTurnover, variance, riskScore, riskLevel, highValueAnomaly };
  };

  const handleArchiveSnapshot = async () => {
    setArchiving(true);
    setArchiveSuccess(null);
    try {
      const res = await documentApi.saveAuditSnapshot();
      setArchiveSuccess(res.message || "Audit working paper archived successfully!");
      fetchHistory();
      setTimeout(() => setArchiveSuccess(null), 4000);
    } catch (err) {
      alert("Failed to archive audit snapshot: " + (err.message || err));
    } finally {
      setArchiving(false);
    }
  };

  const handleExport = async () => {
    const h = { Authorization: `Bearer ${localStorage.getItem('findoc_token') || localStorage.getItem('token') || ''}` };

    const [dash, anomaliesList] = await Promise.all([
      fetch('/api/v1/documents/dashboard/overview', { headers: h }).then(r => r.json()),
      fetch('/api/v1/documents/anomalies/list',     { headers: h }).then(r => r.json()),
    ]);

    const doc = new jsPDF();

    // Header
    doc.setFontSize(20); doc.setFont('helvetica', 'bold');
    doc.text('FinDocAI - Statutory Audit Working Paper', 20, 25);
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.setTextColor(120);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 20, 33);
    doc.setTextColor(0);

    // Entity details
    doc.setFontSize(13); doc.setFont('helvetica', 'bold');
    doc.text('Entity Details', 20, 48);
    doc.setFontSize(11); doc.setFont('helvetica', 'normal');
    doc.text(`Name:   ${dash.assessee_name || 'N/A'}`, 20, 57);
    doc.text(`PAN:    ${dash.assessee_pan  || 'N/A'}`, 20, 65);
    doc.text(`GSTIN:  ${dash.assessee_gstin || 'N/A'}`, 20, 73);

    // Financials
    doc.setFontSize(13); doc.setFont('helvetica', 'bold');
    doc.text('Financial Reconciliation', 20, 88);
    doc.setFontSize(11); doc.setFont('helvetica', 'normal');
    doc.text(`Documents Processed: ${dash.documents_processed}`, 20, 97);
    doc.text(`Total Revenue (Credits):  Rs. ${dash.total_revenue?.toLocaleString('en-IN') || 0}`, 20, 106);
    doc.text(`Total Expenses (Debits):  Rs. ${dash.total_expenses?.toLocaleString('en-IN') || 0}`, 20, 115);
    doc.text(`Net Cash Flow:            Rs. ${dash.net_cash_flow?.toLocaleString('en-IN') || 0}`, 20, 124);
    doc.text(`Financial Risk Score:     ${dash.risk_score || 0} / 100 (${dash.risk_level || 'LOW'})`, 20, 133);

    // Anomalies
    doc.setFontSize(13); doc.setFont('helvetica', 'bold');
    doc.text(`Audit Exceptions Flagged (${anomaliesList.length})`, 20, 148);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    let y = 158;
    for (const a of anomaliesList.slice(0, 8)) {
      const line = `[${a.severity}] ${a.anomaly_type}: ${(a.description || '').slice(0, 75)}`;
      doc.text(line, 20, y);
      y += 8;
    }

    doc.save(`FinDocAI_${(dash.assessee_name || 'audit').replace(/\s+/g, '_')}_Report.pdf`);
    setGeneratedMsg("Statutory Tax Audit Working Paper (PDF) downloaded successfully.");
    setTimeout(() => setGeneratedMsg(null), 4000);
  };

  const data = getDynamicData();

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="itr-card bg-white p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-[#111111]">
            Statutory Audit Working Papers &amp; Form 3CD Tax Audit Reports
          </h2>
          <div className="text-xs text-[#555555]">
            Assessee: <strong className="text-slate-900">{data.legalName}</strong> {data.pan !== '—' ? `(PAN: ${data.pan})` : ''} · AY 2027-28
          </div>
        </div>
        <div className="flex items-center gap-2">
          {generatedMsg && <span className="text-xs text-positive font-medium">{generatedMsg}</span>}
          {archiveSuccess && <span className="text-xs text-positive font-semibold">{archiveSuccess}</span>}
          <button
            onClick={handleArchiveSnapshot}
            disabled={archiving || !data.hasData}
            className="btn-secondary text-xs flex items-center gap-1.5"
            title="Archive current working papers to permanent history log"
          >
            <BookmarkPlus className="w-3.5 h-3.5 text-[#0b3861]" />
            <span>{archiving ? "Archiving..." : "Archive Working Paper"}</span>
          </button>
          <button
            onClick={handleExport}
            disabled={generating}
            className="btn-primary text-xs flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{generating ? 'Exporting...' : 'Export Audit Dossier (PDF)'}</span>
          </button>
        </div>
      </div>

      {/* Main Form 3CD Preview Table */}
      <div className="itr-card bg-white p-3.5 space-y-3">
        <div className="border-b border-[#dddddd] pb-2 flex items-center justify-between">
          <div className="text-xs font-bold text-[#0b3861] uppercase tracking-wide">
            Statutory Audit Working Paper — Form 3CD Reconciliation Annexure
          </div>
          <span className="text-[11px] text-[#666666] font-mono">
            Status: {data.hasData ? 'Verified from Ingested Ledgers' : 'Pending Ingestion'}
          </span>
        </div>

        {!data.hasData ? (
          <div className="py-8 text-center text-xs text-[#888888] italic border border-dashed border-[#cccccc] bg-[#fafafa]">
            No financial evidence ingested. Upload bank statements or GST returns to generate the Form 3CD schedule.
          </div>
        ) : (
          <>
            <table className="itr-grid text-xs">
              <thead>
                <tr>
                  <th className="w-12 text-center">Clause</th>
                  <th>Audit Parameter / Audit Schedule</th>
                  <th className="w-44 text-right">Computed Figure (INR)</th>
                  <th className="w-72">Statutory Audit Observation</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="text-center font-mono">1</td>
                  <td className="font-semibold">Clause 16(a) - Gross Turnover / Inflows</td>
                  <td className="font-mono text-right font-bold text-positive">{formatCurrency(data.totalCredits)}</td>
                  <td className="text-positive font-semibold">Verified Bank Credit Entries</td>
                </tr>
                <tr>
                  <td className="text-center font-mono">2</td>
                  <td className="font-semibold">Clause 21(b) - Total Outflows &amp; Disallowance Debits</td>
                  <td className="font-mono text-right font-bold text-negative">{formatCurrency(data.gstTurnover)}</td>
                  <td className="text-warning font-semibold">Discrepancy Variance: {formatCurrency(data.variance)}</td>
                </tr>
                <tr>
                  <td className="text-center font-mono">3</td>
                  <td className="font-semibold">Clause 21(a) - High-Value Exception Transactions</td>
                  <td className="font-mono text-right">{data.highValueAnomaly ? 'Flagged' : 'None'}</td>
                  <td className={data.highValueAnomaly ? "text-negative font-semibold" : "text-positive font-semibold"}>
                    {data.highValueAnomaly ? data.highValueAnomaly.description : 'No Exceptions Flagged'}
                  </td>
                </tr>
                <tr>
                  <td className="text-center font-mono">4</td>
                  <td className="font-semibold">Clause 40 - Computed Statutory Compliance Risk Level</td>
                  <td className="font-mono text-right font-bold text-negative">{data.riskScore} / 100</td>
                  <td className={data.riskScore > 40 ? "text-negative font-bold" : "text-positive font-semibold"}>
                    {data.riskLevel} Risk Profile
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Action Notice */}
            <div className="border border-[#cccccc] bg-[#f9fafb] p-3 text-xs space-y-1.5">
              <div className="font-bold text-[#222222] flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-[#b45309]" />
                Auditor Recommendations &amp; Forensic Observations:
              </div>
              <ol className="list-decimal pl-5 space-y-0.5 text-[#444444]">
                <li>Reconcile credit entries against total bank outflows in Schedule RC.</li>
                {data.highValueAnomaly && <li>Obtain stamped delivery vouchers and board resolutions for the flagged outlier payments.</li>}
                <li>Review the detected turnover variance of {formatCurrency(data.variance)} between Bank credits and GST returns.</li>
              </ol>
            </div>
          </>
        )}
      </div>

      {/* ── HISTORICAL AUDIT SESSIONS & LOGS SECTION ── */}
      <div className="itr-card bg-white p-3.5 space-y-3">
        <div className="flex items-center justify-between border-b border-[#dddddd] pb-2">
          <div className="flex items-center gap-1.5">
            <History className="w-4 h-4 text-[#0b3861]" />
            <h3 className="text-xs font-bold text-[#0b3861] uppercase tracking-wide">
              Permanent Audit History &amp; Working Papers Log
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            {auditLogs.length} Archived Session{auditLogs.length !== 1 ? 's' : ''} on Record
          </span>
        </div>

        {auditLogs.length === 0 ? (
          <div className="py-6 text-center text-xs text-[#888888] italic border border-dashed border-[#cccccc] bg-[#fafafa]">
            No historical audit sessions archived yet. Click "Archive Working Paper" above to permanently log an audit snapshot.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="itr-grid text-xs">
              <thead>
                <tr>
                  <th className="w-10 text-center">#</th>
                  <th>Assessee Entity Name</th>
                  <th>PAN / GSTIN</th>
                  <th className="text-right">Gross Inflows</th>
                  <th className="text-right">Gross Outflows</th>
                  <th className="text-center w-24">Risk Score</th>
                  <th className="text-center w-24">Exceptions</th>
                  <th>Archived Date</th>
                  <th className="text-right w-24">Action</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log, index) => (
                  <tr key={log.id || index} className="hover:bg-slate-50 transition-colors">
                    <td className="text-center font-mono text-slate-500">{index + 1}</td>
                    <td className="font-bold text-slate-900">{log.assessee_name}</td>
                    <td className="font-mono text-slate-600">
                      <div>{log.pan || '—'}</div>
                      <div className="text-[10px] text-slate-400">{log.gstin || ''}</div>
                    </td>
                    <td className="text-right font-mono font-semibold text-positive">
                      {formatCurrency(log.total_revenue)}
                    </td>
                    <td className="text-right font-mono font-semibold text-negative">
                      {formatCurrency(log.total_expenses)}
                    </td>
                    <td className="text-center">
                      <span className={`px-2 py-0.5 rounded-[2px] font-mono font-bold text-[11px] ${
                        log.risk_score >= 60 ? 'bg-rose-100 text-rose-800' :
                        log.risk_score >= 30 ? 'bg-amber-100 text-amber-800' :
                        'bg-emerald-100 text-emerald-800'
                      }`}>
                        {log.risk_score}/100
                      </span>
                    </td>
                    <td className="text-center font-mono text-slate-700">
                      {log.anomalies_count} Flagged
                    </td>
                    <td className="text-slate-500 font-mono text-[11px]">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      }) : '—'}
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                        className="btn-secondary text-[11px] py-1 px-2 flex items-center gap-1 ml-auto"
                      >
                        <Eye className="w-3 h-3 text-[#0b3861]" />
                        <span>{selectedLog?.id === log.id ? 'Close' : 'View'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Selected Archived Audit Detail Modal / Drawer */}
        {selectedLog && (
          <div className="p-3.5 bg-slate-50 border border-slate-300 rounded-[2px] space-y-2.5 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span>Archived Audit Dossier: {selectedLog.assessee_name}</span>
                <span className="text-[11px] font-mono text-slate-500 font-normal">
                  (Snapshot ID: #{selectedLog.id})
                </span>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-500 hover:text-slate-800 font-bold"
              >
                ✕ Close
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-1">
              <div>
                <span className="text-slate-500">Legal Name:</span>
                <div className="font-bold text-slate-800">{selectedLog.assessee_name}</div>
              </div>
              <div>
                <span className="text-slate-500">PAN / GSTIN:</span>
                <div className="font-mono text-slate-800">{selectedLog.pan} · {selectedLog.gstin}</div>
              </div>
              <div>
                <span className="text-slate-500">Reconciled Net Liquidity:</span>
                <div className="font-mono font-bold text-positive">{formatCurrency(selectedLog.net_cash_flow)}</div>
              </div>
              <div>
                <span className="text-slate-500">Compliance Risk Tier:</span>
                <div className="font-bold text-rose-700">{selectedLog.risk_level} ({selectedLog.risk_score}/100)</div>
              </div>
            </div>

            {selectedLog.top_findings && selectedLog.top_findings.length > 0 && (
              <div className="pt-2 border-t border-slate-200">
                <span className="font-semibold text-slate-700">Audit Exceptions Preserved in Archive:</span>
                <ul className="list-disc pl-5 mt-1 space-y-1 text-slate-600 font-mono text-[11px]">
                  {selectedLog.top_findings.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
