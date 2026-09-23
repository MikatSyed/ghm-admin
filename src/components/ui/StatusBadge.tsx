'use client';

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  pending:       { bg: 'rgba(245,158,11,0.1)',  text: '#f59e0b',  dot: '#f59e0b' },
  approved:      { bg: 'rgba(16,185,129,0.1)',  text: '#10b981',  dot: '#10b981' },
  rejected:      { bg: 'rgba(239,68,68,0.1)',   text: '#ef4444',  dot: '#ef4444' },
  active:        { bg: 'rgba(16,185,129,0.1)',  text: '#10b981',  dot: '#10b981' },
  optimal:       { bg: 'rgba(16,185,129,0.1)',  text: '#10b981',  dot: '#10b981' },
  low:           { bg: 'rgba(245,158,11,0.1)',  text: '#f59e0b',  dot: '#f59e0b' },
  critical:      { bg: 'rgba(239,68,68,0.1)',   text: '#ef4444',  dot: '#ef4444' },
  high:          { bg: 'rgba(239,68,68,0.1)',   text: '#ef4444',  dot: '#ef4444' },
  medium:        { bg: 'rgba(245,158,11,0.1)',  text: '#f59e0b',  dot: '#f59e0b' },
  sale:          { bg: 'rgba(16,185,129,0.1)',  text: '#10b981',  dot: '#10b981' },
  expense:       { bg: 'rgba(239,68,68,0.1)',   text: '#ef4444',  dot: '#ef4444' },
  stock:         { bg: 'rgba(59,130,246,0.1)',  text: '#3b82f6',  dot: '#3b82f6' },
  warning:       { bg: 'rgba(245,158,11,0.1)',  text: '#f59e0b',  dot: '#f59e0b' },
  unpaid:        { bg: 'rgba(245,158,11,0.1)',  text: '#f59e0b',  dot: '#f59e0b' },
  paid:          { bg: 'rgba(16,185,129,0.1)',  text: '#10b981',  dot: '#10b981' },
  completed:     { bg: 'rgba(16,185,129,0.1)',  text: '#10b981',  dot: '#10b981' },
  cancelled:     { bg: 'rgba(136,136,136,0.1)', text: '#888',     dot: '#888' },
};

const fallback = { bg: 'rgba(136,136,136,0.1)', text: '#888', dot: '#888' };

export function StatusBadge({ status, size = 'sm' }: { status: string; size?: 'xs' | 'sm' }) {
  const config = statusConfig[status.toLowerCase()] || fallback;
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        borderRadius: '8px',
        fontWeight: 900,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        background: config.bg,
        color: config.text,
        border: '1px solid var(--border)',
        padding: size === 'xs' ? '2px 8px' : '5px 10px',
        fontSize: size === 'xs' ? '8px' : '9px',
        boxShadow: '0 0 15px rgba(0,0,0,0.15)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: config.dot,
          boxShadow: `0 0 8px ${config.dot}`,
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  );
}
