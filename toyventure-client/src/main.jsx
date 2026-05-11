import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from "@sentry/react";
import { BrowserRouter } from 'react-router-dom'; // Added this import
import App from './App.jsx';
import './index.css';

// 1. Import Provider and your Redux store
import { Provider } from 'react-redux';
import { store } from './app/store.js'; // Make sure this path matches where you saved store.js

// Initialize Sentry Telemetry for Frontend Crash Tracking
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || "",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  // Capture 100% of the transactions
  tracesSampleRate: 1.0, 
  replaysSessionSampleRate: 0.1, 
  replaysOnErrorSampleRate: 1.0, 
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* 2. Wrap your App with the Provider */}
    <Provider store={store}>
      {/* 3. Added BrowserRouter to fix the 'basename null' error */}
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);