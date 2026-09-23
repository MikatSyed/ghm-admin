function safeNumber(n: number | null | undefined) {
  return typeof n === 'number' && Number.isFinite(n) ? n : 0;
}

export function formatBDT(n: number | null | undefined, mode: 'full' | 'compact' = 'full'): string {
  const value = safeNumber(n);
  if (mode === 'compact') {
    const abs = Math.abs(value);
    if (abs >= 1_000_000) return `৳${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (abs >= 1_000) return `৳${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return `৳${value.toLocaleString('en-US')}`;
}

export function formatInt(n: number | null | undefined): string {
  return safeNumber(n).toLocaleString('en-US');
}

export function formatDateDhaka(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(date);
}

export function formatTimeDhaka(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '--:--';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dhaka',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function todayInDhakaISO(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date());
}

export function startOfWeekDhakaISO(): string {
  const today = todayInDhakaISO();
  const date = new Date(`${today}T00:00:00+06:00`);
  date.setUTCDate(date.getUTCDate() - date.getUTCDay());
  return date.toISOString().slice(0, 10);
}

export function startOfMonthDhakaISO(): string {
  return `${todayInDhakaISO().slice(0, 8)}01`;
}
