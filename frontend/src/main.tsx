import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import './index.css'

console.log("ByteQuest Entry Point [main.tsx] Loaded!");

const rootEl = document.getElementById('root');
if (!rootEl) {
  console.error("CRITICAL: Root element #root not found in DOM!");
} else {
  console.log("Root element #root found in DOM:", rootEl);
  try {
    const root = ReactDOM.createRoot(rootEl);
    console.log("Created root successfully:", root);
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );
    console.log("root.render called successfully!");
  } catch (err) {
    console.error("CRITICAL: Exception during ReactDOM.createRoot or render:", err);
  }
}
