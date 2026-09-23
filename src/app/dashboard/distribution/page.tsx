'use client';

import React, { Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Truck, Boxes } from 'lucide-react';
import MainLayout from '@/components/MainLayout';
import FleetSection from '@/components/sections/FleetSection';
import DistributionSection from '@/components/sections/DistributionSection';

type Tab = 'distribution' | 'fleet';

function MergedPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const rawTab = searchParams.get('tab');
  const tab: Tab = rawTab === 'fleet' ? 'fleet' : 'distribution';

  const setTab = (next: Tab) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'distribution') params.delete('tab');
    else params.set('tab', next);
    router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '4rem' }}>
      <TabBar tab={tab} onChange={setTab} />
      {tab === 'fleet' ? <FleetSection /> : <DistributionSection />}
    </div>
  );
}

export default function DistributionAndVansPage() {
  return (
    <MainLayout>
      <Suspense fallback={null}>
        <MergedPageInner />
      </Suspense>
    </MainLayout>
  );
}

function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        gap: '4px',
        padding: '4px',
        borderRadius: '14px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        alignSelf: 'flex-start',
      }}
    >
      <TabButton
        active={tab === 'distribution'}
        onClick={() => onChange('distribution')}
        icon={<Truck size={13} />}
        label="Distribution"
      />
      <TabButton
        active={tab === 'fleet'}
        onClick={() => onChange('fleet')}
        icon={<Boxes size={13} />}
        label="Fleet"
      />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        borderRadius: '10px',
        fontSize: '11px',
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: '0.15em',
        cursor: 'pointer',
        border: '1px solid transparent',
        background: active ? 'rgba(16,185,129,0.1)' : 'transparent',
        color: active ? 'var(--primary)' : 'var(--text-muted)',
        borderColor: active ? 'rgba(16,185,129,0.25)' : 'transparent',
        transition: 'all 0.2s ease',
      }}
    >
      {icon}
      {label}
    </button>
  );
}
