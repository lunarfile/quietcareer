import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/layout/app-shell';
import { ThemeProvider } from '@/lib/theme';
import { AuthProvider } from '@/lib/auth-context';
import { ServiceWorkerRegistrar } from '@/components/pwa/sw-registrar';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'QuietCareer — Private Career Intelligence',
  description:
    'A private career intelligence system for navigating a volatile job market. Your data never leaves your device.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'QuietCareer',
  },
};

export const viewport: Viewport = {
  themeColor: '#C9A84C',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <script src="/capacitor-safe-area.js" />
        <script src="https://accounts.google.com/gsi/client" async />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-accent focus:text-text-inverse focus:rounded-[var(--radius-sm)]">
          Skip to content
        </a>
        <AuthProvider>
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
        </AuthProvider>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
