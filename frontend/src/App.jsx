import { useState, useEffect } from 'react'
import { FileText, PanelRightOpen, Table, SplitSquareHorizontal, LogOut, Bot, Menu } from 'lucide-react'
import Sidebar from './components/Sidebar'
import ChatArea from './components/ChatArea'
import UploadZone from './components/UploadZone'
import DocumentPanel from './components/DocumentPanel'
import SettingsModal from './components/SettingsModal'
import ExtractModal from './components/ExtractModal'
import CompareModal from './components/CompareModal'
import LoginScreen from './components/LoginScreen'
import { 
  getSessions, createSession, renameSession, deleteSession,
  uploadFile, chatWithSession, getDocuments, deleteDocument, getMessages,
  getMe, logout, setToken, clearToken
} from './services/api'

function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [isThinking, setIsThinking] = useState(false);
  const [showDocPanel, setShowDocPanel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showExtract, setShowExtract] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    // Capture token from URL if redirected from OAuth callback
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      setToken(token);
      // Clean the URL so the token isn't visible in the address bar
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const me = await getMe();
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setAuthChecked(true);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Cookie will be cleared regardless
    }
    clearToken();
    setUser(null);
    setSessions([]);
    setActiveSessionId(null);
    setMessages([]);
    setDocuments([]);
  };

  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user]);

  // Fetch documents and messages whenever active session changes
  useEffect(() => {
    if (activeSessionId) {
      fetchDocuments(activeSessionId);
      fetchSessionMessages(activeSessionId);
    } else {
      setDocuments([]);
      setMessages([]);
    }
  }, [activeSessionId]);

  const fetchSessions = async () => {
    try {
      const data = await getSessions();
      setSessions(data);
      if (data.length > 0 && !activeSessionId) {
        setActiveSessionId(data[0].session_id);
      }
    } catch (e) {
      console.error("Failed to fetch sessions", e);
    }
  };

  const fetchDocuments = async (sessionId) => {
    try {
      const data = await getDocuments(sessionId);
      setDocuments(data);
    } catch (e) {
      console.error("Failed to fetch documents", e);
    }
  };

  const fetchSessionMessages = async (sessionId) => {
    try {
      const data = await getMessages(sessionId);
      if (data.length === 0) {
        setMessages([{ id: 'default', text: "Hello! I'm your AI Document Analyst. Upload a file to get started.", sender: "ai" }]);
      } else {
        setMessages(data);
      }
    } catch (e) {
      console.error("Failed to fetch messages", e);
    }
  };

  const handleCreateSession = async () => {
    try {
      const newSession = await createSession();
      setSessions([newSession, ...sessions]);
      setActiveSessionId(newSession.session_id);
      setMessages([{ id: 'default', text: "New session created! Upload a document to get started.", sender: "ai" }]);
      setDocuments([]);
    } catch (e) {
      console.error("Failed to create session", e);
    }
  };

  const handleRenameSession = async (sessionId, name) => {
    try {
      const updated = await renameSession(sessionId, name);
      setSessions(sessions.map(s => s.session_id === sessionId ? updated : s));
    } catch (e) {
      console.error("Failed to rename session", e);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    try {
      await deleteSession(sessionId);
      const remaining = sessions.filter(s => s.session_id !== sessionId);
      setSessions(remaining);
      if (activeSessionId === sessionId) {
        setActiveSessionId(remaining.length > 0 ? remaining[0].session_id : null);
      }
    } catch (e) {
      console.error("Failed to delete session", e);
    }
  };

  const handleUpload = async (files) => {
    if (!activeSessionId || !files || files.length === 0) return;
    setIsUploading(true);
    const total = files.length;
    let failedFiles = [];

    for (let i = 0; i < total; i++) {
      setUploadProgress({ current: i + 1, total });
      try {
        await uploadFile(activeSessionId, files[i]);
      } catch (e) {
        failedFiles.push(files[i].name);
      }
    }

    // Refresh documents and messages once after all uploads complete
    fetchSessionMessages(activeSessionId);
    fetchDocuments(activeSessionId);

    if (failedFiles.length > 0) {
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: `⚠️ Failed to upload: ${failedFiles.join(", ")}. Please check the file format and try again.`,
        sender: "ai"
      }]);
    }

    setIsUploading(false);
    setUploadProgress(null);
  };

  const handleDeleteDocument = async (docId) => {
    try {
      const res = await deleteDocument(activeSessionId, docId);
      setDocuments(documents.filter(d => d.id !== docId));
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: `Removed "${res.filename}" from this session.`,
        sender: "ai"
      }]);
    } catch (e) {
      console.error("Failed to delete document", e);
    }
  };

  const handleSendMessage = async (text) => {
    if (!activeSessionId) return;
    const newMsg = { id: Date.now(), text, sender: "user" };
    setMessages(prev => [...prev, newMsg]);
    setIsThinking(true);

    try {
      const res = await chatWithSession(activeSessionId, text);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: res.answer,
        sender: "ai",
        sources: res.sources || []
      }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: "Error communicating with the AI agent. Please try again later.",
        sender: "ai"
      }]);
    }
    setIsThinking(false);
  };

  // Show loading while checking auth
  if (!authChecked) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-bg-color">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-accent/30 border-t-accent animate-spin" />
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!user) {
    return <LoginScreen />;
  }

  const activeSession = sessions.find(s => s.session_id === activeSessionId);

  return (
    <div className="flex h-screen w-screen bg-bg-color text-gray-100 font-sans overflow-hidden">
      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)} 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden animate-fade-in"
        />
      )}

      {/* Mobile Document Panel Backdrop */}
      {showDocPanel && (
        <div 
          onClick={() => setShowDocPanel(false)} 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden animate-fade-in"
        />
      )}

      <Sidebar 
        sessions={sessions} 
        activeSession={activeSessionId} 
        onSelectSession={(id) => { setActiveSessionId(id); setIsSidebarOpen(false); }} 
        onCreateSession={() => { handleCreateSession(); setIsSidebarOpen(false); }}
        onRenameSession={handleRenameSession}
        onDeleteSession={handleDeleteSession}
        onOpenSettings={() => { setShowSettings(true); setIsSidebarOpen(false); }}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeSessionObj={activeSession}
        documentsCount={documents.length}
        onOpenExtract={() => { setShowExtract(true); setIsSidebarOpen(false); }}
        onOpenCompare={() => { setShowCompare(true); setIsSidebarOpen(false); }}
        onOpenDocPanel={() => { setShowDocPanel(true); setIsSidebarOpen(false); }}
      />

      <div className="flex-1 flex flex-col relative min-w-0">
        {/* Top bar */}
        <div className="h-16 flex items-center justify-between px-4 md:px-10 border-b border-panel-border bg-bg-color/60 backdrop-blur-md z-10 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl border border-panel-border bg-white/5 text-gray-400 hover:text-white shrink-0 cursor-pointer"
              title="Open sidebar"
            >
              <Menu size={18} />
            </button>
            <div className="truncate">
              <h2 className="text-base md:text-lg font-semibold truncate">
                {activeSession ? activeSession.name : "Welcome to Smart Agent"}
              </h2>
              <div className="text-[11px] md:text-[13px] text-gray-400 flex items-center gap-1.5 mt-0.5 truncate">
                {activeSession ? (
                  <>
                    <FileText size={14} className="shrink-0" />
                    <span className="truncate">
                      {documents.length > 0 ? `${documents.length} document${documents.length > 1 ? 's' : ''}` : 'No documents'}
                    </span>
                  </>
                ) : (
                  "Get started by selecting or creating a session"
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
            {activeSession && (
              <>
                <UploadZone onUpload={handleUpload} isUploading={isUploading} uploadProgress={uploadProgress} />
                <button 
                  onClick={() => setShowExtract(true)}
                  className="hidden md:inline-flex p-2 md:p-2.5 rounded-xl border transition-all duration-200 bg-white/5 border-panel-border text-gray-400 hover:text-white hover:border-white/20 cursor-pointer"
                  title="Extract structured data"
                >
                  <Table className="w-4 h-4 md:w-[18px] md:h-[18px]" />
                </button>
                <button 
                  onClick={() => setShowCompare(true)}
                  className="hidden md:inline-flex p-2 md:p-2.5 rounded-xl border transition-all duration-200 bg-white/5 border-panel-border text-gray-400 hover:text-orange-400 hover:border-orange-500/30 cursor-pointer"
                  title="Compare Documents"
                >
                  <SplitSquareHorizontal className="w-4 h-4 md:w-[18px] md:h-[18px]" />
                </button>
                <button 
                  onClick={() => setShowDocPanel(!showDocPanel)}
                  className={`hidden md:inline-flex p-2 md:p-2.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                    showDocPanel 
                      ? 'bg-accent/10 border-accent/30 text-accent' 
                      : 'bg-white/5 border-panel-border text-gray-400 hover:text-white hover:border-white/20'
                  }`}
                  title="Toggle document panel"
                >
                  <PanelRightOpen className="w-4 h-4 md:w-[18px] md:h-[18px]" />
                </button>
              </>
            )}

            {/* User profile & logout */}
            <div className={`flex items-center gap-1.5 md:gap-2 ml-1 md:ml-2 pl-2 md:pl-3 ${activeSession ? 'border-l border-panel-border' : ''} shrink-0`}>
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-7 h-7 md:w-8 md:h-8 rounded-full border border-panel-border"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-accent/20 flex items-center justify-center text-xs md:text-sm font-semibold text-accent">
                  {user.name?.[0] || '?'}
                </div>
              )}
              <button
                onClick={handleLogout}
                className="p-1.5 md:p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 cursor-pointer"
                title="Logout"
              >
                <LogOut className="w-4 h-4 md:w-[16px] md:h-[16px]" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        {activeSession ? (
          <ChatArea messages={messages} onSendMessage={handleSendMessage} isLoading={isThinking} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-b from-bg-color to-bg-color/50">
            <div className="w-24 h-24 bg-accent/10 rounded-[2rem] flex items-center justify-center mb-8 shadow-2xl shadow-accent/20 border border-accent/20">
              <Bot size={48} className="text-accent drop-shadow-md" />
            </div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 mb-4">
              Your AI Document Analyst
            </h1>
            <p className="text-gray-400 text-center max-w-md mb-10 leading-relaxed text-[15px]">
              Securely upload PDFs, extract structured tables, and chat intelligently with your data using our advanced AI analysis engine.
            </p>
            <button 
              onClick={handleCreateSession}
              className="px-8 py-3.5 bg-accent hover:bg-accent-hover text-white font-medium rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] hover:-translate-y-0.5 flex items-center gap-2"
            >
              Start New Session
            </button>
          </div>
        )}
      </div>

      {/* Document panel (right side) */}
      {showDocPanel && (
        <DocumentPanel 
          documents={documents} 
          onDelete={handleDeleteDocument} 
          onClose={() => setShowDocPanel(false)} 
        />
      )}

      {/* Settings modal */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/* Extract data modal */}
      {showExtract && <ExtractModal sessionId={activeSessionId} onClose={() => setShowExtract(false)} />}

      {/* Compare modal */}
      {showCompare && (
        <CompareModal 
          sessionId={activeSessionId} 
          documents={documents} 
          onClose={() => setShowCompare(false)}
          onComparisonComplete={() => fetchSessionMessages(activeSessionId)}
        />
      )}
    </div>
  )
}

export default App
