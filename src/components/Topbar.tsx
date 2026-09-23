'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Search, LogOut, Settings, User, ChevronDown, Shield } from 'lucide-react';
import { useAuth } from '@/store/useAuth';
import ThemeToggle from '@/components/ThemeToggle';

const notifications = [
  { id: '1', message: 'Van 1 - North completed daily run with ৳25,000 yield', time: 'Apr 18, 09:15', type: 'sale', read: false },
  { id: '2', message: 'Low stock alert: Green Chili at 12 kg', time: 'Apr 18, 08:45', type: 'alert', read: false },
  { id: '3', message: 'New stock entry: Morning batch 2,500 kg received', time: 'Apr 18, 07:30', type: 'stock', read: true },
  { id: '4', message: 'Van 3 - East returned 40 kg unsold (high deviation)', time: 'Apr 17, 18:10', type: 'warning', read: true },
  { id: '5', message: 'Monthly report generated: ৳35,00,000 total revenue', time: 'Apr 17, 12:00', type: 'report', read: true },
];

const typeColor: Record<string, string> = {
  sale: '#10b981',
  alert: '#ef4444',
  stock: '#3b82f6',
  warning: '#f59e0b',
  report: '#8b5cf6',
};

export default function Topbar() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [readNotifs, setReadNotifs] = useState<string[]>(['3', '4', '5']);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !readNotifs.includes(n.id)).length;
  const displayName = user?.name || 'Account';
  const initials = (user?.name || user?.email || 'U').split(/[\s@.]/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join('') || 'U';
  const roleLabel = user?.role ? user.role.charAt(0) + user.role.slice(1).toLowerCase() : 'User';

  const handleSignOut = () => {
    logout();
    setShowProfile(false);
    router.replace('/login');
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <header className="topbar" style={{ borderBottom: '1px solid var(--border-soft)', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
      {/* Search */}
      <div style={{ position: 'relative', maxWidth: '400px', flex: 1 }} className="search-group">
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'var(--primary)',
            filter: 'blur(20px)',
            opacity: 0,
            borderRadius: '12px',
            transition: 'opacity 0.3s ease',
            pointerEvents: 'none',
          }}
          className="search-glow"
        />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: '16px',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
              transition: 'color 0.3s ease',
            }}
            className="search-icon"
          />
          <input
            type="text"
            placeholder="Search system..."
            className="input-premium"
            style={{
              width: '100%',
              paddingLeft: '44px',
              paddingRight: '56px',
            }}
          />
          <kbd style={{
            position: 'absolute',
            right: '12px',
            padding: '2px 6px',
            borderRadius: '6px',
            fontSize: '9px',
            fontWeight: 900,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
          }}>
            ⌘/
          </kbd>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* System Time */}
        <div
          style={{
            padding: '0.5rem 1rem',
            background: 'rgba(16,185,129,0.06)',
            border: '1px solid rgba(16,185,129,0.15)',
            borderRadius: '12px',
          }}
        >
          <span style={{ fontSize: '9px', fontWeight: 900, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.15em', display: 'block', lineHeight: 1 }}>
            System Time
          </span>
          <span style={{ fontSize: '12px', fontWeight: 900, color: 'var(--text-main)', fontVariantNumeric: 'tabular-nums', lineHeight: 1, marginTop: '2px', display: 'block' }}>
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Utilities Row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: 'var(--surface)',
          padding: '4px',
          borderRadius: '14px',
          border: '1px solid var(--border)',
          gap: '2px',
        }}>
          <ThemeToggle />

          {/* Notification Bell */}
          <div ref={notifRef} style={{ position: 'relative' }}>
            <button
              onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); }}
              style={{
                width: '38px',
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '10px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                position: 'relative',
                transition: 'all 0.2s ease',
              }}
              className="icon-btn"
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  width: '8px',
                  height: '8px',
                  background: 'var(--primary)',
                  borderRadius: '50%',
                  boxShadow: '0 0 8px var(--primary)',
                  animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
                }} />
              )}
            </button>

            {showNotifications && (
              <div
                className="animate-fade-in"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 12px)',
                  width: '340px',
                  background: 'var(--menu-bg)',
                  backdropFilter: 'blur(24px)',
                  border: '1px solid var(--border)',
                  borderRadius: '20px',
                  boxShadow: '0 24px 80px var(--overlay-shadow)',
                  zIndex: 100,
                  overflow: 'hidden',
                }}
              >
                <div style={{
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(16,185,129,0.04)',
                  borderBottom: '1px solid var(--border-soft)',
                }}>
                  <h3 style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-main)' }}>
                    Notifications
                  </h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => setReadNotifs(notifications.map(n => n.id))}
                      style={{ fontSize: '10px', fontWeight: 900, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.1em', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      Clear All
                    </button>
                  )}
                </div>
                <div className="custom-scrollbar" style={{ maxHeight: '380px', overflowY: 'auto' }}>
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      style={{
                        padding: '1rem 1.25rem',
                        borderBottom: '1px solid var(--border-soft)',
                        display: 'flex',
                        gap: '0.75rem',
                        cursor: 'pointer',
                        position: 'relative',
                        overflow: 'hidden',
                        transition: 'background 0.2s ease',
                      }}
                      className="notif-item"
                    >
                      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: 'var(--primary)', transform: 'scaleY(0)', transition: 'transform 0.2s ease', transformOrigin: 'top' }} className="notif-indicator" />
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: typeColor[n.type] || '#888',
                        marginTop: '5px',
                        flexShrink: 0,
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: readNotifs.includes(n.id) ? 'var(--text-muted)' : 'var(--text-main)',
                          lineHeight: 1.5,
                        }}>
                          {n.message}
                        </p>
                        <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', opacity: 0.5, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {n.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ padding: '0.75rem', textAlign: 'center', borderTop: '1px solid var(--border-soft)', background: 'var(--surface-hover)' }}>
                  <button style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    View Archive
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Profile Button */}
        <div ref={profileRef} style={{ position: 'relative' }}>
          <button
            onClick={() => { setShowProfile(!showProfile); setShowNotifications(false); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '6px 12px 6px 6px',
              borderRadius: '14px',
              background: 'transparent',
              border: '1px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            className="profile-btn"
          >
            <div style={{ position: 'relative' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, var(--primary), #059669)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '12px',
                border: '1px solid var(--border)',
                boxShadow: '0 4px 15px rgba(16,185,129,0.2)',
              }}>
                {initials}
              </div>
            </div>
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontSize: '11px', fontWeight: 900, color: 'var(--text-main)', textTransform: 'uppercase', lineHeight: 1, marginBottom: '3px' }}>
                {displayName}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--primary)', display: 'inline-block' }} />
                <p style={{ fontSize: '9px', fontWeight: 900, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {roleLabel}
                </p>
              </div>
            </div>
            <ChevronDown
              size={13}
              style={{
                color: 'var(--text-muted)',
                transform: showProfile ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s ease',
              }}
            />
          </button>

          {showProfile && (
            <div
              className="animate-fade-in"
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 12px)',
                width: '240px',
                background: 'var(--menu-bg)',
                backdropFilter: 'blur(24px)',
                border: '1px solid var(--border)',
                borderRadius: '20px',
                boxShadow: '0 24px 80px var(--overlay-shadow)',
                zIndex: 100,
                overflow: 'hidden',
                padding: '8px 0',
              }}
            >
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-soft)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '12px',
                    background: 'linear-gradient(135deg, var(--primary), #059669)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#ffffff', fontWeight: 900, fontSize: '13px',
                  }}>{initials}</div>
                  <div>
                    <p style={{ fontSize: '11px', fontWeight: 900, color: 'var(--text-main)', textTransform: 'uppercase' }}>{displayName}</p>
                    <p style={{ fontSize: '10px', color: 'var(--text-muted)', opacity: 0.5, fontStyle: 'italic' }}>{user?.email ?? ''}</p>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ padding: '8px 10px', background: 'var(--background)', borderRadius: '10px', border: '1px solid var(--border)', textAlign: 'center' }}>
                    <p style={{ fontSize: '8px', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2px' }}>Access</p>
                    <p style={{ fontSize: '10px', fontWeight: 900, color: 'var(--primary)', textTransform: 'uppercase' }}>Full</p>
                  </div>
                  <div style={{ padding: '8px 10px', background: 'var(--background)', borderRadius: '10px', border: '1px solid var(--border)', textAlign: 'center' }}>
                    <p style={{ fontSize: '8px', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2px' }}>Uptime</p>
                    <p style={{ fontSize: '10px', fontWeight: 900, color: '#10b981', textTransform: 'uppercase' }}>99.9%</p>
                  </div>
                </div>
              </div>
              <div style={{ padding: '8px 0' }}>
                <ProfileMenuItem
                  icon={User}
                  label="Profile"
                  onClick={() => {
                    setShowProfile(false);
                    router.push('/dashboard/profile');
                  }}
                />
                <ProfileMenuItem icon={Shield} label="Security" onClick={() => setShowProfile(false)} />
                <ProfileMenuItem icon={Settings} label="Settings" onClick={() => setShowProfile(false)} />
              </div>
              <div style={{ padding: '8px 0', borderTop: '1px solid var(--border-soft)' }}>
                <ProfileMenuItem icon={LogOut} label="Sign Out" onClick={handleSignOut} danger />
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function ProfileMenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.75rem 1.25rem',
        fontSize: '10px',
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: '0.15em',
        color: danger ? '#ef4444' : 'var(--text-muted)',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.2s ease',
      }}
      className={danger ? 'profile-item-danger' : 'profile-item'}
    >
      <Icon size={14} style={{ color: danger ? '#ef4444' : 'var(--primary)' }} />
      {label}
    </button>
  );
}
