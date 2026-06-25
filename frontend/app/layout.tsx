import type { Metadata } from "next";
import { Toaster } from 'react-hot-toast';
import { AppProvider } from './lib/store';
import "./globals.css";

export const metadata: Metadata = {
  title: "PostmanClone",
  description: "A full-featured Postman API client clone",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, overflow: 'hidden' }}>
        <AppProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#1e2a3a',
                color: '#e8edf2',
                border: '1px solid #2d4060',
                fontSize: '13px',
              },
              success: { iconTheme: { primary: '#49cc90', secondary: '#1e2a3a' } },
              error: { iconTheme: { primary: '#f93e3e', secondary: '#1e2a3a' } },
            }}
          />
        </AppProvider>
      </body>
    </html>
  );
}
