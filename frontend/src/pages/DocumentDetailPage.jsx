import React, { useEffect, useState } from 'react';
import { documentApi } from '../services/api';
import { ArrowLeft, Tag, FileText, CheckCircle2 } from 'lucide-react';

export const DocumentDetailPage = ({ documentId, onBack }) => {
  const [docDetail, setDocDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      try {
        setDocDetail(await documentApi.getDetail(documentId));
      } catch (err) {
        console.error('Failed to load document detail:', err);
        setDocDetail(null);
      } finally {
        setLoading(false);
      }
    };
    if (documentId) fetchDetail();
  }, [documentId]);

  if (loading) {
    return (
      <div className="bg-white border border-[#cccccc] p-8 text-center">
        <p className="text-xs text-[#555555]">Loading schedule details and extracted ledger records...</p>
      </div>
    );
  }

  if (!docDetail) {
    return (
      <div className="bg-white border border-[#cccccc] p-8 text-center space-y-3">
        <p className="text-xs text-[#555555]">Document record not found or inaccessible.</p>
        <button onClick={onBack} className="btn-primary">Return to Schedule List</button>
      </div>
    );
  }

  const verificationStatus = docDetail.status === 'COMPLETED' ? 'VERIFIED' : docDetail.status === 'FAILED' ? 'FAILED' : 'PENDING VERIFICATION';
  const statusClass = docDetail.status === 'COMPLETED' ? 'text-emerald-800 bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded' : docDetail.status === 'FAILED' ? 'text-red-800 bg-red-50 border border-red-300 px-2.5 py-1 rounded' : 'text-amber-800 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded';

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="bg-white border border-[#cccccc] p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="btn-secondary" title="Return to list">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <div>
            <h2 className="text-sm font-bold text-[#222222] uppercase tracking-wide">
              Document Audit Record: {docDetail.original_name}
            </h2>
            <p className="text-xs text-[#555555] font-mono">
              DOC-{String(docDetail.id).padStart(5, '0')} · {docDetail.file_type.toUpperCase()} · {(docDetail.file_size / 1024).toFixed(1)} KB
            </p>
          </div>
        </div>
        <div>
          <span className={`text-xs font-bold ${statusClass}`}>
            STATUS: {verificationStatus}
          </span>
        </div>
      </div>

      {/* 2-Column Schedule Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        {/* Left Column: Metadata Table */}
        <div className="bg-white border border-[#cccccc] md:col-span-1 shadow-sm">
          <div className="bg-[#f2f4f7] px-3 py-2 border-b border-[#cccccc] font-bold text-xs text-[#111111] uppercase">
            Schedule Meta & Classification
          </div>
          <table className="itr-grid border-0 text-[#111111]">
            <tbody>
              <tr>
                <td className="font-semibold text-[#333333]" style={{ width: '45%' }}>Schedule Ref</td>
                <td className="font-mono text-[#111111] font-semibold">DOC-{String(docDetail.id).padStart(5, '0')}</td>
              </tr>
              <tr>
                <td className="font-semibold text-[#333333]">Category</td>
                <td className="font-bold text-[#111111]">{docDetail.document_category.replaceAll('_', ' ')}</td>
              </tr>
              <tr>
                <td className="font-semibold text-[#333333]">Assessment Year</td>
                <td className="text-[#111111] font-medium">AY 2026-27</td>
              </tr>
              <tr>
                <td className="font-semibold text-[#333333]">Financial Year</td>
                <td className="text-[#111111] font-medium">FY 2025-26</td>
              </tr>
              <tr>
                <td className="font-semibold text-[#333333]">Page Count</td>
                <td className="font-mono text-right text-[#111111] font-medium">{docDetail.page_count}</td>
              </tr>
              <tr>
                <td className="font-semibold text-[#333333]">Linked Bank Txns</td>
                <td className="font-mono text-right text-[#111111] font-medium">{docDetail.bank_transactions_count}</td>
              </tr>
              <tr>
                <td className="font-semibold text-[#333333]">Linked Invoices</td>
                <td className="font-mono text-right text-[#111111] font-medium">{docDetail.invoices_count}</td>
              </tr>
              <tr>
                <td className="font-semibold text-[#333333]">Flagged Exceptions</td>
                <td className={`font-mono text-right font-bold ${docDetail.anomalies_count > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {docDetail.anomalies_count}
                </td>
              </tr>
              <tr>
                <td className="font-semibold text-[#333333]">Uploaded Timestamp</td>
                <td className="text-[#111111] font-medium">{new Date(docDetail.created_at).toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Right Column: Parsed Financial Fields Table */}
        <div className="bg-white border border-[#cccccc] md:col-span-2 shadow-sm">
          <div className="bg-[#f2f4f7] px-3 py-2 border-b border-[#cccccc] flex items-center justify-between">
            <span className="font-bold text-xs text-[#111111] uppercase">
              Schedule Part B: Extracted Financial Entities & Values
            </span>
            <span className="text-[11px] text-[#333333] font-medium">OCR & Rule Engine</span>
          </div>

          {docDetail.extracted_fields.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#444444] font-medium">
              No structured entities parsed yet. Ensure document contains readable ledger text or re-process.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="itr-grid border-0 text-[#111111]">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }} className="text-[#111111]">Sr.</th>
                    <th className="text-[#111111]">Entity / Field Description</th>
                    <th className="text-[#111111]">Extracted Value</th>
                    <th className="text-[#111111]">Confidence Score</th>
                  </tr>
                </thead>
                <tbody>
                  {docDetail.extracted_fields.map((field, idx) => (
                    <tr key={field.id || idx}>
                      <td className="text-center font-mono text-[#111111]">{idx + 1}</td>
                      <td className="font-semibold text-[#111111]">{field.field_name}</td>
                      <td className="font-mono font-bold text-[#111111]">{field.field_value}</td>
                      <td className="text-right font-mono text-emerald-700 font-bold">{(field.confidence * 100).toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="p-2.5 border-t border-[#cccccc] bg-[#fafafa] text-[11px] text-[#333333] font-mono break-all font-medium">
            Storage Location: {docDetail.storage_path}
          </div>
        </div>
      </div>
    </div>
  );
};

