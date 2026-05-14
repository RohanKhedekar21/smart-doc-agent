import { FileText, Trash2, X } from 'lucide-react'

export default function DocumentPanel({ documents, onDelete, onClose }) {
  return (
    <div className="w-[300px] bg-panel-bg border-l border-panel-border backdrop-blur-md flex flex-col z-10">
      <div className="flex items-center justify-between p-5 border-b border-panel-border">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-300">
          Documents
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {documents.length === 0 ? (
          <div className="text-center text-gray-500 text-sm mt-10">
            No documents uploaded yet.
          </div>
        ) : (
          documents.map((doc) => (
            <div 
              key={doc.id} 
              className="glass-panel p-3 px-4 flex items-center gap-3 mb-2 group"
            >
              <FileText size={16} className="text-accent shrink-0" />
              <span className="flex-1 text-sm text-gray-300 truncate">
                {doc.filename}
              </span>
              <button 
                onClick={() => onDelete(doc.id)}
                className="hidden group-hover:block text-gray-400 hover:text-red-400 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
