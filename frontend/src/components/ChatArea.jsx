import { Send, FileText } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

export default function ChatArea({ messages, onSendMessage, isLoading }) {
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;
    onSendMessage(inputMessage);
    setInputMessage("");
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto p-10 flex flex-col gap-6 scroll-smooth">
        {messages.map((msg) => {
          const isDocSummary = msg.sender === 'ai' && msg.text.startsWith('📄');

          return (
            <div 
              key={msg.id} 
              className={`max-w-[80%] p-4 rounded-2xl leading-relaxed text-[15px] animate-fade-in border ${
                isDocSummary
                  ? 'self-start bg-emerald-500/10 border-emerald-500/30 rounded-bl-sm border-l-4 border-l-emerald-400'
                  : msg.sender === 'user' 
                    ? 'self-end bg-msg-user border-accent/20 rounded-br-sm' 
                    : 'self-start bg-msg-ai border-panel-border rounded-bl-sm'
              }`}
            >
              {isDocSummary ? (
                <div>
                  <div className="flex items-center gap-2 mb-2 text-emerald-400 font-semibold text-xs uppercase tracking-wider">
                    <FileText size={14} />
                    Document Summary
                  </div>
                  <div className="text-gray-200 whitespace-pre-wrap">{msg.text}</div>
                </div>
              ) : (
                <span className="whitespace-pre-wrap">{msg.text}</span>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="self-start bg-msg-ai border border-panel-border rounded-2xl rounded-bl-sm p-4 max-w-[80%] animate-pulse">
            <div className="flex gap-1.5">
              <span className="w-2 h-2 bg-accent/60 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
              <span className="w-2 h-2 bg-accent/60 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
              <span className="w-2 h-2 bg-accent/60 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-6 px-10 bg-bg-color/80 backdrop-blur-md border-t border-panel-border">
        <form 
          className="flex items-center bg-panel-bg border border-panel-border rounded-2xl p-2 px-4 transition-all duration-300 focus-within:border-accent/50 focus-within:ring-4 focus-within:ring-accent/10" 
          onSubmit={handleSubmit}
        >
          <input 
            type="text" 
            className="flex-1 bg-transparent border-none text-gray-100 font-inherit text-[15px] p-3 outline-none placeholder:text-gray-500" 
            placeholder="Ask anything about your documents..." 
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={isLoading}
          />
          <button 
            type="submit" 
            disabled={isLoading}
            className="accent-gradient-bg border-none w-10 h-10 rounded-xl flex items-center justify-center text-white cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-[0_4px_12px_rgba(109,93,252,0.4)] active:scale-95 disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </form>
        <div className="text-center mt-3 text-xs text-gray-400">
          SmartAgent can make mistakes. Verify important information with the original documents.
        </div>
      </div>
    </>
  )
}
