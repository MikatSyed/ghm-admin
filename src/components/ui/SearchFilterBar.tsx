'use client';

import React from 'react';
import { Search, SlidersHorizontal, X, Download } from 'lucide-react';

interface FilterOption {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

interface SearchFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder?: string;
  filters?: FilterOption[];
  activeFilters?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;
  onClearFilters?: () => void;
  onExport?: () => void;
}

export function SearchFilterBar({
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search system...',
  filters = [],
  activeFilters = {},
  onFilterChange,
  onClearFilters,
  onExport,
}: SearchFilterBarProps) {
  const hasActiveFilters = Object.values(activeFilters).some((v) => v && v !== 'all');
  const activeCount = Object.values(activeFilters).filter((v) => v && v !== 'all').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }} className="animate-fade-in">
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '280px' }} className="search-group">
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'var(--primary)',
              filter: 'blur(16px)',
              opacity: 0,
              borderRadius: '16px',
              transition: 'opacity 0.3s ease',
              pointerEvents: 'none',
            }}
            className="search-glow"
          />
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="input-premium"
            style={{ width: '100%', paddingLeft: '44px', paddingRight: '16px', borderRadius: '14px' }}
          />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
          {filters.map((filter) => {
            const isActive = activeFilters[filter.key] && activeFilters[filter.key] !== 'all';
            return (
              <div key={filter.key} style={{ position: 'relative' }}>
                <select
                  value={activeFilters[filter.key] || 'all'}
                  onChange={(e) => onFilterChange?.(filter.key, e.target.value)}
                  style={{
                    appearance: 'none',
                    borderRadius: '12px',
                    padding: '0.625rem 2.5rem 0.625rem 1rem',
                    fontSize: '11px',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    cursor: 'pointer',
                    border: '1px solid',
                    background: isActive ? 'rgba(16,185,129,0.05)' : 'var(--surface)',
                    borderColor: isActive ? 'rgba(16,185,129,0.3)' : 'var(--border-soft)',
                    color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                    boxShadow: isActive ? '0 0 15px rgba(16,185,129,0.08)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <option value="all">{filter.label}</option>
                  {filter.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <SlidersHorizontal
                  size={12}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                    opacity: isActive ? 1 : 0.4,
                  }}
                />
              </div>
            );
          })}

          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0.625rem 1rem',
                fontSize: '10px',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--text-muted)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                borderRadius: '12px',
                transition: 'all 0.2s ease',
              }}
              className="clear-filter-btn"
            >
              <X size={12} />
              Reset{activeCount > 1 ? ` (${activeCount})` : ''}
            </button>
          )}
        </div>

        <div style={{ flex: 1 }} />

        {onExport && (
          <button
            onClick={onExport}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '44px' }}
          >
            <Download size={14} />
            Export Data
          </button>
        )}
      </div>
    </div>
  );
}
