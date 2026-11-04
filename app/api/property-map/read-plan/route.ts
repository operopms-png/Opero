import { NextRequest, NextResponse } from 'next/server'
import { requireStaffWithBusiness } from '@/lib/admin-auth'
import { callClaudeWithDocument } from '@/lib/claude'
import { sanitizeLayout } from '@/lib/flat-layout'

export const maxDuration = 60

// POST { planUrl } -> { layout }: the AI reads an uploaded floor plan and returns rectangular rooms in metres.
export async function POST(req: NextRequest) {
  const s = await requireStaffWithBusiness(req)
  if (!s) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const b = await req.json().catch(() => ({}))
  const url = String(b.planUrl || '')
  // Only plans stored in this project's own file storage
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
  if (!base || !url.startsWith(base + '/storage/v1/object/public/')) return NextResponse.json({ error: 'Upload the plan first' }, { status: 400 })
  const r = await fetch(url, { signal: AbortSignal.timeout(15000) }).catch(() => null)
  if (!r?.ok) return NextResponse.json({ error: 'Could not open the plan file' }, { status: 400 })
  const type = (r.headers.get('content-type') || '').split(';')[0]
  if (!['image/png', 'image/jpeg', 'image/webp', 'application/pdf'].includes(type)) return NextResponse.json({ error: 'Use a PNG, JPG, WEBP or PDF plan' }, { status: 400 })
  const buf = Buffer.from(await r.arrayBuffer())
  if (buf.length > 8 * 1024 * 1024) return NextResponse.json({ error: 'That plan file is too big (8 MB at most)' }, { status: 400 })
  const system = [
    'You read architectural floor plans of one flat and return its rooms as rectangles in metres.',
    'Return ONLY a JSON object: {"rooms":[{"name":"Bedroom 2","kind":"bedroom","x":0,"y":0,"w":3.2,"h":3.6}]}.',
    'x and y are the top-left corner of each room measured from the top-left of the whole flat; w is width and h is height. Use the plan as drawn: north up, as the page is.',
    'kind is one of: bedroom, living, dining, kitchen, bath, hall, balcony, study, storage, other.',
    'Use printed dimensions or the stated area when the plan shows them; otherwise judge scale from standard sizes (a single bed is about 0.9 x 1.9 m, a door about 0.9 m).',
    'Approximate each room as ONE rectangle. Rooms must not overlap. Include every room, bathroom and balcony. Ignore text that is not a room.',
  ].join('\n')
  const out = await callClaudeWithDocument(system, 'Return the JSON for this floor plan.', { base64: buf.toString('base64'), mediaType: type }, 1800)
  if (out.error || !out.text) return NextResponse.json({ error: 'The AI could not read this plan' }, { status: 502 })
  let layout = null
  try { layout = sanitizeLayout(JSON.parse(out.text.slice(out.text.indexOf('{'), out.text.lastIndexOf('}') + 1))) } catch { /* fall through */ }
  if (!layout) return NextResponse.json({ error: 'The AI could not find rooms in this plan. Draw them by hand instead.' }, { status: 422 })
  return NextResponse.json({ layout })
}
