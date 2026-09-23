import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Terminal Panel Error caught by ErrorBoundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-[#111317] border border-down/40 p-4 text-xs font-mono text-text text-center select-none">
          <AlertTriangle className="w-6 h-6 text-down mb-2" />
          <div className="font-bold text-down mb-1 uppercase tracking-wider">
            {this.props.fallbackTitle || 'Panel Rendering Interrupted'}
          </div>
          <div className="text-muted text-[11px] max-w-sm mb-3 font-mono break-words bg-black/50 p-2 rounded">
            {this.state.error?.message || 'An unexpected runtime exception occurred.'}
          </div>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-3 py-1 bg-white/10 hover:bg-white/20 text-text rounded flex items-center space-x-1 text-xs transition-colors"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            <span>Recover Panel</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
