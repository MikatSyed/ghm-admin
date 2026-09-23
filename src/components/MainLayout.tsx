'use client';

import React from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--background)' }}>
      <Sidebar />
      <div style={{ flex: '1 1 0%', display: 'flex', flexDirection: 'column', minWidth: 0, background: 'var(--background)' }}>
        <Topbar />
        <main
          className="custom-scrollbar"
          style={{
            flex: '1 1 0%',
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '1.5rem',
            background: 'var(--background)',
          }}
        >
          <div className="animate-fade-in" style={{ width: '100%', maxWidth: '100%' }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
