import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const originalWarn = console.warn;
console.warn = (...args) => {
  const message = args[0]?.toString() || '';
  if (message.includes('width(-1)') || message.includes('height(-1)') || message.includes('ERR_INTERNET_DISCONNECTED')) {
    return;
  }
  originalWarn(...args);
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
