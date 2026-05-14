import { Plus, Bot, Settings, Pencil, Trash2, Check, X } from 'lucide-react'
import { useState } from 'react'

export default function Sidebar({ 
  sessions, activeSession, onSelectSession, onCreateSession,
  onRenameSession, onDeleteSession, onOpenSettings 
}) {
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");

  const startEditing = (e, session) => {
    e.stopPropagation();
    setEditingId(session.session_id);
    setEditName(session.name);
  };

  const confirmRename = (e) => {
    e.stopPropagation();
    if (editName.trim()) {
      onRenameSession(editingId, editName.trim());
    }
    setEditingId(null);
  };

  const cancelEditing = (e) => {
    e.stopPropagation();
    setEditingId(null);
  };

  return (
    <div className="w-[280px] bg-panel-bg border-r border-panel-border backdrop-blur-md flex flex-col p-6 z-10">
      <div className="text-2xl font-bold text-gradient mb-8 tracking-tight">
        SmartAgent.
      </div>
      
      <button 
        className="accent-gradient-bg text-white border-none rounded-xl py-3.5 px-5 text-[15px] font-semibold cursor-pointer flex items-center justify-center gap-2 transition-all duration-300 shadow-[0_4px_15px_rgba(109,93,252,0.3)] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(109,93,252,0.4)]"
        onClick={onCreateSession}
      >
        <Plus size={18} />
        New Chat
      </button>

      <div className="mt-10 flex-1 overflow-y-auto">
        <h3 className="text-xs uppercase text-gray-400 mb-4 tracking-widest">
          Recent Sessions
        </h3>
        
        {sessions.map(s => (
          <div 
            key={s.session_id}
            onClick={() => onSelectSession(s.session_id)}
            className={`glass-panel p-3 px-4 flex items-center gap-3 cursor-pointer mb-2 transition-colors duration-200 group ${activeSession === s.session_id ? 'border-accent bg-white/5' : 'border-white/10 hover:bg-white/5'}`}
          >
            <Bot size={18} className={`shrink-0 ${activeSession === s.session_id ? "text-accent" : "text-gray-400"}`} />
            
            {editingId === s.session_id ? (
              <div className="flex-1 flex items-center gap-1">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && confirmRename(e)}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 bg-white/10 border border-accent/40 rounded-md px-2 py-1 text-sm text-white outline-none"
                  autoFocus
                />
                <button onClick={confirmRename} className="text-green-400 hover:text-green-300 p-0.5">
                  <Check size={14} />
                </button>
                <button onClick={cancelEditing} className="text-red-400 hover:text-red-300 p-0.5">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <>
                <span className={`flex-1 text-sm font-medium truncate ${activeSession === s.session_id ? 'text-white' : 'text-gray-400'}`}>
                  {s.name}
                </span>
                <div className="hidden group-hover:flex items-center gap-1">
                  <button onClick={(e) => startEditing(e, s)} className="text-gray-400 hover:text-white p-0.5">
                    <Pencil size={13} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onDeleteSession(s.session_id); }} className="text-gray-400 hover:text-red-400 p-0.5">
                    <Trash2 size={13} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div 
        onClick={onOpenSettings}
        className="border-t border-panel-border pt-6 flex items-center gap-3 text-gray-400 cursor-pointer hover:text-white transition-colors"
      >
        <Settings size={18} />
        <span className="text-sm">Settings</span>
      </div>
    </div>
  )
}
