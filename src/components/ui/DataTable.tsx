'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Inbox } from 'lucide-react';

interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
  selectedItems?: string[];
  onToggleItem?: (id: string) => void;
  onSelectAll?: (ids: string[]) => void;
  getId?: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  emptyDescription?: string;
}

export function DataTable<T>({
  columns,
  data,
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize = 10,
  selectedItems = [],
  onToggleItem,
  onSelectAll,
  getId,
  onRowClick,
  emptyMessage = 'No results found',
  emptyDescription = 'Adjust filters to synchronize data',
}: DataTableProps<T>) {
  const allSelected =
    getId && data.length > 0 && data.every((item) => selectedItems.includes(getId(item)));
  const itemCount = totalItems ?? data.length;
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return (
    <div className="table-container animate-fade-in" style={{ paddingBottom: '2px' }}>
      <div className="custom-scrollbar" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {onToggleItem && getId && (
                <th className="table-header" style={{ width: '48px', paddingRight: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <input
                      type="checkbox"
                      checked={!!allSelected}
                      onChange={() => {
                        if (allSelected) onSelectAll?.([]);
                        else onSelectAll?.(data.map((item) => getId(item)));
                      }}
                      style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                    />
                  </div>
                </th>
              )}
              {columns.map((col) => (
                <th key={col.key} className="table-header" style={col.width ? { width: col.width } : {}}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {col.label}
                    <div style={{ width: '4px', height: '12px', background: 'rgba(16,185,129,0.15)', borderRadius: '99px' }} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (onToggleItem ? 1 : 0)}
                  style={{ padding: '6rem 1.5rem', textAlign: 'center' }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', opacity: 0.4 }}>
                    <div style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '20px',
                      background: 'var(--overlay-soft)',
                      border: '1px solid var(--border-soft)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
                    }}>
                      <Inbox size={28} color="var(--text-muted)" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em', color: 'var(--text-main)', marginBottom: '4px' }}>
                        {emptyMessage}
                      </p>
                      <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontStyle: 'italic' }}>
                        {emptyDescription}
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((item, i) => {
                const id = getId ? getId(item) : String(i);
                const isSelected = selectedItems.includes(id);
                return (
                  <tr
                    key={id}
                    onClick={() => onRowClick?.(item)}
                    className={`table-row ${isSelected ? 'table-row-active' : ''}`}
                    style={{
                      cursor: onRowClick ? 'pointer' : 'default',
                      position: 'relative',
                    }}
                  >
                    {onToggleItem && getId && (
                      <td className="table-cell" style={{ width: '48px', paddingRight: 0 }}>
                        {isSelected && (
                          <div style={{
                            position: 'absolute',
                            left: 0,
                            top: '4px',
                            bottom: '4px',
                            width: '4px',
                            background: 'var(--primary)',
                            borderRadius: '0 4px 4px 0',
                            boxShadow: '0 0 10px var(--primary)',
                            zIndex: 10,
                          }} />
                        )}
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => { e.stopPropagation(); onToggleItem(id); }}
                            style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                          />
                        </div>
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} className="table-cell">
                        <div style={{ transition: 'transform 0.3s ease' }}>
                          {col.render ? col.render(item) : (
                            <span style={{ fontWeight: 700, opacity: 0.9, fontStyle: 'italic' }}>
                              {String((item as Record<string, unknown>)[col.key] ?? '')}
                            </span>
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.25rem 2rem',
          borderTop: '1px solid var(--overlay-soft)',
          background: 'rgba(10,10,10,0.3)',
        }}>
          <div style={{
            padding: '6px 12px',
            borderRadius: '8px',
            background: 'var(--overlay-soft)',
            border: '1px solid var(--border-soft)',
          }}>
            <p style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
              Records{' '}
              <span style={{ color: 'var(--primary)', fontStyle: 'italic' }}>
                {Math.min((currentPage - 1) * pageSize + 1, itemCount)}–{Math.min(currentPage * pageSize, itemCount)}
              </span>
              {' '}/ <span style={{ color: 'var(--text-main)' }}>{itemCount}</span> Total
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PaginBtn onClick={() => onPageChange(1)} disabled={!canGoPrev}><ChevronsLeft size={15} /></PaginBtn>
            <PaginBtn onClick={() => onPageChange(currentPage - 1)} disabled={!canGoPrev}><ChevronLeft size={15} /></PaginBtn>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--overlay-soft)',
              borderRadius: '12px',
              border: '1px solid var(--border-soft)',
              padding: '4px',
            }}>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let page: number;
                if (totalPages <= 5) page = i + 1;
                else if (currentPage <= 3) page = i + 1;
                else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
                else page = currentPage - 2 + i;

                return (
                  <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: 900,
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      background: page === currentPage ? 'var(--primary)' : 'transparent',
                      color: page === currentPage ? 'white' : 'var(--text-muted)',
                      boxShadow: page === currentPage ? '0 4px 15px rgba(16,185,129,0.25)' : 'none',
                      transform: page === currentPage ? 'scale(1.05)' : 'scale(1)',
                    }}
                  >
                    {String(page).padStart(2, '0')}
                  </button>
                );
              })}
            </div>

            <PaginBtn onClick={() => onPageChange(currentPage + 1)} disabled={!canGoNext}><ChevronRight size={15} /></PaginBtn>
            <PaginBtn onClick={() => onPageChange(totalPages)} disabled={!canGoNext}><ChevronsRight size={15} /></PaginBtn>
          </div>
        </div>
      )}
    </div>
  );
}

function PaginBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '40px',
        height: '40px',
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid var(--border-soft)',
        background: 'var(--overlay-soft)',
        color: disabled ? 'var(--overlay-strong)' : 'var(--text-muted)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.3s ease',
        opacity: disabled ? 0.3 : 1,
        transform: disabled ? 'scale(0.95)' : 'scale(1)',
      }}
      className={disabled ? '' : 'pagin-btn'}
    >
      {children}
    </button>
  );
}
