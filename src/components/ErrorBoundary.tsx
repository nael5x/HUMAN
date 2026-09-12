import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught system error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-6 bg-[#020306] text-neutral-300 font-mono text-center select-none">
          <div className="max-w-md border border-neutral-800 bg-neutral-950/80 p-8 space-y-4 shadow-2xl">
            <div className="text-red-400 font-bold text-xs tracking-widest uppercase">
              VISUAL SENSOR EXCEPTION // RECOVERY MODE
            </div>
            <h1 className="text-xl font-bold text-white uppercase">
              EXPERIMENT RUNTIME FAULT
            </h1>
            <p className="text-xs text-neutral-500 leading-relaxed">
              The environmental renderer encountered an unexpected hardware constraint. Optical pipeline terminated gracefully.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-6 py-2.5 bg-white text-black font-bold text-xs tracking-widest uppercase hover:bg-neutral-200 cursor-pointer"
            >
              RE-INITIALIZE
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
