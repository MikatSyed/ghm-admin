'use client';

interface QuickFilterChipsProps<T extends string> {
  value: T;
  options: ReadonlyArray<{ key: T; label: string }>;
  onChange: (key: T) => void;
}

export function QuickFilterChips<T extends string>({ value, options, onChange }: QuickFilterChipsProps<T>) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      {options.map((option) => {
        const active = option.key === value;
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            className={active ? 'quick-filter-chip chip-active' : 'quick-filter-chip'}
            style={{
              borderRadius: '999px',
              padding: '6px 14px',
              border: active ? '1px solid var(--primary)' : '1px solid var(--border)',
              background: active ? 'var(--primary)' : 'var(--surface)',
              color: active ? 'white' : 'var(--text-main)',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
