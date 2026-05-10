import { FX_RATES } from '../data/demoFlights';

const CURRENCY_FALLBACK = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  RUB: '₽',
  JPY: '¥',
  AED: 'د.إ',
};

export function formatCurrency(amount, currency = 'USD', { compact = false } = {}) {
  if (amount == null || Number.isNaN(amount)) return '—';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: compact || amount > 1000 ? 0 : 2,
      notation: compact ? 'compact' : 'standard',
    }).format(amount);
  } catch {
    const sym = CURRENCY_FALLBACK[currency] || currency;
    return `${sym}${Math.round(amount).toLocaleString('en-US')}`;
  }
}

export function toUSD(amount, currency) {
  const rate = FX_RATES[currency] ?? 1;
  return amount * rate;
}

export function formatNumber(n, opts = {}) {
  if (n == null || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('en-US', opts).format(n);
}

export function formatKm(km) {
  if (km == null) return '—';
  return `${formatNumber(Math.round(km))} km`;
}

export function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function formatDuration(minutes) {
  if (!minutes && minutes !== 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}
