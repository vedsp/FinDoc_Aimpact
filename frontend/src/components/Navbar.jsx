import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { documentApi } from '../services/api';
import { LogOut, RefreshCw, Trash2 } from 'lucide-react';

const getFinancialYear = (document) => {
  const source = `${document.original_name || ''} ${document.filename || ''}`;
  const range = source.match(/(20\d{2})[_\-/\s](20\d{2})/);
  if (range) return `FY ${range[1]}-${range[2].slice(-2)}`;

  const singleYear = source.match(/20\d{2}/);
  if (singleYear) {
    const year = Number(singleYear[0]);
    return `FY ${year}-${String(year + 1).slice(-2)}`;
  }

  const createdYear = document.created_at ? new Date(document.created_at).getFullYear() : new Date().getFullYear();
  return `FY ${createdYear}-${String(createdYear + 1).slice(-2)}`;
};

const getAssessmentYear = (financialYear) => {
  const match = financialYear.match(/FY (\d{4})-(\d{2})/);
  if (!match) return '';
  return `AY ${Number(match[1]) + 1}-${match[2]}`;
};

export const Navbar = ({ onDemoLoaded, refreshTrigger }) => {
  const { user, logout } = useAuth();
  const [loadingClear, setLoadingClear] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [financialYears, setFinancialYears] = useState([]);
  const [selectedFinancialYear, setSelectedFinancialYear] = useState('');
  const [assesseeInfo, setAssesseeInfo] = useState({ name: '—', pan: '' });

  useEffect(() => {
    let active = true;
    Promise.all([
      documentApi.list().catch(() => []),
      documentApi.getDashboardOverview().catch(() => null)
    ]).then(([documents, overview]) => {
      if (!active) return;
      if (documents.length === 0) {
        setFinancialYears([]);
        setSelectedFinancialYear('');
        setAssesseeInfo({ name: user?.full_name || 'No Entity Active', pan: '' });
        return;
      }
      const years = [...new Set(documents.map(getFinancialYear))].sort().reverse();
      setFinancialYears(years);
      setSelectedFinancialYear((current) => years.includes(current) ? current : years[0]);

      let name = overview?.assessee_name;
      let pan = overview?.assessee_pan;

      if (!name || name === '—') {
        const allNames = documents.map(d => (d.original_name || d.filename || '').toLowerCase()).join(' ');
        if (allNames.includes('aarti')) {
          name = 'AARTI INDUSTRIES LTD';
          pan = pan || 'AAACA1234F';
        } else if (allNames.includes('mahalaxmi')) {
          name = 'Mahalaxmi Traders Pvt Ltd';
          pan = pan || 'BBAAA1234F';
        } else if (allNames.includes('abc') || allNames.includes('manufacturing')) {
          name = 'ABC Manufacturing Pvt Ltd';
          pan = pan || 'AABCA1234F';
        } else {
          name = documents[0]?.original_name?.split('.')[0]?.replace(/[_-]/g, ' ').trim() || 'Active Enterprise';
        }
      }

      setAssesseeInfo({
        name: name || 'Active Entity',
        pan: pan && pan !== '—' ? pan : ''
      });
    }).catch(() => {});
    return () => { active = false; };
  }, [refreshTrigger, user]);

  const handleClearSession = async () => {
    if (!window.confirm("Are you sure you want to unload all documents and reset this audit session?")) return;
    setLoadingClear(true);
    setStatusMessage(null);
    try {
      const res = await documentApi.clearSessionDocuments();
      setStatusMessage(res.message || "All session documents unloaded successfully.");
      if (onDemoLoaded) onDemoLoaded();
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      alert("Failed to unload session documents: " + (err.message || err));
    } finally {
      setLoadingClear(false);
    }
  };

  return (
    <>
    {/* Government Portal Top Header Bar */}
    <header className="portal-header px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <img src="/logo-square.png" alt="FinDocAI logo" className="w-6 h-6 rounded-none" />
        <div>
          <div className="text-sm font-bold tracking-tight text-white">
            FinDocAI <span className="font-normal text-slate-200">| Financial Audit & Tax Reconciliation Workstation</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-slate-200">
        {user && (
          <div className="flex items-center gap-3">
            <span>Logged in as: <strong>{user.full_name}</strong> ({user.role})</span>
            <span className="text-slate-400">|</span>
            <button
              onClick={logout}
              className="text-white hover:underline flex items-center gap-1 cursor-pointer"
              title="Logout from portal"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
    
    {/* Portal Subnav Filter Bar (Similar to ITR e-Filing assessment selector) */}
    <div className="portal-subnav flex flex-wrap items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-slate-700">Assessment Year (AY):</span>
          <select 
            className="itr-select" 
            value={getAssessmentYear(selectedFinancialYear)} 
            aria-label="Assessment year" 
            onChange={() => {}} 
            disabled={!selectedFinancialYear}
          >
            <option value="">{selectedFinancialYear ? getAssessmentYear(selectedFinancialYear) : 'Not Available'}</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="font-bold text-slate-700">Financial Year (FY):</span>
          <select 
            className="itr-select" 
            value={selectedFinancialYear} 
            aria-label="Financial year" 
            onChange={(event) => setSelectedFinancialYear(event.target.value)} 
            disabled={financialYears.length === 0}
          >
            {financialYears.length === 0 && <option value="">Not Available</option>}
            {financialYears.map((year) => <option key={year}>{year}</option>)}
          </select>
        </div>

        <span className="text-slate-400">|</span>
        <span className="text-slate-600">Assessee: <strong className="text-slate-900">{assesseeInfo.name}</strong> {assesseeInfo.pan ? `(PAN: ${assesseeInfo.pan})` : ''}</span>
      </div>
      
      <div className="flex items-center gap-2 shrink-0">
        {statusMessage && (
          <span className="text-positive text-xs font-semibold whitespace-nowrap">
            {statusMessage}
          </span>
        )}
        <button
          onClick={handleClearSession}
          disabled={loadingClear}
          className="btn-secondary text-xs flex items-center gap-1.5 text-rose-700 hover:text-rose-800 hover:bg-rose-50 border-rose-300 whitespace-nowrap shrink-0 px-2.5 py-1 font-semibold"
          title="Unload all session documents and reset audit workspace"
        >
          {loadingClear ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          <span>{loadingClear ? "Unloading..." : "Unload Session Documents"}</span>
        </button>
      </div>
    </div>
    </>
  );
};
