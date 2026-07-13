import React from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

export default class AdminErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error("AdminErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center">
          <div className="mb-6 rounded-full bg-rose-100 p-6 text-rose-600">
            <AlertTriangle className="h-12 w-12" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-slate-900">Something went wrong loading this page.</h1>
          <p className="mb-8 max-w-md text-slate-500">
            {this.state.error?.message || "An unexpected error occurred in the admin dashboard."}
          </p>
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            <RefreshCcw className="h-4 w-4" />
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
