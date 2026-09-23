'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import MainLayout from '@/components/MainLayout';
import { Settings, Package, Layers, ChevronRight, LayoutGrid } from 'lucide-react';
import ProductsPage from '../products/page';
import CategoriesPage from '../categories/page';

type Tab = 'products' | 'categories';

function SettingsPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const rawTab = searchParams.get('tab');
  const tab: Tab = rawTab === 'categories' ? 'categories' : 'products';

  const setTab = (next: Tab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', next);
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '4rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          padding: '14px',
          background: 'rgba(16,185,129,0.1)',
          borderRadius: '18px',
          color: 'var(--primary)',
          border: '1px solid rgba(16,185,129,0.2)',
          boxShadow: '0 0 24px rgba(16,185,129,0.1)'
        }}>
          <Settings size={28} />
        </div>
        <div>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 900,
            color: 'var(--text-main)',
            textTransform: 'uppercase',
            fontStyle: 'italic',
            lineHeight: 1.1,
            letterSpacing: '-0.03em'
          }}>
            System <span style={{ color: 'var(--primary)' }}>Settings</span>
          </h1>
          <p style={{
            fontSize: '10px',
            fontWeight: 900,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.3em',
            opacity: 0.6,
            marginTop: '4px'
          }}>
            Master Data & Catalog Management
          </p>
        </div>
      </div>

      {/* Tabs Bar */}
      <div style={{
        display: 'flex',
        gap: '8px',
        padding: '6px',
        background: 'var(--surface)',
        borderRadius: '16px',
        border: '1px solid var(--border)',
        alignSelf: 'flex-start'
      }}>
        <button
          onClick={() => setTab('products')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 20px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            cursor: 'pointer',
            transition: 'all 0.2s',
            border: 'none',
            background: tab === 'products' ? 'rgba(16,185,129,0.12)' : 'transparent',
            color: tab === 'products' ? 'var(--primary)' : 'var(--text-muted)'
          }}
        >
          <Package size={16} />
          Products
        </button>
        <button
          onClick={() => setTab('categories')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 20px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            cursor: 'pointer',
            transition: 'all 0.2s',
            border: 'none',
            background: tab === 'categories' ? 'rgba(16,185,129,0.12)' : 'transparent',
            color: tab === 'categories' ? 'var(--primary)' : 'var(--text-muted)'
          }}
        >
          <Layers size={16} />
          Categories
        </button>
      </div>

      {/* Content */}
      <div className="animate-fade-in" style={{ animationDuration: '0.4s' }}>
        {tab === 'products' ? (
          <div style={{ border: '1px solid var(--border)', borderRadius: '24px', padding: '1rem', background: 'rgba(255,255,255,0.01)' }}>
            <ProductsPage hideLayout />
          </div>
        ) : (
          <div style={{ border: '1px solid var(--border)', borderRadius: '24px', padding: '1rem', background: 'rgba(255,255,255,0.01)' }}>
            <CategoriesPage hideLayout />
          </div>
        )}
      </div>
    </div>
  );
}

export default function SettingsWrapper() {
  return (
    <MainLayout>
      <Suspense fallback={null}>
        <SettingsPageInner />
      </Suspense>
    </MainLayout>
  );
}
