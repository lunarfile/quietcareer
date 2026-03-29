'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    // Request persistent storage — prevents browser from evicting IndexedDB
    if (navigator.storage?.persist) {
      navigator.storage.persist().catch(() => {});
    }

    // Register service worker for offline support
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  return null;
}
