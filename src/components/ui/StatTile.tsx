'use client';

import React from 'react';

interface StatTileProps {
  label: string;
  value: string | number;
  hint?: string;
  accent?: 'primary' | 'danger' | 'warning' | 'success';
  icon?: React.ReactNode;
  loading?: boolean;
}

const accentColor: Record<NonNullable<StatTileProps['accent']>, string> = {
  primary: 'var(--primary)',
  danger: '#ef4444',
  warning: '#f59e0b',
  success: '#10b981',
};

export function StatTile({ label, value, hint, accent = 'primary', icon, loading }: StatTileProps) {
  return (
    <div className="card" style={{ padding: '1rem', minHeight: '104px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
        <p style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          {label}
        </p>
        {icon && <div style={{ color: accentColor[accent], opacity: 0.8 }}>{icon}</div>}
      </div>
      <div style={{ marginTop: '0.85rem' }}>
        {loading ? (
          <div className="skeleton skeleton-line" style={{ width: '60%', height: '24px' }} />
        ) : (
          <p className="tabular-nums" style={{ fontSize: '24px', fontWeight: 900, color: accentColor[accent], lineHeight: 1.1 }}>
            {value}
          </p>
        )}
      </div>
      {hint && <p style={{ marginTop: '0.5rem', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>{hint}</p>}
    </div>
  );
}
