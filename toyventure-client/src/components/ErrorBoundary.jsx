import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the frontend crash 
    console.error("Frontend UI Crash Caught:", error, errorInfo);
    
    // Note: If you want frontend crashes to also trigger an email, 
    // you would make a fetch() call here to a new backend endpoint (e.g., POST /api/log-client-error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-[80vh] flex items-center justify-center bg-surface relative px-6 py-24">
          <div className="absolute inset-0 doodle-bg opacity-30 pointer-events-none z-0"></div>
          
          <div className="card-surface p-12 md:p-20 rounded-[3rem] shadow-soft border border-white text-center max-w-2xl w-full relative z-10 flex flex-col items-center">
            <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-8 mx-auto shadow-inner">
              <span className="material-symbols-outlined text-[48px]">warning</span>
            </div>
            
            <h2 className="text-3xl font-black text-red-950 mb-4 tracking-tighter">Oops! Something Went Wrong.</h2>
            <p className="text-zinc-500 font-medium mb-10 max-w-md mx-auto leading-relaxed">
              Our team has been notified and they will working to fix this issue. Please try again later or try refreshing the page.
            </p>
            
            <button 
              onClick={() => window.location.href = '/'} 
              className="bg-red-600 text-white px-8 py-4 rounded-full font-black tracking-wide hover:bg-red-700 transition-all hover:-translate-y-1 shadow-lg shadow-red-600/30 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">refresh</span>
              Reload Page
            </button>
          </div>
        </main>
      );
    }
    return this.props.children; 
  }
}

export default ErrorBoundary;