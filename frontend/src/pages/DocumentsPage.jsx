import React, { useEffect, useState } from 'react';
import { documentApi } from '../services/api';
import { DocumentTable } from '../components/DocumentTable';
import { Plus } from 'lucide-react';

export const DocumentsPage = ({ onOpenUpload, onViewDetail, refreshTrigger, initialCategory = '' }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState(initialCategory);
  const [searchTerm, setSearchTerm] = useState('');

  const [overview, setOverview] = useState(null);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const [data, ov] = await Promise.all([
        documentApi.list(categoryFilter || null),
        documentApi.getOverview().catch(() => null)
      ]);
      setDocuments(data);
      setOverview(ov);
    } catch (err) {
      console.error("Failed to load documents:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [categoryFilter, refreshTrigger]);

  useEffect(() => {
    setCategoryFilter(initialCategory);
  }, [initialCategory]);

  const filteredDocs = documents.filter(doc => 
    doc.original_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.document_category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const verifiedCount = documents.filter((doc) => doc.status === 'COMPLETED').length;
  const reviewCount = documents.filter((doc) => ['UPLOADED', 'PROCESSING', 'EXTRACTED'].includes(doc.status)).length;
  const flaggedCount = documents.filter((doc) => doc.status === 'FAILED' || doc.original_name.toLowerCase().includes('duplicate')).length;

  const clearFilters = () => {
    setCategoryFilter('');
    setSearchTerm('');
  };

  const allNames = documents.map(d => (d.original_name || d.filename || '').toLowerCase()).join(' ');
  const dynamicAssessee = overview?.assessee_name || (
    allNames.includes('aarti') ? 'Aarti Industries Ltd' :
    allNames.includes('mahalaxmi') ? 'Mahalaxmi Traders Pvt Ltd' :
    allNames.includes('abc') ? 'ABC Manufacturing Pvt Ltd' :
    (documents[0]?.original_name ? documents[0].original_name.split('.')[0].replace(/[_-]/g, ' ') : 'Active Entity')
  );
  const dynamicPan = overview?.assessee_pan || (
    allNames.includes('aarti') ? 'AAACA1234F' :
    allNames.includes('mahalaxmi') ? 'BBAAA1234F' :
    allNames.includes('abc') ? 'AABCA1234F' : ''
  );

  return (
    <div className="space-y-3">
      {/* Top Header */}
      <div className="itr-card bg-white p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-[#111111]">
            Document Ingestion & Financial Evidence Register
          </h2>
          <div className="text-xs text-[#555555]">
            Assessee: <strong className="text-slate-900">{dynamicAssessee}</strong> {dynamicPan ? `(PAN: ${dynamicPan})` : ''} · AY 2026-27
          </div>
        </div>
        <button
          onClick={onOpenUpload}
          className="btn-primary text-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Summary Strip (ITR Schedule Breakdown) */}
      <div className="itr-card bg-white p-2.5">
        <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-[#dddddd] text-xs">
          <div className="px-2.5">
            <div className="text-[#666666]">Total Ingested:</div>
            <div className="font-bold text-[#111111] font-mono text-sm">{documents.length} Records</div>
          </div>
          <div className="px-2.5">
            <div className="text-[#666666]">Verified Clean:</div>
            <div className="font-bold text-positive font-mono text-sm">{verifiedCount} Records</div>
          </div>
          <div className="px-2.5">
            <div className="text-[#666666]">Under Review:</div>
            <div className="font-bold text-warning font-mono text-sm">{reviewCount} Records</div>
          </div>
          <div className="px-2.5">
            <div className="text-[#666666]">Exceptions / Flagged:</div>
            <div className="font-bold text-negative font-mono text-sm">{flaggedCount} Records</div>
          </div>
          <div className="px-2.5">
            <div className="text-[#666666]">Assessment Period:</div>
            <div className="font-bold text-[#111111] font-mono text-sm">AY 2026-27</div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="itr-card bg-white p-2.5 space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold text-slate-700">Filter Register:</span>
          <select className="itr-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} aria-label="Document type">
            <option value="">All Document Forms</option>
            <option value="BANK_STATEMENT">Bank Statements</option>
            <option value="GST_RETURN">GSTR-3B Returns</option>
            <option value="INVOICE">Tax Invoices</option>
            <option value="ITR">Income Tax Returns</option>
          </select>

          <input
            type="text"
            placeholder="Search by filename or reference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="itr-input flex-1 min-w-[200px]"
          />

          {(searchTerm || categoryFilter) && (
            <button onClick={clearFilters} className="itr-action-btn text-xs">
              Clear Filter
            </button>
          )}

          <span className="text-xs text-[#666666] ml-auto">
            Showing {filteredDocs.length} of {documents.length} evidence records
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="itr-card bg-white p-3 space-y-2">
        <DocumentTable
          documents={filteredDocs}
          loading={loading}
          onViewDetail={onViewDetail}
          onDeleteDocument={async (id) => {
            await documentApi.delete(id);
            fetchDocuments();
          }}
        />
      </div>
    </div>
  );
};
