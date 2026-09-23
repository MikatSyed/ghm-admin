'use client';

import React, { useState, createContext, useContext } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/store/useAuth';
import {
  LayoutDashboard,
  Carrot,
  Boxes,
  Truck,
  BadgeDollarSign,
  Wallet,
  Calculator,
  Calendar,
  FileText,
  History,
  PieChart,
  Search,
  ChevronLeft,
  LogOut,
  Layers,
  Building2,
  Settings,
  Users,
  ClipboardList,
  type LucideIcon,
} from 'lucide-react';

type NavItem = {
  name: string;
  path: string;
  icon: LucideIcon;
  subItems?: NavItem[];
};

type NavSection = {
  label: string;
  items: NavItem[];
};

/* ── Sidebar context so children can read open/closed state ── */
export const SidebarContext = createContext<{ open: boolean }>({ open: true });
export const useSidebar = () => useContext(SidebarContext);

const navSections: NavSection[] = [
  {
    label: 'Overview',
    items: [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Warehouse',
    items: [
      { name: 'Stock', path: '/dashboard/stock', icon: Boxes },
      {
        name: 'Distribution',
        path: '/dashboard/distribution',
        icon: Truck,
        subItems: [
          { name: 'Van Distribution', path: '/dashboard/distribution', icon: Truck },
          { name: 'Customer Orders', path: '/dashboard/distribution-orders', icon: ClipboardList },
        ],
      },
      { name: 'Customers', path: '/dashboard/customers', icon: Users },
    ],
  },
  {
    label: 'Finance',
    items: [
      {
        name: 'Sales',
        path: '/dashboard/sales',
        icon: BadgeDollarSign,
        subItems: [
          { name: 'Today', path: '/dashboard/sales', icon: Calendar },
          { name: 'History', path: '/dashboard/sales/history', icon: History },
        ],
      },
      { name: 'Expenses', path: '/dashboard/expenses', icon: Wallet },
      { name: 'Banking', path: '/dashboard/banking', icon: Building2 },
      { name: 'Accounting', path: '/dashboard/accounting', icon: Calculator },
    ],
  },
  {
    label: 'Records',
    items: [
      { name: 'Invoices', path: '/dashboard/invoices', icon: FileText },
      { name: 'Reports', path: '/dashboard/reports', icon: PieChart },
      { name: 'Search', path: '/dashboard/search', icon: Search },
    ],
  },
  {
    label: 'System',
    items: [
      { 
        name: 'Settings', 
        path: '/dashboard/settings', 
        icon: Settings,
        subItems: [
          { name: 'Products', path: '/dashboard/products', icon: Carrot },
          { name: 'Categories', path: '/dashboard/categories', icon: Layers },
        ]
      },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [expandedItems, setExpandedItems] = useState<string[]>(['Settings']);
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);

  const displayName = user?.name || 'Account';
  const roleLabel = user?.role ? user.role.charAt(0) + user.role.slice(1).toLowerCase() : 'User';
  const initials = (user?.name || user?.email || 'U').split(/[\s@.]/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join('') || 'U';

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <SidebarContext.Provider value={{ open }}>
      <aside
        className="sidebar custom-scrollbar"
        style={{
          width: open ? '260px' : '80px',
          transition: 'width 0.5s cubic-bezier(0.23,1,0.32,1)',
          background: 'var(--surface)',
          borderRight: '1px solid var(--border-soft)',
          position: 'sticky',
          top: 0,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          zIndex: 40,
          overflow: 'hidden',
        }}
      >
        {/* ── Brand Node ── */}
        <div
          style={{
            height: '80px',
            display: 'flex',
            alignItems: 'center',
            padding: '0 1.5rem',
            borderBottom: '1px solid var(--border-soft)',
            position: 'relative',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {/* Glow */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'var(--primary)',
              filter: 'blur(40px)',
              opacity: 0.04,
              pointerEvents: 'none',
            }}
          />
          {/* Logo */}
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, var(--primary), #059669, #064e3b)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 20px rgba(16,185,129,0.15)',
              border: '1px solid var(--border)',
              cursor: 'pointer',
              transition: 'transform 0.2s ease',
              zIndex: 10,
            }}
            onClick={() => setOpen(!open)}
            title="Toggle Sidebar"
          >
            <Carrot size={18} color="white" strokeWidth={2.5} />
          </div>

          {open && (
            <div
              className="animate-fade-in"
              style={{ marginLeft: '1rem', flex: 1, overflow: 'hidden', zIndex: 10 }}
            >
              <span
                style={{
                  display: 'block',
                  fontSize: '15px',
                  fontWeight: 900,
                  color: 'var(--text-main)',
                  textTransform: 'uppercase',
                  letterSpacing: '-0.02em',
                  fontStyle: 'italic',
                  whiteSpace: 'nowrap',
                }}
              >
                GHM<span style={{ color: 'var(--primary)', letterSpacing: '0.15em', marginLeft: '2px' }}>Fresh</span>
              </span>
              <span
                style={{
                  display: 'block',
                  fontSize: '8px',
                  fontWeight: 900,
                  letterSpacing: '0.4em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  opacity: 0.45,
                  marginTop: '-2px',
                }}
              >
                Produce Dashboard
              </span>
            </div>
          )}

          {open && (
            <button
              onClick={() => setOpen(false)}
              style={{
                padding: '6px',
                borderRadius: '10px',
                border: '1px solid var(--border-soft)',
                background: 'var(--overlay-soft)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.2s ease',
                flexShrink: 0,
                zIndex: 10,
              }}
            >
              <ChevronLeft size={14} />
            </button>
          )}
        </div>

        {/* ── Expand Button when closed ── */}
        {!open && (
          <button
            onClick={() => setOpen(true)}
            style={{
              position: 'absolute',
              right: '-14px',
              top: '100px',
              width: '28px',
              height: '28px',
              background: 'var(--primary)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-main)',
              boxShadow: '0 0 20px rgba(16,185,129,0.3)',
              cursor: 'pointer',
              border: '2px solid var(--surface-2)',
              transition: 'transform 0.2s ease',
              zIndex: 50,
            }}
          >
            <ChevronLeft size={13} style={{ transform: 'rotate(180deg)' }} />
          </button>
        )}

        {/* ── Navigation ── */}
        <nav
          className="custom-scrollbar"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.5rem 0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '2rem',
          }}
        >
          {navSections.map((section) => (
            <div key={section.label} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {open ? (
                <p
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '9px',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    letterSpacing: '0.4em',
                    color: 'var(--text-muted)',
                    opacity: 0.4,
                  }}
                >
                  {section.label}
                </p>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    padding: '0.5rem 0',
                    opacity: 0.2,
                  }}
                >
                  <div style={{ width: '16px', height: '1px', background: 'var(--text-main)', borderRadius: '99px' }} />
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {section.items.map((item) => {
                  const isActive =
                    item.path === '/dashboard'
                      ? pathname === '/dashboard'
                      : pathname.startsWith(item.path);
                  const Icon = item.icon;
                  const isExpanded = expandedItems.includes(item.name) || isActive;
                  const subItems = item.subItems ?? [];
                  const hasSub = subItems.length > 0;

                  return (
                    <div key={item.path} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <Link
                        href={hasSub ? '#' : item.path}
                        onClick={(e) => {
                          if (hasSub) {
                            e.preventDefault();
                            setExpandedItems(prev => 
                              prev.includes(item.name) 
                                ? prev.filter(i => i !== item.name)
                                : [...prev, item.name]
                            );
                          }
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.75rem',
                          borderRadius: '12px',
                          textDecoration: 'none',
                          position: 'relative',
                          height: '48px',
                          transition: 'all 0.3s ease',
                          background: isActive && !hasSub ? 'rgba(16,185,129,0.08)' : 'transparent',
                          color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                          boxShadow: isActive && !hasSub ? 'inset 0 0 15px rgba(16,185,129,0.04)' : 'none',
                        }}
                        className="sidebar-nav-link"
                      >
                        {/* Active indicator */}
                        {isActive && !hasSub && (
                          <div
                            style={{
                              position: 'absolute',
                              left: 0,
                              top: '8px',
                              bottom: '8px',
                              width: '6px',
                              background: 'var(--primary)',
                              borderRadius: '0 4px 4px 0',
                              boxShadow: '0 0 10px var(--primary)',
                            }}
                          />
                        )}

                        {/* Icon */}
                        <div style={{ width: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                          <Icon
                            size={20}
                            style={{
                              filter: isActive ? 'drop-shadow(0 0 5px rgba(16,185,129,0.5))' : 'none',
                              transition: 'transform 0.3s ease',
                            }}
                          />
                        </div>

                        {/* Label */}
                        {open && (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 900,
                              textTransform: 'uppercase',
                              letterSpacing: '0.1em',
                              whiteSpace: 'nowrap',
                              flex: 1,
                            }}
                          >
                            {item.name}
                          </span>
                        )}

                        {/* Chevron for sub-items */}
                        {open && hasSub && (
                          <ChevronLeft 
                            size={14} 
                            style={{ 
                              transform: isExpanded ? 'rotate(-90deg)' : 'rotate(0deg)', 
                              transition: 'transform 0.3s ease',
                              opacity: 0.5
                            }} 
                          />
                        )}

                        {/* Tooltip when collapsed */}
                        {!open && (
                          <div
                            className="sidebar-tooltip"
                            style={{
                              position: 'fixed',
                              left: '75px',
                              padding: '0.5rem 0.75rem',
                              borderRadius: '10px',
                              background: 'var(--surface)',
                              border: '1px solid var(--border)',
                              boxShadow: '0 8px 32px var(--overlay-shadow)',
                              whiteSpace: 'nowrap',
                              pointerEvents: 'none',
                              opacity: 0,
                              transform: 'translateX(8px)',
                              transition: 'all 0.2s ease',
                              zIndex: 100,
                            }}
                          >
                            <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--primary)' }}>
                              {item.name}
                            </span>
                          </div>
                        )}
                      </Link>

                      {/* Sub Items rendering */}
                      {open && hasSub && isExpanded && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginLeft: '1.5rem', marginTop: '2px', borderLeft: '1px solid var(--border-soft)' }}>
                          {subItems.map(sub => {
                            const isSubActive = sub.path === item.path ? pathname === sub.path : pathname.startsWith(sub.path);
                            const SubIcon = sub.icon;
                            return (
                              <Link
                                key={sub.path}
                                href={sub.path}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.75rem',
                                  padding: '0.6rem 1rem',
                                  borderRadius: '10px',
                                  textDecoration: 'none',
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.05em',
                                  color: isSubActive ? 'var(--primary)' : 'var(--text-muted)',
                                  background: isSubActive ? 'rgba(16,185,129,0.05)' : 'transparent',
                                  transition: 'all 0.2s ease'
                                }}
                              >
                                <SubIcon size={14} opacity={0.6} />
                                {sub.name}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Identity Node ── */}
        <div
          style={{
            padding: '1rem',
            background: 'var(--surface-hover)',
            borderTop: '1px solid var(--border-soft)',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: open ? '0.75rem' : '0.5rem',
              borderRadius: '14px',
              border: '1px solid var(--border-soft)',
              background: 'var(--overlay-soft)',
              flexDirection: open ? 'row' : 'column',
            }}
          >
            {/* Avatar */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, var(--primary), #059669)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-main)',
                  fontWeight: 900,
                  fontSize: '12px',
                  border: '1px solid var(--border)',
                  boxShadow: '0 0 15px rgba(16,185,129,0.15)',
                }}
              >
                {initials}
              </div>
              {/* Online dot */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '-1px',
                  right: '-1px',
                  width: '11px',
                  height: '11px',
                  background: 'var(--primary)',
                  borderRadius: '50%',
                  border: '2px solid var(--surface-2)',
                  boxShadow: '0 0 8px var(--primary)',
                }}
              />
            </div>

            {open && (
              <div className="animate-fade-in" style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: '10px',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    color: 'var(--text-main)',
                    letterSpacing: '-0.01em',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    lineHeight: 1,
                    marginBottom: '3px',
                  }}
                >
                  {displayName}
                </p>
                <p
                  style={{
                    fontSize: '9px',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    opacity: 0.5,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontStyle: 'italic',
                  }}
                >
                  {roleLabel}
                </p>
              </div>
            )}

            {open && (
              <button
                onClick={handleLogout}
                style={{
                  padding: '6px',
                  borderRadius: '8px',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  background: 'transparent',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                }}
                title="Sign Out"
              >
                <LogOut size={14} />
              </button>
            )}

            {!open && (
              <button
                onClick={handleLogout}
                style={{
                  padding: '6px',
                  borderRadius: '8px',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  background: 'transparent',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Sign Out"
              >
                <LogOut size={14} />
              </button>
            )}
          </div>
        </div>
      </aside>
    </SidebarContext.Provider>
  );
}
