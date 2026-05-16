import { useState, useEffect } from 'react'
import { FileText, PanelRightOpen, Table } from 'lucide-react'
import Sidebar from './components/Sidebar'
import ChatArea from './components/ChatArea'
import UploadZone from './components/UploadZone'
import DocumentPanel from './components/DocumentPanel'
import SettingsModal from './components/SettingsModal'
import ExtractModal from './components/ExtractModal'
import { 
  getSessions, createSession, renameSession, deleteSession,
  uploadFile, chatWithSession, getDocuments, deleteDocument, getMessages
} from './services/api'

function App() {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [showDocPanel, setShowDocPanel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showExtract, setShowExtract] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

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
    if (!activeSessionId) return alert("Please select or create a session first.");
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
    if (!activeSessionId) return alert("Select a session first!");
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
              {activeSession ? activeSession.name : "Select a Session"}
            </h2>
            <div className="text-[13px] text-gray-400 flex items-center gap-1.5 mt-0.5">
              <FileText size={14} />
              {documents.length > 0 ? `${documents.length} document${documents.length > 1 ? 's' : ''} uploaded` : 'No documents yet'}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <UploadZone onUpload={handleUpload} isUploading={isUploading} />
            <button 
              onClick={() => setShowExtract(true)}
              className="p-2.5 rounded-xl border transition-all duration-200 bg-white/5 border-panel-border text-gray-400 hover:text-white hover:border-white/20"
              title="Extract structured data"
            >
              <Table size={18} />
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
          </div>
        </div>

        {/* Chat area */}
        <ChatArea messages={messages} onSendMessage={handleSendMessage} isLoading={isThinking} />
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
    </div>
  )
}

export default App
