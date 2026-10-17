import React, { useState, useEffect } from 'react';
import { AlertTriangle, AlertCircle, Info, RefreshCw, Filter, CheckCircle2, ShieldAlert, FileText, ArrowRight } from 'lucide-react';
import { documentApi } from '../services/api';

export const AnomaliesPage = () => {
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState('ALL');

  const fetchAnomalies = async () => {
    setLoading(true);
    try {
      const data = await documentApi.getAnomalies();
      setAnomalies(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load anomalies:', err);
      setAnomalies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnomalies();
  }, []);

  const normalizeSeverity = (sev) => {
    const s = (sev || '').toUpperCase().trim();
    if (s === 'MED' || s === 'MEDIUM') return 'MEDIUM';
    if (s === 'HIGH' || s === 'CRITICAL') return 'HIGH';
    if (s === 'LOW') return 'LOW';
    return s || 'INFO';
  };

  const filtered = anomalies.filter(a => {
    if (filterSeverity === 'ALL') return true;
    return normalizeSeverity(a.severity) === filterSeverity;
  });

  const highCount = anomalies.filter(a => normalizeSeverity(a.severity) === 'HIGH').length;
  const medCount = anomalies.filter(a => normalizeSeverity(a.severity) === 'MEDIUM').length;
  const lowCount = anomalies.filter(a => normalizeSeverity(a.severity) === 'LOW').length;

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* Official Audit Register Header */}
      <div className="bg-white border border-[#cccccc] p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold text-[#0b3861] uppercase tracking-wider">
            Schedule E-OUT | Section 148 / 68 Forensic Outlier &amp; Fraud Register
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
            Audit Exceptions &amp; Transaction Outliers
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Forensic discrepancy registry powered by Groq LLM &amp; dynamic historical vendor baseline deviation models.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAnomalies}
            className="btn-secondary text-xs flex items-center gap-1.5 px-3 py-1.5"
            title="Refresh exceptions register"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-700' : ''}`} />
            <span>Refresh Register</span>
          </button>
          <span className={`font-mono text-xs font-bold px-2.5 py-1 border ${
            anomalies.length > 0 ? 'text-red-700 bg-red-50 border-red-300' : 'text-emerald-700 bg-emerald-50 border-emerald-300'
          }`}>
            {anomalies.length} {anomalies.length === 1 ? 'EXCEPTION DETECTED' : 'EXCEPTIONS DETECTED'}
          </span>
        </div>
      </div>

      {/* Filter and Overview Bar */}
      <div className="bg-slate-100 border border-slate-300 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-600" />
          <span className="font-bold text-slate-800">Filter Severity:</span>
          {[
            { key: 'ALL', label: 'ALL', count: anomalies.length },
            { key: 'HIGH', label: 'HIGH', count: highCount },
            { key: 'MEDIUM', label: 'MEDIUM', count: medCount },
            { key: 'LOW', label: 'LOW', count: lowCount },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilterSeverity(key)}
              className={`px-2.5 py-1 text-xs font-mono border transition-colors ${
                filterSeverity === key
                  ? 'bg-[#0b3861] text-white border-[#082845] font-bold shadow-xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {label} {count > 0 && <span className="opacity-90">({count})</span>}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-600 font-mono">
          Showing <strong>{filtered.length}</strong> of <strong>{anomalies.length}</strong> statutory exceptions
        </span>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="bg-white border border-[#cccccc] p-12 text-center text-slate-600 space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#0b3861]" />
          <p className="text-xs font-mono">Executing forensic anomaly detection queries across evidence base...</p>
        </div>
      ) : anomalies.length === 0 ? (
        <div className="itr-card p-10 text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
            No Statutory Exceptions or Fraud Flags Detected
          </h3>
          <p className="text-xs text-slate-600 max-w-lg mx-auto">
            All ingested invoices, bank statements, and tax returns comply with baseline statutory ratios. No circular routing, document type mismatch, or suspicious threshold breaches identified.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="itr-card p-8 text-center text-xs text-slate-600">
          No exceptions match the <strong className="text-slate-900 font-bold">{filterSeverity}</strong> severity filter.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a, idx) => {
            const normSev = normalizeSeverity(a.severity);
            const isHigh = normSev === 'HIGH';
            const isMed = normSev === 'MEDIUM';

            const badgeClass = isHigh
              ? 'bg-red-100 text-red-900 border-red-300 font-bold'
              : isMed
              ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
              : 'bg-sky-100 text-sky-900 border-sky-300 font-semibold';

            const borderLeft = isHigh
              ? 'border-l-red-600'
              : isMed
              ? 'border-l-amber-600'
              : 'border-l-sky-600';

            return (
              <div
                key={a.id || idx}
                className={`bg-white border border-[#cccccc] border-l-4 ${borderLeft} p-4 space-y-2.5 transition-shadow hover:shadow-xs`}
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono px-2 py-0.5 border uppercase ${badgeClass}`}>
                      {normSev} SEVERITY
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                      {a.anomaly_type ? a.anomaly_type.replaceAll('_', ' ') : 'ANOMALY DETECTED'}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                    <span>Record #{a.id}</span>
                    <span>•</span>
                    <span>{a.created_at ? new Date(a.created_at).toLocaleString('en-IN') : 'Audit Session Active'}</span>
                  </div>
                </div>

                {/* Description */}
                <div className="text-xs text-slate-900 font-semibold leading-relaxed">
                  {a.description || 'Statutory outlier flagged during multi-document audit analysis.'}
                </div>

                {/* Explanation / Forensic Evidence */}
                {a.explanation && (
                  <div className="p-2.5 bg-slate-50 border border-slate-200 text-xs text-slate-800 flex items-start gap-2">
                    <Info className="w-4 h-4 text-[#0b3861] shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="font-bold text-slate-900 uppercase text-[11px] tracking-wide">
                        Audit Findings:
                      </span>
                      <div className="font-mono text-xs text-slate-700">
                        {a.explanation}
                      </div>
                    </div>
                  </div>
                )}

                {/* Details Breakdown (if available) */}
                {a.details && Object.keys(a.details).length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1 text-[11px] font-mono">
                    {Object.entries(a.details).map(([key, val]) => (
                      <div key={key} className="bg-slate-50 border border-slate-200 px-2.5 py-1">
                        <span className="text-slate-500 block uppercase text-[10px]">{key.replace(/_/g, ' ')}:</span>
                        <span className="font-bold text-slate-900 truncate block">
                          {typeof val === 'number' ? `₹${val.toLocaleString('en-IN')}` : String(val)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Linked Evidence Footer */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    Linked Source: <strong className="text-slate-900">{a.document_name || `DOC #${a.document_id}`}</strong>
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Income Tax Act Scrutiny Rule RMS-2026
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AnomaliesPage;
