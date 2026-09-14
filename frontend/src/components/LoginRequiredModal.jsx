import { LogIn, X } from 'lucide-react'
import { getLoginUrl } from '../services/api'

export default function LoginRequiredModal({ message, onClose }) {
  const handleLogin = () => {
    window.location.href = getLoginUrl();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in p-4">
      <div 
        className="glass-panel w-full max-w-sm rounded-2xl flex flex-col items-center justify-center overflow-hidden animate-slide-up shadow-2xl shadow-accent/20 border border-accent/20"
      >
        <div className="w-full flex justify-between items-center p-4 border-b border-panel-border">
          <h3 className="font-semibold text-white">Login Required</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors cursor-pointer p-1"
          >
            <X size={18} />
          </button>
        </div>
        
        <div className="p-6 flex flex-col items-center text-center gap-4">
          <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
            <LogIn className="text-accent w-6 h-6" />
          </div>
          
          <p className="text-gray-300 text-sm">
            {message}
          </p>

          <button
            onClick={handleLogin}
            className="mt-2 w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-800 font-medium py-3 px-6 rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] cursor-pointer"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>
          
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xs transition-colors cursor-pointer mt-1"
          >
            Keep exploring as guest
          </button>
        </div>
      </div>
    </div>
  );
}
