import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ServiceWorkerRegistrar from '@/components/layout/ServiceWorker';
import SessionProvider from '@/components/layout/SessionProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'HelpDesk — Ticketing System',
  description: 'Internal helpdesk and ticketing system',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'HelpDesk',
  },
};

export const viewport: Viewport = {
  themeColor: '#4f46e5',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className={`${inter.className} h-full bg-slate-50`}>
        <SessionProvider>
          <ServiceWorkerRegistrar />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
