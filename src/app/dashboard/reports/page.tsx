'use client';

import React from 'react';
import MainLayout from '@/components/MainLayout';
import { 
  PieChart as PieChartIcon, 
  BarChart as BarChartIcon, 
  Download, 
  FileSpreadsheet, 
  FileText,
  Calendar,
  ChevronDown,
  Activity,
  ArrowUpRight,
  TrendingUp,
  Clock,
  ExternalLink,
  ChevronRight,
  Printer
} from 'lucide-react';

export default function ReportsPage() {
  const reports = [
    { title: 'Sales Performance', icon: <BarChartIcon size={22} />, desc: 'Monthly revenue growth & van yield distribution', color: '#10b981' },
    { title: 'Cost Analysis', icon: <PieChartIcon size={22} />, desc: 'Operating expenses categorized by resource type', color: '#ef4444' },
    { title: 'Profit & Loss', icon: <FileText size={22} />, desc: 'Complete financial statement and unit margins', color: '#3b82f6' },
    { title: 'Product Velocity', icon: <Activity size={22} />, desc: 'Fastest moving stock and turnover metrics', color: '#f59e0b' },
  ];

  const statRows = [
    { name: 'Total Sales Revenue', count: '1,240 tx', amount: '3,500,000', trend: '+12.5%', status: 'Growth' },
    { name: 'Direct Operating Costs', count: '842 tx', amount: '450,000', trend: '+5.2%', status: 'High' },
    { name: 'Inventory Procurement', count: '156 tx', amount: '120,000', trend: '-2.1%', status: 'Stable' },
    { name: 'Net Business Profit', count: '-', amount: '2,930,000', trend: '+15.8%', status: 'Healthy' },
  ];

  return (
    <MainLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '3rem' }} className="animate-fade-in">
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ 
              padding: '14px', 
              background: 'rgba(139,92,246,0.1)', 
              borderRadius: '18px', 
              color: '#8b5cf6', 
              border: '1px solid rgba(139,92,246,0.2)',
              boxShadow: '0 0 24px rgba(139,92,246,0.1)' 
            }}>
              <PieChartIcon size={28} />
            </div>
            <div>
              <h1 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-main)', textTransform: 'uppercase', fontStyle: 'italic', lineHeight: 1.1 }}>
                Business<span style={{ color: '#8b5cf6' }}>.Intelligence</span>
              </h1>
              <p style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3em', opacity: 0.6, marginTop: '4px' }}>
                Operational Archives · PDF & Excel Vault
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ 
              display: 'flex', 
              gap: '2px', 
              background: 'var(--surface)', 
              border: '1px solid var(--border)', 
              borderRadius: '14px', 
              padding: '4px' 
            }}>
              <button className="btn-secondary" style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '10px', border: 'none', background: 'var(--overlay-soft)' }}>
                <Calendar size={14} /> April 2026
              </button>
              <button className="btn-secondary" style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '10px', border: 'none' }}>
                <ChevronDown size={14} />
              </button>
            </div>
            <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}>
              <Download size={14} /> Export All
            </button>
          </div>
        </div>

        {/* Report Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {reports.map((report, i) => (
            <div key={i} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative', overflow: 'hidden' }}>
              {/* Background Glow */}
              <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '120px', height: '120px', borderRadius: '50%', background: report.color, opacity: 0.05, filter: 'blur(40px)' }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ 
                  padding: '12px', 
                  borderRadius: '14px', 
                  backgroundColor: `${report.color}15`, 
                  color: report.color, 
                  border: `1px solid ${report.color}25` 
                }}>
                  {report.icon}
                </div>
                <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', opacity: 0.4, cursor: 'pointer' }}>
                  <ExternalLink size={14} />
                </button>
              </div>

              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-main)', marginBottom: '6px' }}>
                  {report.title}
                </h3>
                <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {report.desc}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                <button className="btn-secondary" style={{ flex: 1, padding: '10px', fontSize: '9px', justifyContent: 'center' }}>
                  <FileSpreadsheet size={14} /> Excel
                </button>
                <button className="btn-secondary" style={{ flex: 1, padding: '10px', fontSize: '9px', justifyContent: 'center' }}>
                  <FileText size={14} /> PDF
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Detailed Stats Section */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ 
            padding: '1.5rem', 
            borderBottom: '1px solid var(--border)', 
            background: 'var(--overlay-soft)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <TrendingUp size={18} style={{ color: 'var(--primary)' }} />
              <div>
                <h3 style={{ fontSize: '13px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-main)' }}>Monthly Summary Ledger</h3>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', opacity: 0.5 }}>Fiscal analysis · Q2 2026</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '10px' }}>
                <Printer size={12} /> Print Stats
              </button>
            </div>
          </div>

          <div style={{
            padding: '10px 1.5rem',
            background: 'rgba(245,158,11,0.08)',
            borderBottom: '1px solid rgba(245,158,11,0.2)',
            color: '#f59e0b',
            fontSize: '10px',
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}>
            Sample data — not wired to live figures yet
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Report Category', 'Activity Volume', 'Gross Amount (৳)', 'Growth Trend', 'Fiscal Health'].map((h) => (
                    <th key={h} className="table-header">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {statRows.map((row, i) => (
                  <tr key={i} className="table-row">
                    <td className="table-cell">
                      <span style={{ fontWeight: 900, color: 'var(--text-main)', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.02em' }}>{row.name}</span>
                    </td>
                    <td className="table-cell">
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{row.count}</span>
                    </td>
                    <td className="table-cell">
                      <span style={{ 
                        fontSize: '15px', 
                        fontWeight: 900, 
                        color: row.name.includes('Profit') ? '#10b981' : row.name.includes('Revenue') ? 'white' : '#ef4444',
                        fontStyle: 'italic',
                        fontVariantNumeric: 'tabular-nums'
                      }}>
                        ৳{row.amount}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ArrowUpRight size={14} style={{ color: row.trend.startsWith('+') ? '#10b981' : '#ef4444' }} />
                        <span style={{ fontWeight: 900, fontSize: '12px', color: row.trend.startsWith('+') ? '#10b981' : '#ef4444', fontVariantNumeric: 'tabular-nums' }}>
                          {row.trend}
                        </span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        padding: '4px 10px', 
                        borderRadius: '8px', 
                        fontSize: '9px', 
                        fontWeight: 900, 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.12em',
                        background: i === 0 || i === 3 ? 'rgba(16,185,129,0.1)' : i === 1 ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)',
                        color: i === 0 || i === 3 ? '#10b981' : i === 1 ? '#ef4444' : '#3b82f6',
                        border: `1px solid ${i === 0 || i === 3 ? 'rgba(16,185,129,0.2)' : i === 1 ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.2)'}`
                      }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'currentColor', boxShadow: '0 0 6px currentColor' }} />
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div style={{ padding: '1.25rem 1.5rem', background: 'var(--overlay-shadow)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)' }}>
             <p style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
               Last audit performed: <span style={{ color: 'var(--text-main)' }}>2 hours ago</span>
             </p>
             <button className="btn-secondary" style={{ fontSize: '10px', color: 'var(--primary)', borderColor: 'rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.05)' }}>
               Initiate Full Audit Cycle
             </button>
          </div>
        </div>

        {/* Lower Info Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <Activity size={18} style={{ color: 'var(--primary)' }} />
              <h3 style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-main)' }}>Audit Pipeline</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { label: 'Sales Verification', status: 'Completed', time: '10:45 AM' },
                { label: 'Resource Reconciliation', status: 'In Progress', time: '11:12 AM' },
                { label: 'Fiscal Statement Gen', status: 'Pending', time: '---' },
              ].map((job, j) => (
                <div key={j} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--overlay-soft)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <div>
                    <p style={{ fontSize: '11px', fontWeight: 900, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{job.label}</p>
                    <p style={{ fontSize: '9px', fontWeight: 600, color: 'var(--text-muted)', opacity: 0.5 }}>{job.time}</p>
                  </div>
                  <span style={{ fontSize: '9px', fontWeight: 900, color: job.status === 'Completed' ? '#10b981' : job.status === 'In Progress' ? '#3b82f6' : 'var(--text-muted)', textTransform: 'uppercase' }}>{job.status}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <Clock size={18} style={{ color: '#ef4444' }} />
              <h3 style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-main)' }}>Scheduled Reports</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               <div style={{ padding: '1.25rem', borderRadius: '14px', border: '1px solid var(--border-soft)', background: 'var(--overlay-soft)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ padding: '10px', background: 'rgba(239,68,68,0.1)', borderRadius: '10px', color: '#ef4444' }}>
                    <Calendar size={18} />
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', fontWeight: 900, color: 'var(--text-main)' }}>Quarterly Fiscal Audit</p>
                    <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>Due in 12 days · May 01, 2026</p>
                  </div>
                  <ChevronRight size={16} style={{ marginLeft: 'auto', opacity: 0.3 }} />
               </div>
               <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center', borderStyle: 'dashed' }}>
                 Schedule New Protocol
               </button>
            </div>
          </div>
        </div>

      </div>
    </MainLayout>
  );
}
