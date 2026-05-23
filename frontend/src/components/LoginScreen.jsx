import { FileText, Sparkles, Shield, Zap } from 'lucide-react'
import { getLoginUrl } from '../services/api'

export default function LoginScreen() {
  const handleLogin = () => {
    window.location.href = getLoginUrl();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-bg-color overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}} />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-10 max-w-md w-full px-6">
        {/* Logo & Title */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-2xl accent-gradient-bg flex items-center justify-center shadow-lg shadow-accent/30">
            <FileText size={36} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">
            Smart<span className="text-gradient">Agent</span>
          </h1>
          <p className="text-gray-400 text-center text-base leading-relaxed">
            AI-powered document analysis with intelligent search, 
            data extraction, and multi-document comparison.
          </p>
        </div>

        {/* Login Card */}
        <div className="w-full glass-panel p-8 flex flex-col gap-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-white mb-1">Welcome Back</h2>
            <p className="text-gray-400 text-sm">Sign in to access your workspaces</p>
          </div>

          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-800 font-medium py-3.5 px-6 rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] cursor-pointer"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-3 gap-4 w-full">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Sparkles size={18} className="text-accent" />
            </div>
            <span className="text-xs text-gray-400">Instant Answers</span>
          </div>
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Shield size={18} className="text-emerald-400" />
            </div>
            <span className="text-xs text-gray-400">Secure & Private</span>
          </div>
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Zap size={18} className="text-orange-400" />
            </div>
            <span className="text-xs text-gray-400">Smart Extraction</span>
          </div>
        </div>

        <p className="text-gray-500 text-xs">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  )
}
