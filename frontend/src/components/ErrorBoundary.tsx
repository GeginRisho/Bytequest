import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ByteQuest Uncaught Runtime Error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-[#2A0F0F] via-[#1A0505] to-[#000000] text-white flex flex-col items-center justify-center p-6 text-center select-none font-sans">
          <div className="max-w-md w-full bg-[#3B0F0F] border-3 border-[#D4AF37] p-8 rounded-[2rem] shadow-[0_0_50px_rgba(211,47,47,0.3)] flex flex-col items-center relative overflow-hidden">
            {/* Ambient gold glow */}
            <div className="absolute -top-12 -left-12 w-24 h-24 bg-[#D4AF37]/10 rounded-full blur-xl"></div>
            
            <div className="w-16 h-16 bg-[#5A1A1A] border-2 border-[#D4AF37]/60 rounded-full flex items-center justify-center text-3xl mb-4 shadow-inner">
              ⚠️
            </div>
            
            <h1 className="font-adventure text-3xl font-extrabold text-[#FFD700] tracking-wider uppercase mb-1 drop-shadow-md">
              BYTEQUEST
            </h1>
            
            <h2 className="text-amber-200/90 text-sm font-bold uppercase tracking-widest mb-6 border-b border-[#D4AF37]/20 pb-3 w-full">
              Something went wrong.
            </h2>

            <p className="text-xs text-stone-300 leading-relaxed mb-6">
              The explorer client encountered an unexpected runtime anomaly. Let's restart the quest and try again!
            </p>

            {this.state.error && (
              <div className="w-full bg-[#1A0505] border border-red-900/50 p-3 rounded-xl mb-6 text-left overflow-x-auto max-h-32 text-[10px] font-mono text-red-400 select-text">
                <span className="font-bold text-red-300 block mb-1">Details:</span>
                {this.state.error.toString()}
              </div>
            )}

            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-gradient-to-r from-[#D4AF37] to-[#F6E27A] hover:from-[#F6E27A] hover:to-[#D4AF37] text-[#2A0F0F] font-bold rounded-xl active:scale-95 transition-all text-xs font-adventure tracking-wider uppercase shadow-md"
            >
              🔄 Reload Game
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
