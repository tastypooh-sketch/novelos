import React, { Component, ErrorInfo, ReactNode } from 'react';
import { INovelState } from '../../types';
import { RefreshIcon, SaveIcon } from './Icons';

interface ErrorBoundaryProps {
  children?: ReactNode;
  state: INovelState;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary component to catch rendering errors and provide a rescue backup option.
 */
// Fix: Use React.Component explicitly to ensure standard React component inheritance is recognized by TypeScript
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Fix: Initializing state property in class body to ensure it's recognized by TypeScript as part of ErrorBoundary
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    // Fix: Accessing setState method inherited from React.Component
    this.setState({ errorInfo });
  }

  // Fix: Arrow function preserves instance context for accessing inherited props
  private handleEmergencySave = () => {
    try {
        // Fix: Accessing props correctly via this.props inherited from React.Component
        const backupData = JSON.stringify(this.props.state, null, 2);
        const blob = new Blob([backupData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        a.download = `novelos_rescue_backup_${timestamp}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (e) {
        alert("Failed to generate backup file. Please check console for data.");
        console.error("Backup failed:", e);
        // Fix: Safely accessing props within the class instance context
        if (this.props && this.props.state) {
            console.log("Current State:", this.props.state);
        }
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  render(): ReactNode {
    // Fix: Accessing state inherited from React.Component via this.state
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gray-900 text-white p-8 text-center font-sans">
          <div className="bg-red-900/20 border border-red-500/50 p-8 rounded-xl max-w-2xl shadow-2xl backdrop-blur-md">
            <h1 className="text-3xl font-bold text-red-400 mb-4">Novelos Encountered a Problem</h1>
            <p className="text-gray-300 mb-6 text-lg">
              Don't worry, your data is safe in memory. We recommend downloading a rescue backup immediately.
            </p>
            
            <div className="bg-black/50 p-4 rounded text-left overflow-auto max-h-48 mb-8 font-mono text-xs text-red-300 border border-red-500/20">
              {/* Fix: Accessing error information from component state instance */}
              {this.state.error && this.state.error.toString()}
              <br />
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </div>

            <div className="flex items-center justify-center gap-4 mt-6">
              <button 
                onClick={this.handleEmergencySave}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-green-600 hover:bg-green-700 transition-colors font-bold text-white shadow-lg"
              >
                <SaveIcon className="h-5 w-5" />
                Download Rescue Backup
              </button>
              <button 
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors font-semibold border border-gray-600"
              >
                <RefreshIcon className="h-5 w-5" />
                Reload Application
              </button>
            </div>
            <p className="mt-6 text-xs text-gray-500 text-center">
              After downloading the backup, you can import it via the "Import" button if your data does not load automatically upon reload.
            </p>
          </div>
        </div>
      );
    }

    // Fix: Accessing props inherited from React.Component via this.props
    return this.props.children;
  }
}
