import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global error logger for diagnostics
window.onerror = function (message, source, lineno, colno, error) {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="padding: 20px; background: #990000; color: white; font-family: monospace; font-size: 14px; line-height: 1.5; border-radius: 8px; margin: 20px; text-align: left; z-index: 999999; position: relative;">
        <h3 style="margin-top: 0;">🔴 Runtime JS Error:</h3>
        <p><strong>Message:</strong> ${message}</p>
        <p><strong>Source:</strong> ${source}:${lineno}:${colno}</p>
        <pre style="background: rgba(0,0,0,0.2); padding: 10px; border-radius: 4px; overflow-x: auto; white-space: pre-wrap;">${error?.stack || 'No stack trace available'}</pre>
      </div>
    `;
  }
  return false;
};

window.onunhandledrejection = function (event) {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="padding: 20px; background: #990000; color: white; font-family: monospace; font-size: 14px; line-height: 1.5; border-radius: 8px; margin: 20px; text-align: left; z-index: 999999; position: relative;">
        <h3 style="margin-top: 0;">🔴 Unhandled Promise Rejection:</h3>
        <p><strong>Reason:</strong> ${event.reason}</p>
        <pre style="background: rgba(0,0,0,0.2); padding: 10px; border-radius: 4px; overflow-x: auto; white-space: pre-wrap;">${event.reason?.stack || 'No stack trace available'}</pre>
      </div>
    `;
  }
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
