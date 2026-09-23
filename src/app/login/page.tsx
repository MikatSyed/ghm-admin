'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, Mail, Lock, AlertTriangle, Loader2 } from 'lucide-react';
import { useLogin } from '@/hooks/api';
import { useAuth } from '@/store/useAuth';
import { ApiError } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const { token, setAuth } = useAuth();
  const login = useLogin();

  const [email, setEmail] = useState('admin@ghm.local');
  const [password, setPassword] = useState('admin1234');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) router.replace('/dashboard');
  }, [token, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await login.mutateAsync({ email, password });
      setAuth(res.token, res.user);
      router.replace('/dashboard');
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Unable to reach the server. Is the API running on port 6398?');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--background)',
        padding: '2rem',
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="card"
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div style={{
            padding: '14px',
            background: 'rgba(16,185,129,0.1)',
            borderRadius: '18px',
            color: 'var(--primary)',
            border: '1px solid rgba(16,185,129,0.2)',
          }}>
            <LogIn size={24} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-main)', textTransform: 'uppercase', fontStyle: 'italic' }}>
            Green Harvest <span style={{ color: 'var(--primary)' }}>Mark</span>
          </h1>
          <p style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3em', opacity: 0.6 }}>
            Sign in to the dashboard
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-muted)' }}>Email</label>
          <div style={{ position: 'relative' }}>
            <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', opacity: 0.5 }} />
            <input
              required
              type="email"
              autoComplete="email"
              className="input-premium"
              style={{ width: '100%', paddingLeft: '40px' }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-muted)' }}>Password</label>
          <div style={{ position: 'relative' }}>
            <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', opacity: 0.5 }} />
            <input
              required
              type="password"
              autoComplete="current-password"
              className="input-premium"
              style={{ width: '100%', paddingLeft: '40px' }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 12px', borderRadius: '10px',
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            color: '#ef4444', fontSize: '11px', fontWeight: 700,
          }}>
            <AlertTriangle size={14} />
            {error}
          </div>
        )}

        <button
          type="submit"
          className="btn-primary"
          disabled={login.isPending}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', opacity: login.isPending ? 0.6 : 1 }}
        >
          {login.isPending ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
          Sign In
        </button>

        <p style={{ fontSize: '10px', fontWeight: 700, textAlign: 'center', color: 'var(--text-muted)', opacity: 0.55 }}>
          Dev seed: <code style={{ color: 'var(--primary)' }}>admin@ghm.local / admin1234</code>
        </p>
      </form>
    </div>
  );
}
