'use client';

import { useEffect } from 'react';

/**
 * Detects if running inside Capacitor and adds safe area padding.
 * Android WebView doesn't support env(safe-area-inset-*) reliably.
 * This component adds a CSS class with explicit padding values.
 */
export function CapacitorSafeArea() {
  useEffect(() => {
    // Detect Capacitor
    const isCapacitor = typeof window !== 'undefined' && !!(window as unknown as { Capacitor?: unknown }).Capacitor;

    if (isCapacitor) {
      document.documentElement.classList.add('capacitor');

      // Android status bar is typically 24-48dp depending on device
      // Navigation bar is typically 48dp
      // Set CSS custom properties for safe areas
      const root = document.documentElement;
      root.style.setProperty('--safe-top', '36px');
      root.style.setProperty('--safe-bottom', '24px');
    }
  }, []);

  return null;
}
