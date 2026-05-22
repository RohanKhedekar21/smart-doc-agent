import { X, Moon, Sun, Info } from 'lucide-react'
import { useState } from 'react'

export default function SettingsModal({ onClose }) {
  const [apiKey, setApiKey] = useState("");

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="glass-panel w-[92%] max-w-[480px] max-h-[85vh] overflow-y-auto p-6 md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold">Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* About Section */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-4">About</h3>
          <div className="glass-panel p-4">
            <div className="flex items-center gap-3 mb-3">
              <Info size={18} className="text-accent" />
              <span className="font-semibold">Smart Document Agent</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Upload PDFs, TXTs, or CSVs and ask questions about their content. 
              Powered by Google Gemini AI with a custom vector search engine.
            </p>
            <p className="text-xs text-gray-500 mt-3">Version 1.0.0</p>
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-4">Keyboard Shortcuts</h3>
          <div className="glass-panel p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Send message</span>
              <kbd className="px-2 py-0.5 bg-white/10 rounded text-xs text-gray-300 border border-white/10">Enter</kbd>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">New chat</span>
              <span className="text-xs text-gray-500">Click "+ New Chat"</span>
            </div>
          </div>
        </div>

        {/* Supported Formats */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-4">Supported Formats</h3>
          <div className="glass-panel p-4">
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-lg text-xs md:text-sm font-medium text-accent">.pdf</span>
              <span className="px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-lg text-xs md:text-sm font-medium text-accent">.docx</span>
              <span className="px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-lg text-xs md:text-sm font-medium text-accent">.xlsx</span>
              <span className="px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-lg text-xs md:text-sm font-medium text-accent">.txt</span>
              <span className="px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-lg text-xs md:text-sm font-medium text-accent">.csv</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
