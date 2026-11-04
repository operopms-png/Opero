// A flat's layout: rectangular rooms in metres, origin top-left. Used by the editor, the AI plan reader and the 3D viewer.
export type RoomKind = 'bedroom' | 'living' | 'dining' | 'kitchen' | 'bath' | 'hall' | 'balcony' | 'study' | 'storage' | 'other'
export type Room = { id: string; name: string; kind: RoomKind; x: number; y: number; w: number; h: number }
export type Layout = { w: number; d: number; rooms: Room[] }

export const KINDS: { kind: RoomKind; label: string }[] = [
  { kind: 'bedroom', label: 'Bedroom' }, { kind: 'living', label: 'Living room' }, { kind: 'dining', label: 'Dining' }, { kind: 'kitchen', label: 'Kitchen' },
  { kind: 'bath', label: 'Bathroom' }, { kind: 'hall', label: 'Hall' }, { kind: 'balcony', label: 'Balcony' }, { kind: 'study', label: 'Study' },
  { kind: 'storage', label: 'Storage' }, { kind: 'other', label: 'Other' },
]
const KIND_SET = new Set(KINDS.map(k => k.kind))
const snap = (n: number) => Math.round(n * 10) / 10

// Clean untrusted layout data (from the browser or the AI): clamp sizes, round to 10 cm, drop bad rooms.
export function sanitizeLayout(raw: any): Layout | null {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.rooms)) return null
  const rooms: Room[] = []
  for (const r of raw.rooms.slice(0, 30)) {
    const x = Number(r?.x), y = Number(r?.y), w = Number(r?.w), h = Number(r?.h)
    if (![x, y, w, h].every(Number.isFinite) || w < 0.8 || h < 0.8 || w > 30 || h > 30 || x < 0 || y < 0 || x > 60 || y > 60) continue
    const kind: RoomKind = KIND_SET.has(r.kind) ? r.kind : 'other'
    rooms.push({ id: String(r.id || `r${rooms.length + 1}`).slice(0, 24), name: String(r.name || KINDS.find(k => k.kind === kind)?.label || 'Room').slice(0, 40), kind, x: snap(x), y: snap(y), w: snap(w), h: snap(h) })
  }
  if (!rooms.length) return null
  const w = snap(Math.max(...rooms.map(r => r.x + r.w)) + 0.5), d = snap(Math.max(...rooms.map(r => r.y + r.h)) + 0.5)
  return { w, d, rooms }
}
