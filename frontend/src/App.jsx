import { useState, useEffect } from 'react'
import { FileText, PanelRightOpen, Table, SplitSquareHorizontal, LogOut, Bot } from 'lucide-react'
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
  getMe, logout
} from './services/api'

function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [showDocPanel, setShowDocPanel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showExtract, setShowExtract] = useState(false);
  const [showCompare, setShowCompare] = useState(false);

  // Check authentication on mount
  useEffect(() => {
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
        setMessages([{ id: 'default', text: "Hello! I'm your Smart Document Agent. Create a session and upload a file to get started.", sender: "ai" }]);
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

  const handleUpload = async (file) => {
    if (!activeSessionId) return;
    setIsUploading(true);
    try {
      await uploadFile(activeSessionId, file);
      // Reload messages from DB (the backend saved the AI summary automatically)
      fetchSessionMessages(activeSessionId);
      fetchDocuments(activeSessionId);
    } catch (e) {
      alert("Upload failed. Make sure your Python backend is running.");
    }
    setIsUploading(false);
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
        text: "Error communicating with the agent. Ensure GEMINI_API_KEY is set in your backend .env file.",
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
      <Sidebar 
        sessions={sessions} 
        activeSession={activeSessionId} 
        onSelectSession={setActiveSessionId} 
        onCreateSession={handleCreateSession}
        onRenameSession={handleRenameSession}
        onDeleteSession={handleDeleteSession}
        onOpenSettings={() => setShowSettings(true)}
      />

      <div className="flex-1 flex flex-col relative">
        {/* Top bar */}
        <div className="h-16 flex items-center justify-between px-10 border-b border-panel-border bg-bg-color/60 backdrop-blur-md z-10">
          <div>
            <h2 className="text-lg font-semibold">
              {activeSession ? activeSession.name : "Welcome to Smart Agent"}
            </h2>
            <div className="text-[13px] text-gray-400 flex items-center gap-1.5 mt-0.5">
              {activeSession ? (
                <>
                  <FileText size={14} />
                  {documents.length > 0 ? `${documents.length} document${documents.length > 1 ? 's' : ''} uploaded` : 'No documents yet'}
                </>
              ) : (
                "Get started by selecting or creating a session"
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {activeSession && (
              <>
                <UploadZone onUpload={handleUpload} isUploading={isUploading} />
                <button 
                  onClick={() => setShowExtract(true)}
                  className="p-2.5 rounded-xl border transition-all duration-200 bg-white/5 border-panel-border text-gray-400 hover:text-white hover:border-white/20"
                  title="Extract structured data"
                >
                  <Table size={18} />
                </button>
                <button 
                  onClick={() => setShowCompare(true)}
                  className="p-2.5 rounded-xl border transition-all duration-200 bg-white/5 border-panel-border text-gray-400 hover:text-orange-400 hover:border-orange-500/30"
                  title="Compare Documents"
                >
                  <SplitSquareHorizontal size={18} />
                </button>
                <button 
                  onClick={() => setShowDocPanel(!showDocPanel)}
                  className={`p-2.5 rounded-xl border transition-all duration-200 ${
                    showDocPanel 
                      ? 'bg-accent/10 border-accent/30 text-accent' 
                      : 'bg-white/5 border-panel-border text-gray-400 hover:text-white hover:border-white/20'
                  }`}
                  title="Toggle document panel"
                >
                  <PanelRightOpen size={18} />
                </button>
              </>
            )}

            {/* User profile & logout */}
            <div className={`flex items-center gap-2 ml-2 pl-3 ${activeSession ? 'border-l border-panel-border' : ''}`}>
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-8 h-8 rounded-full border border-panel-border"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-sm font-semibold text-accent">
                  {user.name?.[0] || '?'}
                </div>
              )}
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                title="Logout"
              >
                <LogOut size={16} />
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
              Securely upload PDFs, extract structured tables, and chat intelligently with your data using Gemini and pgvector.
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
