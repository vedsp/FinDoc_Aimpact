import React, { useState } from 'react';
import { ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

export const DocumentTable = ({ documents, onViewDetail, onDeleteDocument, loading }) => {
  const [deleteId, setDeleteId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const getCategoryLabel = (category) => {
    const labels = {
      BANK_STATEMENT: 'Bank Statement', 
      GST_RETURN: 'GSTR-3B Return', 
      INVOICE: 'Tax Invoice', 
      ITR: 'ITR-6 Return',
      BALANCE_SHEET: 'Balance Sheet', 
      PROFIT_LOSS: 'P&L Statement', 
      OTHER: 'General Record',
    };
    return labels[category] || 'General Record';
  };

  const getVerificationText = (doc) => {
    if (doc.status === 'COMPLETED') return <span className="text-positive">Verified</span>;
    if (doc.status === 'FAILED') return <span className="text-negative">Flagged Exception</span>;
    if (doc.status === 'EXTRACTED') return <span className="text-neutral">Extracted</span>;
    return <span className="text-warning">Under Review</span>;
  };

  const getRiskText = (doc) => {
    if (doc.status === 'FAILED' || doc.original_name.toLowerCase().includes('duplicate')) {
      return <span className="text-negative font-bold">High</span>;
    }
    if (doc.status === 'PROCESSING' || doc.status === 'UPLOADED') {
      return <span className="text-warning font-bold">Medium</span>;
    }
    return <span className="text-positive font-bold">Low</span>;
  };

  const formatDate = (value) => new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  });

  const getTaxCategory = (category) => {
    if (category === 'GST_RETURN') return 'Indirect Tax (GST)';
    if (category === 'INVOICE') return 'Commercial Trade';
    if (category === 'ITR') return 'Direct Tax';
    if (category === 'BANK_STATEMENT') return 'Cash Flow Verification';
    return 'Financial Record';
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-xs text-[#666666]">
        Loading evidence register records...
      </div>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <div className="p-3 bg-[#f9fafb] border border-[#dddddd] text-xs text-[#555555]">
        No evidence documents uploaded. Click <strong>+ Upload Document</strong> to import records.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="itr-grid">
        <thead>
          <tr>
            <th className="w-12 text-center">Sr. No.</th>
            <th>Document Name / Reference</th>
            <th>Financial Period</th>
            <th>Form / Type</th>
            <th>Audit Category</th>
            <th>Verification Status</th>
            <th>Risk</th>
            <th className="text-right">File Size</th>
            <th>Date Uploaded</th>
            <th className="text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc, idx) => (
            <React.Fragment key={doc.id}>
            <tr className="hover:bg-[#f9fafb]">
              <td className="text-center font-mono text-[#555555]">{idx + 1}</td>
              <td>
                <div className="font-semibold text-[#111111]">{doc.original_name}</div>
                <div className="text-[11px] text-[#666666] font-mono">
                  REF: DOC-{String(doc.id).padStart(5, '0')} · {doc.file_type.toUpperCase()} · {doc.page_count} page(s)
                </div>
              </td>
              <td className="font-mono text-xs">FY 2025-26</td>
              <td className="font-medium text-[#222222]">
                {getCategoryLabel(doc.document_category)}
              </td>
              <td className="text-[#555555]">{getTaxCategory(doc.document_category)}</td>
              <td>{getVerificationText(doc)}</td>
              <td>{getRiskText(doc)}</td>
              <td className="text-right font-mono text-[#555555]">
                {(doc.file_size / 1024).toFixed(1)} KB
              </td>
              <td className="text-[#555555]">
                {formatDate(doc.created_at)}
              </td>
              <td className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => onViewDetail(doc.id)}
                    className="itr-action-btn"
                    title="View Extraction Details"
                  >
                    View
                  </button>
                  {doc.original_name.toLowerCase().includes('duplicate') && (
                    <button
                      onClick={() => setExpandedId(expandedId === doc.id ? null : doc.id)}
                      className="itr-action-btn text-[#b45309]"
                      title="Toggle Audit Note"
                    >
                      {expandedId === doc.id ? 'Hide Note' : 'Audit Note'}
                    </button>
                  )}
                  <span className="text-[#cccccc]">|</span>
                  <button
                    onClick={() => setDeleteId(doc.id)}
                    className="itr-action-delete"
                    title="Delete Record"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
            {expandedId === doc.id && (
              <tr className="bg-[#fffbf0]">
                <td colSpan="10" className="p-2 text-xs text-[#8a4200]">
                  <strong>Auditor's Discrepancy Note:</strong> Suspected duplicate invoice matching INV-1032. Requires physical verification of vendor tax invoice and e-way bill before ITC claiming.
                </td>
              </tr>
            )}
            </React.Fragment>
          ))}
        </tbody>
      </table>

      {/* Delete Confirmation Modal (Standard Government Dialog) */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white border border-[#999999] p-4 max-w-sm w-full space-y-3 shadow-md">
            <div className="flex items-center gap-2 text-[#b91c1c] font-bold text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Confirm Deletion</span>
            </div>
            <p className="text-xs text-[#333333] leading-relaxed">
              Are you sure you want to permanently delete this document record and its associated extracted ledger entries from the working papers?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#eeeeee]">
              <button
                onClick={() => setDeleteId(null)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteDocument(deleteId);
                  setDeleteId(null);
                }}
                className="btn-primary bg-[#b91c1c] border-[#991b1b] hover:bg-[#991b1b] text-xs"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
