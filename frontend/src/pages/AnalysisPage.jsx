import { useState, useEffect } from 'react';

export default function AnalysisPage() {
  const [crossVerify, setCrossVerify] = useState(null);
  const [dupes, setDupes]             = useState([]);
  const [loading, setLoading]         = useState(true);

  const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

  useEffect(() => {
    Promise.all([
      fetch('/api/v1/analysis/cross-verify', { headers }).then(r => r.json()),
      fetch('/api/v1/analysis/duplicates',   { headers }).then(r => r.json()),
    ]).then(([cv, dup]) => {
      setCrossVerify(cv);
      setDupes(dup.duplicates || []);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-8 text-gray-500">Loading analysis...</div>;

  return (
    <div className="p-8 space-y-8 max-w-5xl">
      <h2 className="text-2xl font-bold">Cross-Document Verification</h2>

      {/* Bank vs GST vs Invoice card */}
      {crossVerify && (
        <div className="bg-white rounded-2xl shadow p-6">
          <h3 className="font-semibold text-lg mb-4">Bank vs GST vs Invoices</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <div className="text-xs text-gray-500 mb-1">Bank Credits</div>
              <div className="text-2xl font-bold text-blue-700">
                ₹{crossVerify.bank_credits?.toLocaleString()}
              </div>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <div className="text-xs text-gray-500 mb-1">GST Turnover</div>
              <div className="text-2xl font-bold text-green-700">
                ₹{crossVerify.gst_turnover?.toLocaleString()}
              </div>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 text-center">
              <div className="text-xs text-gray-500 mb-1">Invoice Total</div>
              <div className="text-2xl font-bold text-purple-700">
                ₹{crossVerify.invoice_total?.toLocaleString()}
              </div>
            </div>
          </div>
          {crossVerify.flag && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
              ⚠ Discrepancy detected: Bank credits exceed GST turnover by
              ₹{Math.abs(crossVerify.bank_gst_diff)?.toLocaleString()}
            </div>
          )}
        </div>
      )}

      {/* Duplicate Invoices card */}
      <div className="bg-white rounded-2xl shadow p-6">
        <h3 className="font-semibold text-lg mb-4">
          Duplicate Invoices
          {dupes.length > 0 && (
            <span className="ml-2 bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full">
              {dupes.length} found
            </span>
          )}
        </h3>
        {dupes.length === 0 ? (
          <div className="text-gray-400 text-sm">No duplicate invoices found ✓</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b">
                <th className="text-left pb-2">Original</th>
                <th className="text-left pb-2">Duplicate</th>
                <th className="text-left pb-2">Vendor</th>
                <th className="text-right pb-2">Amount</th>
                <th className="text-left pb-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {dupes.map((d, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-2 text-blue-600">{d.original}</td>
                  <td className="py-2 text-red-600">{d.duplicate}</td>
                  <td className="py-2">{d.vendor}</td>
                  <td className="py-2 text-right">₹{d.amount?.toLocaleString()}</td>
                  <td className="py-2 text-gray-400">{d.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export { AnalysisPage };
