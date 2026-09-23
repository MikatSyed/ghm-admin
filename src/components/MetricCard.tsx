'use client';

import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; isUp: boolean };
  color?: string;
}

export default function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = 'var(--primary)',
}: MetricCardProps) {
  return (
    <div
      className="card"
      style={{ position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
    >
      {/* Background glow */}
      <div
        style={{
          position: 'absolute',
          top: '-32px',
          right: '-32px',
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: color,
          filter: 'blur(60px)',
          opacity: 0.08,
          pointerEvents: 'none',
          transition: 'opacity 0.5s ease',
        }}
        className="metric-glow"
      />

      {/* Top row: icon + trend */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `${color}15`,
            color: color,
            border: `1px solid ${color}30`,
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            transition: 'all 0.5s ease',
          }}
          className="metric-icon"
        >
          {icon}
        </div>

        {trend && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              borderRadius: '99px',
              fontSize: '10px',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              background: trend.isUp ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              color: trend.isUp ? '#10b981' : '#ef4444',
              border: `1px solid ${trend.isUp ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            }}
          >
            {trend.isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {trend.value}%
          </div>
        )}
      </div>

      {/* Data */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <p
          style={{
            fontSize: '9px',
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            color: 'var(--text-muted)',
            opacity: 0.6,
            marginBottom: '6px',
          }}
        >
          {title}
        </p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <h3
            style={{
              fontSize: '2rem',
              fontWeight: 900,
              color: 'var(--text-main)',
              fontStyle: 'italic',
              letterSpacing: '-0.04em',
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {value}
          </h3>
        </div>
        {subtitle && (
          <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px', fontWeight: 700, opacity: 0.4, fontStyle: 'italic' }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: '3px',
          width: '100%',
          background: 'var(--overlay-soft)',
          borderRadius: '99px',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div
          style={{
            height: '100%',
            width: '65%',
            background: color,
            borderRadius: '99px',
            boxShadow: `0 0 10px ${color}`,
            transition: 'width 2s ease-out',
          }}
        />
      </div>
    </div>
  );
}
