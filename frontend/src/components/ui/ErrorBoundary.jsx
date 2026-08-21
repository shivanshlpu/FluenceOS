import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.warn('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '360px',
          padding: '32px 20px',
          textAlign: 'center',
          background: '#141220',
          borderRadius: '16px',
          border: '1px solid #2d2645',
          margin: '20px',
          color: '#f1f0f7'
        }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px'
          }}>
            <AlertTriangle size={26} color="#ef4444" />
          </div>

          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0' }}>
            Module Recovery Mode
          </h2>
          <p style={{ fontSize: '13px', color: '#a5a0c2', maxWidth: '420px', margin: '0 0 20px 0', lineHeight: 1.5 }}>
            This section encountered an unexpected condition. Your session is active and other tabs work smoothly.
          </p>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={this.handleReset}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '10px',
                background: '#8b5cf6',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={14} />
              Retry Module
            </button>
            <a
              href="/"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '10px',
                background: '#251f38',
                color: '#c4c0e5',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '13px'
              }}
            >
              <Home size={14} />
              Home
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
