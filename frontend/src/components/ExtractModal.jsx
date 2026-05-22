import { useState } from 'react'
import { X, Download, Table, Loader2 } from 'lucide-react'
import { extractData } from '../services/api'

export default function ExtractModal({ sessionId, onClose }) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleExtract = async (e) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await extractData(sessionId, query);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.detail || "Extraction failed. Try rephrasing your request.");
    }
    setIsLoading(false);
  };

  const downloadCSV = () => {
    if (!result) return;
    const header = result.columns.join(",");
    const rows = result.rows.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "extracted_data.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-panel-bg border border-panel-border rounded-2xl w-[95%] max-w-3xl max-h-[85vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-panel-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl accent-gradient-bg flex items-center justify-center shrink-0">
              <Table size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm md:text-lg font-semibold text-white">Extract Data</h2>
              <p className="text-[11px] md:text-xs text-gray-400">Pull structured information from your documents</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>

        {/* Query Input */}
        <div className="p-4 md:p-6 border-b border-panel-border">
          <form onSubmit={handleExtract} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='e.g. "Extract all skills and experience years"'
              className="flex-1 bg-white/5 border border-panel-border rounded-xl px-4 py-3 text-base md:text-sm text-white outline-none placeholder:text-gray-500 focus:border-accent/50 transition-colors"
              disabled={isLoading}
              maxLength={4000}
            />
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="accent-gradient-bg text-white border-none rounded-xl px-6 py-3 text-sm font-semibold cursor-pointer flex items-center justify-center gap-2 transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Table size={16} />}
              {isLoading ? "Extracting..." : "Extract"}
            </button>
          </form>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-auto p-4 md:p-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          {result && result.columns && result.columns.length > 0 && (
            <div>
              {/* Download button */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-400">
                  {result.rows.length} row{result.rows.length !== 1 ? 's' : ''} extracted
                  {result.sources && ` from ${result.sources.join(', ')}`}
                </span>
                <button
                  onClick={downloadCSV}
                  className="flex items-center gap-2 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-xl px-4 py-2 text-sm font-medium hover:bg-emerald-500/25 transition-colors cursor-pointer"
                >
                  <Download size={14} />
                  Download CSV
                </button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-xl border border-panel-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white/5">
                      {result.columns.map((col, i) => (
                        <th key={i} className="text-left px-4 py-3 text-accent font-semibold border-b border-panel-border whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row, i) => (
                      <tr key={i} className="hover:bg-white/5 transition-colors">
                        {row.map((cell, j) => (
                          <td key={j} className="px-4 py-3 text-gray-300 border-b border-panel-border/50">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!result && !error && !isLoading && (
            <div className="text-center py-12 text-gray-500">
              <Table size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Describe what data you want to extract from your documents.</p>
              <p className="text-xs mt-1 text-gray-600">The AI will structure it into a downloadable table.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
