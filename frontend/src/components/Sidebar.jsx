import { Plus, Bot, Settings, Pencil, Trash2, Check, X, GripVertical, Table, SplitSquareHorizontal, FileText } from 'lucide-react'
import { useState, useCallback, useEffect } from 'react'

export default function Sidebar({ 
  sessions, activeSession, onSelectSession, onCreateSession,
  onRenameSession, onDeleteSession, onOpenSettings,
  isOpen, onClose,
  activeSessionObj, documentsCount, onOpenExtract, onOpenCompare, onOpenDocPanel
}) {
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [width, setWidth] = useState(280);
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const MIN_WIDTH = 200;
  const MAX_WIDTH = 450;

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX));
    setWidth(newWidth);
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

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
    <div 
      className={`fixed inset-y-0 left-0 z-40 flex shrink-0 transition-transform duration-300 md:static md:translate-x-0 ${
        isMobile 
          ? `w-[280px] max-w-[85vw] ${isOpen ? 'translate-x-0' : '-translate-x-full'}` 
          : 'relative'
      }`}
      style={isMobile ? undefined : { width: `${width}px` }}
    >
      <div className="flex-1 bg-panel-bg border-r border-panel-border backdrop-blur-md flex flex-col p-6 z-10 overflow-hidden">
        <div className="flex items-center justify-between mb-8">
          <div className="text-2xl font-bold text-gradient tracking-tight whitespace-nowrap">
            SmartAgent.
          </div>
          {isMobile && (
            <button 
              onClick={onClose}
              className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              title="Close sidebar"
            >
              <X size={20} />
            </button>
          )}
        </div>
        
        <button 
          className="accent-gradient-bg text-white border-none rounded-xl py-3.5 px-5 text-[15px] font-semibold cursor-pointer flex items-center justify-center gap-2 transition-all duration-300 shadow-[0_4px_15px_rgba(109,93,252,0.3)] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(109,93,252,0.4)]"
          onClick={onCreateSession}
        >
          <Plus size={18} />
          New Chat
        </button>

        <div className="mt-10 flex-1 overflow-y-auto space-y-8">
          {activeSessionObj && (
            <div>
              <h3 className="text-xs uppercase text-gray-400 mb-3 tracking-widest">
                Session Tools
              </h3>
              <div className="space-y-2">
                <button 
                  onClick={onOpenExtract}
                  className="w-full glass-panel p-2.5 px-4 flex items-center gap-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <Table size={16} className="text-accent shrink-0" />
                  <span>Extract Data</span>
                </button>
                
                <button 
                  onClick={onOpenCompare}
                  className="w-full glass-panel p-2.5 px-4 flex items-center gap-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <SplitSquareHorizontal size={16} className="text-orange-400 shrink-0" />
                  <span>Compare Documents</span>
                </button>
                
                <button 
                  onClick={onOpenDocPanel}
                  className="w-full glass-panel p-2.5 px-4 flex items-center gap-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <FileText size={16} className="text-emerald-400 shrink-0" />
                  <span className="truncate">
                    View Documents {documentsCount > 0 ? `(${documentsCount})` : ''}
                  </span>
                </button>
              </div>
            </div>
          )}

          <div>
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
                <div className="flex-1 flex items-center gap-1 min-w-0">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && confirmRename(e)}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 min-w-0 bg-white/10 border border-accent/40 rounded-md px-2 py-1 text-sm text-white outline-none"
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
                  <div className="hidden group-hover:flex items-center gap-1 shrink-0">
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
        </div>

        <div 
          onClick={onOpenSettings}
          className="border-t border-panel-border pt-6 flex items-center gap-3 text-gray-400 cursor-pointer hover:text-white transition-colors"
        >
          <Settings size={18} />
          <span className="text-sm">Settings</span>
        </div>
      </div>

      {/* Resize handle */}
      {!isMobile && (
        <div 
          onMouseDown={handleMouseDown}
          className={`absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize z-20 group flex items-center justify-center transition-colors ${
            isDragging ? 'bg-accent/40' : 'hover:bg-accent/20'
          }`}
        >
          <div className={`w-0.5 h-8 rounded-full transition-colors ${isDragging ? 'bg-accent' : 'bg-transparent group-hover:bg-accent/50'}`} />
        </div>
      )}
    </div>
  )
}
