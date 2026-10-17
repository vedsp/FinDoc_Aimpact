import React, { useState, useEffect } from 'react';
import { AlertTriangle, AlertCircle, Info, RefreshCw, Filter, CheckCircle2 } from 'lucide-react';
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

  const filtered = anomalies.filter(a => {
    if (filterSeverity === 'ALL') return true;
    return (a.severity || '').toUpperCase() === filterSeverity;
  });

  const highCount = anomalies.filter(a => (a.severity || '').toUpperCase() === 'HIGH').length;
  const medCount = anomalies.filter(a => (a.severity || '').toUpperCase() === 'MEDIUM').length;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="bg-white border border-slate-300 p-3 rounded-[2px] flex items-center justify-between">
        <div>
          <div className="audit-kicker">AI OUTLIER & FRAUD DETECTION REGISTER</div>
          <h2 className="text-sm md:text-base font-bold text-slate-900 tracking-tight">
            Transaction Exceptions & Forensic Audit Flags
          </h2>
          <p className="text-[11px] text-slate-500 font-mono">
            Powered by Groq LLM & Dynamic Historical Vendor Baselines
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchAnomalies}
            className="btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1.5"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-700' : ''}`} />
            Refresh
          </button>
          <span className={`font-mono text-xs font-bold px-2 py-0.5 border ${
            anomalies.length > 0 ? 'text-rose-700 bg-rose-50 border-rose-300' : 'text-emerald-700 bg-emerald-50 border-emerald-300'
          }`}>
            {anomalies.length} {anomalies.length === 1 ? 'EXCEPTION' : 'EXCEPTIONS'}
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-100 border border-slate-300 px-3 py-2 rounded-[2px] flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-600" />
          <span className="font-semibold text-slate-700">Filter by Severity:</span>
          {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map(sev => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-2 py-0.5 text-[11px] font-mono rounded-[2px] border ${
                filterSeverity === sev
                  ? 'bg-[#0b3861] text-white border-[#082845] font-bold'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {sev}
              {sev === 'HIGH' && highCount > 0 ? ` (${highCount})` : ''}
              {sev === 'MEDIUM' && medCount > 0 ? ` (${medCount})` : ''}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-slate-500 font-mono">Showing {filtered.length} of {anomalies.length}</span>
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white border border-slate-300 p-8 text-center text-slate-500 rounded-[2px]">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto text-sky-700 mb-2" />
          <p className="text-xs font-mono">Querying audit exception register...</p>
        </div>
      ) : anomalies.length === 0 ? (
        <div className="bg-white border border-slate-300 p-8 text-center space-y-2 rounded-[2px]">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900">No Forensic Exceptions Detected</h3>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            All ingested documents and transactions are consistent with baseline historical profiles. Upload new documents or run the demo seeder to view sample flags.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-300 p-6 text-center text-xs text-slate-500">
          No exceptions match the <strong className="text-slate-800">{filterSeverity}</strong> filter.
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(a => {
            const isHigh = (a.severity || '').toUpperCase() === 'HIGH';
            const isMed = (a.severity || '').toUpperCase() === 'MEDIUM';
            const badgeClass = isHigh
              ? 'bg-rose-100 text-rose-800 border-rose-300'
              : isMed
              ? 'bg-amber-100 text-amber-800 border-amber-300'
              : 'bg-sky-100 text-sky-800 border-sky-300';
            const borderLeft = isHigh
              ? 'border-l-rose-600'
              : isMed
              ? 'border-l-amber-600'
              : 'border-l-sky-600';

            return (
              <div
                key={a.id}
                className={`bg-white border border-slate-300 border-l-4 ${borderLeft} p-3 rounded-[2px] space-y-2 shadow-sm`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono font-bold border px-1.5 py-0.5 uppercase ${badgeClass}`}>
                      {a.severity} SEVERITY
                    </span>
                    <h3 className="text-xs font-bold text-slate-900">
                      {a.anomaly_type ? a.anomaly_type.replaceAll('_', ' ') : 'ANOMALY DETECTED'}
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    {a.created_at ? new Date(a.created_at).toLocaleString('en-IN') : '—'}
                  </span>
                </div>

                <p className="text-xs text-slate-800 font-medium">
                  {a.description || 'Outlier detected during automated financial review.'}
                </p>

                {a.explanation && (
                  <div className="p-2 bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-1.5 rounded-[2px]">
                    <Info className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-slate-900">Audit Evidence:</strong> {a.explanation}
                    </span>
                  </div>
                )}

                <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>Linked Source: <strong>{a.document_name || `DOC-${a.document_id}`}</strong></span>
                  <span>Record ID: #{a.id}</span>
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
