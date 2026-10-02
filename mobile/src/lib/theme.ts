// Sangsters app theme — corporate: white, ink, gold. Archivo for headings, Figtree for body.
export const C = {
  ink: '#191815', ink2: '#55524b', mute: '#8a857a', faint: '#9a958a',
  line: '#ece8df', line2: '#f2efe8', bg: '#ffffff', soft: '#fbfaf7', cream: '#faf3e2', creamLine: '#eadbb8',
  gold: '#C9A24A', goldText: '#8E6B1F', goldDark: '#A8862E', goldLight: '#D9B866',
  green: '#1F7A4D', greenBg: '#e7f4ec', amber: '#9A5B00', amberBg: '#fdf1dc', blue: '#1f4f8a', blueBg: '#e6eef8', red: '#B3261E', redBg: '#fdecea',
}
export const F = {
  head: 'Archivo_700Bold', headSemi: 'Archivo_600SemiBold',
  body: 'Figtree_400Regular', medium: 'Figtree_500Medium', semi: 'Figtree_600SemiBold', bold: 'Figtree_700Bold',
}
export const money = (n: number | null | undefined, cur = '£') =>
  n == null || isNaN(Number(n)) ? '—' : `${Number(n) < 0 ? '−' : ''}${cur}${Math.abs(Number(n)).toLocaleString('en-GB', { minimumFractionDigits: Number(n) % 1 ? 2 : 0, maximumFractionDigits: 2 })}`
export const day = (d?: string | null, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) =>
  d ? new Date(d.length === 10 ? d + 'T00:00:00' : d).toLocaleDateString('en-GB', opts) : '—'
