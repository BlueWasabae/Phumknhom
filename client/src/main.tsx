import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

// Mobile anti-zoom lock: block iOS pinch gestures, multi-touch page zoom & accidental double-tap zoom
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const preventZoom = (e: Event) => {
    e.preventDefault();
  };
  document.addEventListener('gesturestart', preventZoom, { passive: false });
  document.addEventListener('gesturechange', preventZoom, { passive: false });
  document.addEventListener('gestureend', preventZoom, { passive: false });

  document.addEventListener(
    'touchmove',
    (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    },
    { passive: false }
  );

  let lastTouchEnd = 0;
  document.addEventListener(
    'touchend',
    (e: TouchEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const now = Date.now();
      if (now - lastTouchEnd <= 280) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    },
    { passive: false }
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
