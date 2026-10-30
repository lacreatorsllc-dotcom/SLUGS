export const money = (value: number | null | undefined, signed = false) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
  return `${value < 0 ? '−' : signed && value > 0 ? '+' : ''}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
export const count = (value: number | null | undefined) => typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—'
export const compact = (value: number | null | undefined) => typeof value === 'number' && Number.isFinite(value) ? Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value) : '—'
export const price = (value: number | null | undefined) => typeof value === 'number' && Number.isFinite(value) ? value === 0 ? '$0.00' : value < 0.01 ? `$${value.toPrecision(3)}` : money(value) : '—'
export const tone = (value: number | null | undefined) => value && value > 0 ? 't-positive' : value && value < 0 ? 't-negative' : ''
export const winRate = (value: number | null | undefined) => typeof value === 'number' && Number.isFinite(value) ? `${Math.round(value * 100)}%` : '—'
