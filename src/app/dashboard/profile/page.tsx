'use client';

import React from 'react';
import MainLayout from '@/components/MainLayout';
import { useAuth } from '@/store/useAuth';
import { useMe } from '@/hooks/api';
import {
  User, 
  Mail, 
  Shield, 
  Calendar, 
  Clock, 
  Settings, 
  LogOut,
  ChevronRight,
  Activity,
  Lock,
  Smartphone
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export default function ProfilePage() {
  const { user: storedUser, logout } = useAuth();
  
  // Use useMe to get fresh data, but fallback to stored user
  const meQ = useMe();
  const user = meQ.data || storedUser;

  if (!user) return null;

  const initials = (user.name || user.email || 'U')
    .split(/[\s@.]/)
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase())
    .join('') || 'U';

  const roleLabel = user.role ? user.role.charAt(0) + user.role.slice(1).toLowerCase() : 'User';

  return (
    <MainLayout>
      <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '4rem' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1rem' }}>
          <div style={{
            padding: '16px',
            background: 'rgba(16,185,129,0.1)',
            borderRadius: '20px',
            color: 'var(--primary)',
            border: '1px solid rgba(16,185,129,0.2)',
            boxShadow: '0 0 30px rgba(16,185,129,0.1)',
          }}>
            <User size={32} />
          </div>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--text-main)', textTransform: 'uppercase', fontStyle: 'italic', lineHeight: 1 }}>
              Personal <span style={{ color: 'var(--primary)' }}>Identity</span>
            </h1>
            <p style={{ fontSize: '11px', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4em', opacity: 0.6, marginTop: '8px' }}>
              Account Credentials & Security
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem' }}>
          
          {/* Main Info Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card" style={{ padding: '2.5rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ 
                position: 'absolute', top: '-100px', right: '-100px', width: '300px', height: '300px', 
                background: 'var(--primary)', opacity: 0.03, filter: 'blur(80px)', borderRadius: '50%' 
              }} />
              
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '2rem' }}>
                <div style={{
                  width: '120px', height: '120px', borderRadius: '30px', 
                  background: 'linear-gradient(135deg, var(--primary), #059669)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '42px', fontWeight: 950, color: 'var(--text-main)',
                  border: '1px solid var(--overlay-strong)',
                  boxShadow: '0 12px 40px rgba(16,185,129,0.25)',
                  flexShrink: 0
                }}>
                  {initials}
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-main)' }}>{user.name || 'Anonymous User'}</h2>
                    <span style={{
                      padding: '4px 12px', background: 'rgba(16,185,129,0.1)', color: 'var(--primary)',
                      borderRadius: '99px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase',
                      letterSpacing: '0.1em', border: '1px solid rgba(16,185,129,0.2)'
                    }}>
                      {roleLabel}
                    </span>
                  </div>
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '24px' }}>
                    System ID: <code style={{ color: 'var(--primary)', background: 'var(--overlay-soft)', padding: '2px 6px', borderRadius: '6px' }}>{user.id}</code>
                  </p>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <InfoRow icon={Mail} label="Email Address" value={user.email} />
                    <InfoRow icon={Shield} label="Access Tier" value="Administrative" />
                    <InfoRow icon={Calendar} label="Member Since" value="July 12, 2025" />
                    <InfoRow icon={Clock} label="Current Status" value="Active / Operational" color="#10b981" />
                  </div>
                </div>
              </div>
            </div>

            {/* Security Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <SecurityActionCard 
                icon={Lock} 
                title="Authorization" 
                desc="Update your password and authentication methods" 
                btn="Reset Password"
              />
              <SecurityActionCard 
                icon={Smartphone} 
                title="Devices" 
                desc="Manage your active sessions and connected devices" 
                btn="View 2 Active Sessions"
              />
            </div>
          </div>

          {/* Right Sidebar Stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem' }}>
                <Activity size={16} style={{ color: 'var(--primary)' }} />
                <h3 style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-main)' }}>Activity Pulse</h3>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <ActivityStat label="Audit Events" value="142" />
                <ActivityStat label="Stock Logs" value="894" />
                <ActivityStat label="Sales Cycles" value="23" />
                <ActivityStat label="System Uptime" value="100%" color="#10b981" />
              </div>
            </div>

            <div className="card" style={{ padding: '1rem' }}>
               <button 
                onClick={() => {
                  logout();
                  window.location.href = '/login';
                }}
                className="btn-danger"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', height: '50px' }}
              >
                <LogOut size={16} />
                Terminate Session
              </button>
              <p style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '12px', fontWeight: 600, opacity: 0.5 }}>
                Last login: Today at 09:41 AM
              </p>
            </div>
          </div>

        </div>
      </div>
    </MainLayout>
  );
}

function InfoRow({ icon: Icon, label, value, color }: { icon: LucideIcon; label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ padding: '8px', background: 'var(--overlay-soft)', borderRadius: '10px', color: 'var(--text-muted)' }}>
        <Icon size={14} />
      </div>
      <div>
        <p style={{ fontSize: '8px', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>{label}</p>
        <p style={{ fontSize: '13px', fontWeight: 900, color: color || 'white' }}>{value}</p>
      </div>
    </div>
  );
}

function SecurityActionCard({ icon: Icon, title, desc, btn }: { icon: LucideIcon; title: string; desc: string; btn: string }) {
  return (
    <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ padding: '10px', background: 'rgba(59,130,246,0.1)', borderRadius: '12px', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)' }}>
          <Icon size={18} />
        </div>
        <h3 style={{ fontSize: '14px', fontWeight: 900, color: 'var(--text-main)' }}>{title}</h3>
      </div>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, lineHeight: 1.5 }}>{desc}</p>
      <button className="btn-secondary" style={{ 
        width: '100%', marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', 
        gap: '8px', fontVariantNumeric: 'tabular-nums', padding: '10px'
      }}>
        {btn}
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

function ActivityStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--overlay-soft)', borderRadius: '12px', border: '1px solid var(--overlay-soft)' }}>
      <p style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</p>
      <p style={{ fontSize: '14px', fontWeight: 950, color: color || 'white', fontVariantNumeric: 'tabular-nums' }}>{value}</p>
    </div>
  );
}
