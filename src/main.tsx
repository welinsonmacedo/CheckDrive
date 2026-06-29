import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from '@/src/App.tsx';
import '@/src/index.css';

// Suppress specific Supabase GoTrue errors that can happen in the background and are generally benign
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && typeof event.reason.message === 'string' && event.reason.message.includes('Refresh Token Not Found')) {
    event.preventDefault(); // Prevents the error from crashing or showing in console overlay
    console.warn('Ignored benign Supabase auth error:', event.reason.message);
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
