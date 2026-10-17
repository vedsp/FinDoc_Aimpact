import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertCircle, CheckCircle2, Info, Scale, RefreshCw } from 'lucide-react';
import { documentApi } from '../services/api';

export const RiskPage = () => {
  const [riskData, setRiskData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchRisk = async () => {
    setLoading(true);
    try {
      const data = await documentApi.getRiskAssessment();
      setRiskData(data);
    } catch (err) {
      console.error("Failed to load risk assessment:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRisk();
  }, []);

  if (loading) {
    return (
      <div className="bg-white border border-slate-300 p-6 text-center text-slate-500 rounded-[2px]">
        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-sky-700" />
        <p className="text-xs font-mono mt-2">Computing weighted risk factors...</p>
      </div>
    );
  }

  if (!riskData || !riskData.has_data) {
    return (
      <div className="space-y-3">
        <div className="bg-white border border-slate-300 p-3 rounded-[2px] flex items-center justify-between">
          <div>
            <div className="audit-kicker">ASSESSMENT ENGINE / MULTI-FACTOR MODEL</div>
            <h2 className="text-sm md:text-base font-bold text-slate-900 tracking-tight">Compliance Risk Index</h2>
          </div>
          <div className="text-right">
            <div className="text-base font-bold font-mono text-slate-400">-- / 100</div>
            <div className="text-[10px] uppercase font-bold text-slate-400">No Assessment Data</div>
          </div>
        </div>

        <div className="bg-white border border-slate-300 p-4 rounded-[2px] text-xs text-slate-600">
          <span className="font-semibold text-slate-800">No evidence records ingested.</span>{' '}
          <span className="text-slate-500">Upload bank statements, GST returns, or invoices to generate explainable compliance risk metrics.</span>
        </div>
      </div>
    );
  }

  const breakdown = [
    { label: 'Cash-Flow Stability', weight: '20%', score: riskData.breakdown?.cash_flow_stability ?? 75 },
    { label: 'Debt Burden & Liabilities', weight: '20%', score: riskData.breakdown?.debt_burden ?? 70 },
    { label: 'Revenue Consistency', weight: '15%', score: riskData.breakdown?.revenue_consistency ?? 70 },
    { label: 'Cross-Document Consistency', weight: '20%', score: riskData.breakdown?.cross_document_consistency ?? 60 },
    { label: 'Transaction Anomalies', weight: '15%', score: riskData.breakdown?.transaction_anomalies ?? 60 },
    { label: 'Document Completeness', weight: '10%', score: riskData.breakdown?.document_completeness ?? 80 },
  ];

  const isHighRisk = riskData.overall_score >= 70;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="bg-white border border-slate-300 p-3 rounded-[2px] flex items-center justify-between">
        <div>
          <div className="audit-kicker">EXPLAINABLE MULTI-FACTOR SCORING ENGINE</div>
          <h2 className="text-sm md:text-base font-bold text-slate-900 tracking-tight">
            Corporate Compliance & Credit Risk Profile
          </h2>
          <p className="text-[11px] text-slate-500">Weighted financial factor decomposition for audit review</p>
        </div>
        <div className="text-right">
          <div className={`text-xl font-bold font-mono ${isHighRisk ? 'text-rose-700' : 'text-emerald-700'}`}>
            {riskData.overall_score} / 100
          </div>
          <div className={`text-[10px] uppercase font-bold ${isHighRisk ? 'text-rose-700' : 'text-emerald-700'}`}>
            {riskData.risk_level} RISK LEVEL
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Factor Breakdown List */}
        <div className="bg-white border border-slate-300 p-3.5 rounded-[2px] space-y-3">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
            <Scale className="w-3.5 h-3.5 text-slate-600" />
            <span>Weighted Factor Decomposition</span>
          </h3>

          <div className="space-y-2.5">
            {breakdown.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-700">{item.label} <span className="text-slate-400 text-[10px]">({item.weight})</span></span>
                  <span className="font-mono text-xs font-bold text-slate-900">{item.score}/100</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-none overflow-hidden border border-slate-200">
                  <div
                    className={`h-full ${item.score < 65 ? 'bg-rose-600' : item.score < 75 ? 'bg-amber-500' : 'bg-emerald-600'}`}
                    style={{ width: `${item.score}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Explainability Factors */}
        <div className="space-y-3">
          <div className="bg-white border border-slate-300 border-l-3 border-l-emerald-600 p-3 rounded-[2px] space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Positive Audit Indicators</span>
            </h4>
            <ul className="text-xs text-slate-700 space-y-1">
              {riskData.positive_factors && riskData.positive_factors.length > 0 ? (
                riskData.positive_factors.map((factor, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-emerald-700 font-bold">•</span>
                    <span>{factor}</span>
                  </li>
                ))
              ) : (
                <li className="text-xs text-slate-400">No positive factors noted</li>
              )}
            </ul>
          </div>

          <div className="bg-white border border-slate-300 border-l-3 border-l-rose-600 p-3 rounded-[2px] space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              <span>Identified Audit Exceptions & Variances</span>
            </h4>
            <ul className="text-xs text-slate-700 space-y-1">
              {riskData.risk_factors && riskData.risk_factors.length > 0 ? (
                riskData.risk_factors.map((factor, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-rose-700 font-bold">•</span>
                    <span>{factor}</span>
                  </li>
                ))
              ) : (
                <li className="text-xs text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> No significant risk drivers detected
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      <div className="p-2.5 bg-slate-100 border border-slate-300 rounded-[2px] text-[11px] text-slate-600 flex items-start gap-2">
        <Info className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
        <span>
          <strong>Audit Working Paper Note:</strong> This assessment is an algorithmic multi-factor calculation generated for auditor assistance and human verification.
        </span>
      </div>
    </div>
  );
};
