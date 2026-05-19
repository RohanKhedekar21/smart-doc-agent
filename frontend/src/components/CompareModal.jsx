import { useState } from 'react'
import { X, SplitSquareHorizontal, Loader2, FileText } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { compareDocuments } from '../services/api'

export default function CompareModal({ sessionId, documents, onClose, onComparisonComplete }) {
  const [doc1, setDoc1] = useState(documents.length > 0 ? documents[0].filename : "");
  const [doc2, setDoc2] = useState(documents.length > 1 ? documents[1].filename : "");
  const [query, setQuery] = useState("");
  
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCompare = async (e) => {
    e.preventDefault();
    if (!doc1 || !doc2 || !query.trim() || isLoading) return;
    
    if (doc1 === doc2) {
      setError("Please select two different documents to compare.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await compareDocuments(sessionId, doc1, doc2, query);
      setResult(data);
      if (onComparisonComplete) {
        onComparisonComplete(); // Trigger refresh of main chat if needed
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Comparison failed. Try rephrasing your request.");
    }
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div 
        className="bg-panel-bg border border-panel-border rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-panel-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center border border-orange-500/30">
              <SplitSquareHorizontal size={20} className="text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Compare Documents</h2>
              <p className="text-xs text-gray-400">Select two documents and ask the AI to analyze the differences.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Input Area */}
        <div className="p-6 border-b border-panel-border bg-white/[0.02]">
          {documents.length < 2 ? (
            <div className="text-amber-400 text-sm flex items-center gap-2">
              <FileText size={16} />
              You need to upload at least two documents to this session to use comparison.
            </div>
          ) : (
            <form onSubmit={handleCompare} className="flex flex-col gap-4">
              <div className="flex gap-4">
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-xs text-gray-400 font-medium ml-1">Document A</label>
                  <select 
                    value={doc1}
                    onChange={(e) => setDoc1(e.target.value)}
                    className="bg-white/5 border border-panel-border rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50 transition-colors"
                  >
                    {documents.map(d => (
                      <option key={`a-${d.id}`} value={d.filename}>{d.filename}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex items-center justify-center pt-6">
                  <div className="text-gray-500 font-bold px-2 text-xs">VS</div>
                </div>

                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-xs text-gray-400 font-medium ml-1">Document B</label>
                  <select 
                    value={doc2}
                    onChange={(e) => setDoc2(e.target.value)}
                    className="bg-white/5 border border-panel-border rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50 transition-colors"
                  >
                    {documents.map(d => (
                      <option key={`b-${d.id}`} value={d.filename}>{d.filename}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder='e.g. "What are the main differences in pricing?" or "Compare the responsibilities mentioned."'
                  className="flex-1 bg-white/5 border border-panel-border rounded-xl px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-orange-500/50 transition-colors"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !query.trim() || doc1 === doc2}
                  className="bg-orange-500 hover:bg-orange-600 text-white border-none rounded-xl px-6 py-3 text-sm font-semibold cursor-pointer flex items-center gap-2 transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : <SplitSquareHorizontal size={16} />}
                  {isLoading ? "Analyzing..." : "Compare"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-auto p-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          {result && result.answer && (
            <div className="animate-fade-in">
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-5">
                <div className="markdown-content text-gray-200">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {result.answer}
                  </ReactMarkdown>
                </div>
                
                {result.sources && result.sources.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-orange-500/20 flex gap-2">
                    {result.sources.map((src, i) => (
                      <span key={i} className="text-xs bg-orange-500/20 text-orange-400 px-2.5 py-1 rounded-full font-medium">
                        {src}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-500 text-center mt-4">
                This comparison has also been saved to your session chat history.
              </div>
            </div>
          )}

          {!result && !error && !isLoading && (
            <div className="text-center py-16 text-gray-500">
              <SplitSquareHorizontal size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select two documents above to begin a comparison.</p>
              <p className="text-xs mt-1 text-gray-600">The AI will analyze both and highlight key differences.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
