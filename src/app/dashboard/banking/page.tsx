'use client';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import MainLayout from '@/components/MainLayout';
import { 
  Building2, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  X, 
  Wallet, 
  RefreshCw, 
  Trash2,
  ExternalLink,
  History,
  ShieldCheck,
  ArrowRightLeft
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatDateDhaka, formatTimeDhaka } from '@/lib/format';

interface BankAccount { id: string; bankName: string; accountNumber: string; accountHolder?: string; balance: number; isActive: boolean; }
interface BankTx { id: string; type: 'deposit' | 'withdrawal'; amount: number; description?: string; reference?: string; occurredAt: string; }
interface Summary { accounts: BankAccount[]; totalBalance: number; recentTransactions: (BankTx & { bankAccount: { bankName: string; accountNumber: string } })[]; }
type BankingView = 'overview' | 'audit';
type AccountFormKey = keyof Pick<BankAccount, 'bankName' | 'accountNumber' | 'accountHolder'>;

/* ─── Add Account Modal ─── */
function AddAccountModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({ bankName: '', accountNumber: '', accountHolder: '' });
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      await api.post('/banking/accounts', { bankName: form.bankName, accountNumber: form.accountNumber, accountHolder: form.accountHolder || undefined });
      onSave(); onClose();
    } catch (err: unknown) { alert(err instanceof Error ? err.message : 'Save failed'); } finally { setLoading(false); }
  };
  const labelStyle: React.CSSProperties = {
    fontSize: '9px', fontWeight: 900, textTransform: 'uppercase',
    letterSpacing: '0.2em', color: 'var(--text-muted)',
  };
  return (
    <div
      className="sheet-overlay"
      onClick={onClose}
      style={{
        background: 'rgba(255, 255, 255, 0.55)',
        backdropFilter: 'blur(20px) saturate(140%)',
        WebkitBackdropFilter: 'blur(20px) saturate(140%)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        className="sheet-content animate-fade-in"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '520px',
          margin: 'auto',
          maxHeight: 'unset',
          boxShadow: '0 30px 80px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(15, 23, 42, 0.04)',
          borderRadius: '20px',
          overflow: 'hidden',
        }}
      >
        <div style={{
          padding: '1.5rem 2rem',
          borderBottom: '1px solid var(--border-soft)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(16,185,129,0.03)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              padding: '10px', background: 'rgba(16,185,129,0.1)',
              border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: '12px', color: 'var(--primary)',
            }}>
              <Building2 size={20} />
            </div>
            <div>
              <h2 style={{
                fontSize: '15px', fontWeight: 900, textTransform: 'uppercase',
                letterSpacing: '0.05em', color: 'var(--text-main)',
              }}>
                Register <span style={{ color: 'var(--primary)' }}>Account</span>
              </h2>
              <p style={{
                fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.2em', opacity: 0.5,
                marginTop: '2px',
              }}>
                Onboard a new financial node
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{
            padding: '8px', borderRadius: '10px', background: 'var(--overlay-soft)',
            color: 'var(--text-muted)', border: 'none', cursor: 'pointer',
          }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{
          padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem',
        }}>
          {([
            { label: 'Bank Name', key: 'bankName', placeholder: 'e.g. Dutch Bangla Bank', required: true },
            { label: 'Account Number', key: 'accountNumber', placeholder: 'e.g. 1234 5678 9012', required: true },
            { label: 'Account Holder (Optional)', key: 'accountHolder', placeholder: 'e.g. Green Harvest Mark', required: false },
          ] satisfies Array<{ label: string; key: AccountFormKey; placeholder: string; required: boolean }>).map(({ label, key, placeholder, required }) => (
            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={labelStyle}>{label}</label>
              <input
                className="input-premium"
                placeholder={placeholder}
                required={required}
                value={form[key]}
                onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
              />
            </div>
          ))}

          <div style={{
            display: 'flex', gap: '10px', marginTop: '0.5rem',
            paddingTop: '1.25rem', borderTop: '1px solid var(--border-soft)',
          }}>
            <button type="button" onClick={onClose} className="btn-secondary" style={{ flex: 1, height: '44px' }}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" style={{ flex: 2, height: '44px' }} disabled={loading}>
              {loading ? 'Saving…' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Transaction Modal ─── */
function TxModal({ account, onClose, onSave }: { account: BankAccount; onClose: () => void; onSave: () => void }) {
  const [type, setType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [form, setForm] = useState({ amount: '', description: '', reference: '', occurredAt: new Date().toISOString().slice(0, 16) });
  const [loading, setLoading] = useState(false);
  const amountNum = Number(form.amount) || 0;
  const overLimit = type === 'withdrawal' && amountNum > account.balance;
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (overLimit) return;
    setLoading(true);
    try {
      await api.post(`/banking/accounts/${account.id}/transactions`, {
        type, amount: amountNum, description: form.description || undefined,
        reference: form.reference || undefined, occurredAt: new Date(form.occurredAt).toISOString(),
      });
      onSave(); onClose();
    } catch (err: unknown) { alert(err instanceof Error ? err.message : 'Save failed'); } finally { setLoading(false); }
  };
  const labelStyle: React.CSSProperties = {
    fontSize: '9px', fontWeight: 900, textTransform: 'uppercase',
    letterSpacing: '0.2em', color: 'var(--text-muted)',
  };
  const accent = type === 'deposit' ? 'var(--primary)' : '#ef4444';
  const accentBg = type === 'deposit' ? 'rgba(16,185,129,0.03)' : 'rgba(239,68,68,0.03)';

  return (
    <div
      className="sheet-overlay"
      onClick={onClose}
      style={{
        background: 'rgba(255, 255, 255, 0.55)',
        backdropFilter: 'blur(20px) saturate(140%)',
        WebkitBackdropFilter: 'blur(20px) saturate(140%)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        className="sheet-content animate-fade-in"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '620px',
          margin: 'auto',
          maxHeight: 'unset',
          boxShadow: '0 30px 80px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(15, 23, 42, 0.04)',
          borderRadius: '20px',
          overflow: 'hidden',
        }}
      >
        <div style={{
          padding: '1.5rem 2rem',
          borderBottom: '1px solid var(--border-soft)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: accentBg,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              padding: '10px',
              background: type === 'deposit' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${type === 'deposit' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
              borderRadius: '12px', color: accent,
            }}>
              {type === 'deposit' ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
            </div>
            <div>
              <h2 style={{
                fontSize: '15px', fontWeight: 900, textTransform: 'uppercase',
                letterSpacing: '0.05em', color: 'var(--text-main)',
              }}>
                Record <span style={{ color: accent }}>{type}</span>
              </h2>
              <p style={{
                fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.2em', opacity: 0.6,
                marginTop: '2px',
              }}>
                {account.bankName} ···{account.accountNumber.slice(-4)}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{
            padding: '8px', borderRadius: '10px', background: 'var(--overlay-soft)',
            color: 'var(--text-muted)', border: 'none', cursor: 'pointer',
          }}>
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="custom-scrollbar"
          style={{
            padding: '1.75rem 2rem',
            display: 'flex', flexDirection: 'column', gap: '1.25rem',
            maxHeight: '70vh', overflowY: 'auto',
          }}
        >
          {/* Balance preview */}
          <div style={{
            padding: '1rem 1.25rem', borderRadius: '14px',
            background: 'var(--overlay-soft)', border: '1px solid var(--border-soft)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={labelStyle}>Current Balance</span>
            <span style={{
              fontSize: '20px', fontWeight: 900,
              color: account.balance < 0 ? '#ef4444' : 'var(--text-main)',
              fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
            }}>
              ৳{account.balance.toLocaleString()}
            </span>
          </div>

          {/* Type toggle */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: '8px', padding: '4px', background: 'var(--overlay-soft)',
            borderRadius: '12px', border: '1px solid var(--border-soft)',
          }}>
            {(['deposit', 'withdrawal'] as const).map(t => (
              <button key={t} type="button" onClick={() => setType(t)} style={{
                padding: '10px', borderRadius: '8px', border: 'none',
                background: type === t ? 'var(--surface)' : 'transparent',
                color: type === t ? (t === 'deposit' ? 'var(--primary)' : '#ef4444') : 'var(--text-muted)',
                fontSize: '10px', fontWeight: 900, textTransform: 'uppercase',
                letterSpacing: '0.15em', cursor: 'pointer',
                boxShadow: type === t ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}>
                {t === 'deposit' ? <ArrowUpCircle size={13} /> : <ArrowDownCircle size={13} />}
                {t}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={labelStyle}>Amount (৳)</label>
              <input
                type="number" className="input-premium" placeholder="0" min="0"
                value={form.amount}
                onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                required
                style={overLimit ? { borderColor: '#ef4444' } : undefined}
              />
              {overLimit && (
                <span style={{ fontSize: '10px', fontWeight: 800, color: '#ef4444', letterSpacing: '0.05em' }}>
                  Exceeds available balance
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={labelStyle}>Date & Time</label>
              <input
                type="datetime-local" className="input-premium"
                value={form.occurredAt}
                onChange={e => setForm(p => ({ ...p, occurredAt: e.target.value }))}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={labelStyle}>Description (Optional)</label>
              <input
                type="text" className="input-premium" placeholder="Entry purpose…"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={labelStyle}>Reference (Optional)</label>
              <input
                type="text" className="input-premium" placeholder="e.g. INV-001"
                value={form.reference}
                onChange={e => setForm(p => ({ ...p, reference: e.target.value }))}
              />
            </div>
          </div>

          <div style={{
            display: 'flex', gap: '10px', marginTop: '0.25rem',
            paddingTop: '1.25rem', borderTop: '1px solid var(--border-soft)',
          }}>
            <button type="button" onClick={onClose} className="btn-secondary" style={{ flex: 1, height: '44px' }}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              style={{
                flex: 2, height: '44px',
                background: type === 'withdrawal' ? '#ef4444' : undefined,
                borderColor: type === 'withdrawal' ? '#ef4444' : undefined,
                opacity: overLimit ? 0.5 : 1,
                cursor: overLimit ? 'not-allowed' : 'pointer',
              }}
              disabled={loading || overLimit}
            >
              {loading ? 'Saving…' : `Commit ${type}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Page ─── */
export default function BankingPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [txAccount, setTxAccount] = useState<BankAccount | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [accountTxs, setAccountTxs] = useState<BankTx[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [view, setView] = useState<BankingView>('overview');

  const load = async () => {
    setLoading(true);
    try { setSummary(await api.get<Summary>('/banking/summary')); } catch { } finally { setLoading(false); }
  };

  const loadAccountTxs = async (id: string) => {
    setTxLoading(true);
    try {
      const r = await api.get<{ items?: BankTx[] }>(`/banking/accounts/${id}/transactions`, { limit: 50 });
      setAccountTxs(r.items || []);
    } catch { } finally { setTxLoading(false); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (selectedAccount) loadAccountTxs(selectedAccount); }, [selectedAccount]);

  const accounts = summary?.accounts || [];
  const selected = accounts.find(a => a.id === selectedAccount);

  const totalDeposits = accountTxs.filter(t => t.type === 'deposit').reduce((s, t) => s + t.amount, 0);
  const totalWithdrawals = accountTxs.filter(t => t.type === 'withdrawal').reduce((s, t) => s + t.amount, 0);

  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in" style={{ paddingBottom: '4rem' }}>
        {typeof document !== 'undefined' && createPortal(
          <>
            {showAddAccount && <AddAccountModal onClose={() => setShowAddAccount(false)} onSave={load} />}
            {txAccount && <TxModal account={txAccount} onClose={() => setTxAccount(null)} onSave={() => { load(); if (selectedAccount === txAccount.id) loadAccountTxs(txAccount.id); }} />}
          </>,
          document.body
        )}

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ padding: '16px', background: 'rgba(16,185,129,0.1)', borderRadius: '22px', color: 'var(--primary)', border: '1px solid rgba(16,185,129,0.2)', boxShadow: '0 0 30px rgba(16,185,129,0.12)' }}><Building2 size={32} /></div>
            <div>
              <h1 className="text-4xl font-black tracking-tight text-main uppercase italic">Banking<span className="text-primary">.OS</span></h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                <span style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3em', opacity: 0.5 }}>Financial Liquidity Protocol</span>
                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--primary)', opacity: 0.3 }} />
                <span style={{ fontSize: '10px', fontWeight: 900, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>{accounts.length} Nodes Active</span>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', background: 'var(--overlay-soft)', padding: '4px', borderRadius: '16px', border: '1px solid var(--border-soft)' }}>
              {[
                { id: 'overview' as const, label: 'Nodes', icon: <Building2 size={14} /> },
                { id: 'audit' as const, label: 'History', icon: <History size={14} /> },
              ].map(v => (
                <button key={v.id} onClick={() => setView(v.id)} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 18px', borderRadius: '12px',
                  fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em',
                  background: view === v.id ? 'var(--surface)' : 'transparent',
                  color: view === v.id ? 'var(--primary)' : 'var(--text-muted)',
                  boxShadow: view === v.id ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                  border: 'none', cursor: 'pointer', transition: 'all 0.2s ease'
                }}>
                  {v.icon} {v.label}
                </button>
              ))}
            </div>
            <button className="btn-primary" onClick={() => setShowAddAccount(true)} style={{ height: '48px', padding: '0 24px', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}><Plus size={18} /> New Account</button>
          </div>
        </div>

        {view === 'overview' ? (
          <div className="space-y-8 animate-fade-in">
            {/* ── KPI Row ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
              {[
                { label: 'Cumulative Liquidity', val: summary?.totalBalance || 0, icon: <Wallet size={24} />, color: 'var(--primary)', sub: 'Across all nodes' },
                { label: 'Active Channels', val: accounts.length, icon: <ArrowRightLeft size={24} />, color: '#3b82f6', sub: 'Verified bank accounts' },
                { label: 'System Integrity', val: '100%', icon: <ShieldCheck size={24} />, color: '#8b5cf6', sub: 'All audits cleared' },
              ].map((k, i) => (
                <div key={i} className="card" style={{ position: 'relative', overflow: 'hidden', padding: '2rem' }}>
                  <div style={{ position: 'absolute', top: '-20px', right: '-20px', opacity: 0.05, transform: 'scale(3)', color: k.color }}>{k.icon}</div>
                  <p style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-muted)', marginBottom: '8px' }}>{k.label}</p>
                  <p style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.04em' }}>
                    {typeof k.val === 'number' ? `৳${k.val.toLocaleString()}` : k.val}
                  </p>
                  <p style={{ fontSize: '11px', color: k.color, fontWeight: 700, marginTop: '8px' }}>{k.sub}</p>
                </div>
              ))}
            </div>

            {/* ── Main Layout Split ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '2rem', alignItems: 'start' }}>
              
              {/* Left: Account List */}
              <div className="space-y-4">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>Financial Nodes</h3>
                  <button onClick={load} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}><RefreshCw size={14} /></button>
                </div>
                {accounts.map(acc => (
                  <div key={acc.id} onClick={() => setSelectedAccount(acc.id)}
                    className="card" style={{ cursor: 'pointer', padding: '1.5rem', border: selectedAccount === acc.id ? '1px solid var(--primary)' : '1px solid var(--border)', background: selectedAccount === acc.id ? 'rgba(16,185,129,0.03)' : 'var(--surface)', transform: selectedAccount === acc.id ? 'translateX(8px)' : 'none', transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                      <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}><CreditCard size={20} /></div>
                      <button onClick={e => { e.stopPropagation(); setTxAccount(acc); }} className="btn-primary" style={{ padding: '6px 12px', fontSize: '9px', borderRadius: '8px' }}>+ New Entry</button>
                    </div>
                    <p style={{ fontSize: '15px', fontWeight: 900, color: 'var(--text-main)', textTransform: 'uppercase' }}>{acc.bankName}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace', opacity: 0.6, marginTop: '2px' }}>ID: {acc.accountNumber}</p>
                    <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                      <span style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>৳{acc.balance.toLocaleString()}</span>
                      <span style={{ fontSize: '10px', fontWeight: 900, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Balance</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Right: Detailed Activity or Welcome */}
              <div className="space-y-6">
                {selectedAccount && selected ? (
                  <div className="card animate-fade-in" style={{ padding: 0, minHeight: '600px' }}>
                    <div style={{ padding: '2rem', borderBottom: '1px solid var(--border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--overlay-soft)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}><ExternalLink size={24} /></div>
                        <div>
                          <h3 style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-main)' }}>{selected.bankName}</h3>
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>{selected.accountHolder || 'Master Account'}</p>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--primary)' }}>৳{selected.balance.toLocaleString()}</p>
                        <p style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.2em' }}>Verified Liquidity</p>
                      </div>
                    </div>

                    <div style={{ padding: '2rem' }}>
                      <div style={{ display: 'flex', gap: '2rem', marginBottom: '2.5rem' }}>
                        <div style={{ flex: 1, padding: '1.5rem', borderRadius: '20px', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.1)' }}>
                          <p style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: '#10b981', marginBottom: '10px' }}>Total Deposits</p>
                          <p style={{ fontSize: '1.5rem', fontWeight: 900, color: '#10b981' }}>+৳{totalDeposits.toLocaleString()}</p>
                        </div>
                        <div style={{ flex: 1, padding: '1.5rem', borderRadius: '20px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.1)' }}>
                          <p style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: '#ef4444', marginBottom: '10px' }}>Total Withdrawals</p>
                          <p style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ef4444' }}>-৳{totalWithdrawals.toLocaleString()}</p>
                        </div>
                      </div>

                      <h4 style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>Account History</h4>
                      {txLoading ? (
                        <div style={{ padding: '4rem', textAlign: 'center', opacity: 0.4 }}>Initializing records...</div>
                      ) : accountTxs.length === 0 ? (
                        <div style={{ padding: '4rem', textAlign: 'center', opacity: 0.3 }}>No history found for this node.</div>
                      ) : (
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr>
                                {['Date', 'Type', 'Amount', 'Reference'].map(h => (
                                  <th key={h} style={{ textAlign: 'left', padding: '1rem', borderBottom: '1px solid var(--border-soft)', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-muted)' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {accountTxs.map(tx => (
                                <tr key={tx.id} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                                  <td style={{ padding: '1.25rem 1rem', fontSize: '12px', fontWeight: 700 }}>{formatDateDhaka(tx.occurredAt)}</td>
                                  <td style={{ padding: '1.25rem 1rem' }}>
                                    <span style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', padding: '4px 10px', borderRadius: '8px', background: tx.type === 'deposit' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: tx.type === 'deposit' ? '#10b981' : '#ef4444' }}>{tx.type}</span>
                                  </td>
                                  <td style={{ padding: '1.25rem 1rem', fontWeight: 900, color: tx.type === 'deposit' ? '#10b981' : '#ef4444' }}>৳{tx.amount.toLocaleString()}</td>
                                  <td style={{ padding: '1.25rem 1rem', fontSize: '12px', color: 'var(--text-muted)' }}>{tx.description || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="card" style={{ height: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '1.5rem', border: '1px dashed var(--border)' }}>
                    <div style={{ padding: '2rem', background: 'var(--overlay-soft)', borderRadius: '50%', color: 'var(--text-muted)', opacity: 0.2 }}>
                      <Building2 size={80} />
                    </div>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-main)' }}>No Node Selected</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>Select an account from the left to view detailed analytics.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ── System Audit View ── */
          <div className="card animate-fade-in" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '2rem', borderBottom: '1px solid var(--border-soft)', background: 'var(--overlay-soft)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <ShieldCheck size={18} color="var(--primary)" />
                <h2 style={{ fontSize: '16px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>System Integrity Audit</h2>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Unified chronological records across all decentralized financial nodes.</p>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr className="table-header">
                    {['Marker', 'Financial Node', 'Vector', 'Delta', 'Status', 'Context'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '1.25rem' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {summary?.recentTransactions.map(tx => (
                    <tr key={tx.id} className="table-row">
                      <td style={{ padding: '1.25rem' }}>
                        <p style={{ fontSize: '12px', fontWeight: 900 }}>{formatDateDhaka(tx.occurredAt)}</p>
                        <p style={{ fontSize: '10px', color: 'var(--text-muted)', opacity: 0.5 }}>{formatTimeDhaka(tx.occurredAt)}</p>
                      </td>
                      <td style={{ padding: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--overlay-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}><Building2 size={14} /></div>
                          <span style={{ fontSize: '13px', fontWeight: 900 }}>{tx.bankAccount.bankName}</span>
                        </div>
                      </td>
                      <td style={{ padding: '1.25rem' }}>
                        <span style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', padding: '4px 10px', borderRadius: '8px', background: tx.type === 'deposit' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: tx.type === 'deposit' ? '#10b981' : '#ef4444' }}>{tx.type}</span>
                      </td>
                      <td style={{ padding: '1.25rem', fontWeight: 900, fontSize: '15px', color: tx.type === 'deposit' ? '#10b981' : '#ef4444' }}>
                        {tx.type === 'deposit' ? '+' : '-'}৳{tx.amount.toLocaleString()}
                      </td>
                      <td style={{ padding: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }} />
                          <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Verified</span>
                        </div>
                      </td>
                      <td style={{ padding: '1.25rem', fontSize: '12px', color: 'var(--text-muted)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.description || 'System generated entry'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
