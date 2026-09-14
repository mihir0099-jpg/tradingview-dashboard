import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '24px',
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '12px',
          margin: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          textAlign: 'center'
        }}>
          <AlertTriangle size={36} color="#ef4444" />
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#f87171' }}>
            {this.props.fallbackTitle || 'Tab Display Error'}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', maxWidth: '500px', fontFamily: 'monospace' }}>
            {this.state.error?.message || 'An unexpected rendering error occurred in this tab.'}
          </div>
          <button
            onClick={this.handleReset}
            style={{
              marginTop: '8px',
              padding: '8px 16px',
              background: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw size={14} /> Retry Tab
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
