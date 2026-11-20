export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getCaller } from '@/lib/mailbox'
import { serviceSamplePoints } from '@/lib/dev-terrain'

// Developments → Feasibility → Terrain → "Load ground levels for this location".
//   POST { lat, lng, size }  ->  { n, size, z }   ground heights in metres on an n x n grid, size metres across.
// Heights come from the free OpenTopoData service (NASA SRTM, about 30 m between points), so they are rough:
// good for the lie of the land, not for pricing earthworks. A survey file is more exact.
const N = 17
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export async function POST(req: NextRequest) {
  const me = await getCaller(req)
  if (!me) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const b = await req.json().catch(() => ({}))
  const lat = Number(b.lat), lng = Number(b.lng), size = Math.min(2000, Math.max(100, Number(b.size) || 320))
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 60 || Math.abs(lng) > 180) return NextResponse.json({ error: 'Enter the latitude and longitude of the site (between 60 degrees north and south).' }, { status: 400 })
  const pts = serviceSamplePoints(lat, lng, size, N)
  const z: number[] = []
  for (let k = 0; k < pts.length; k += 100) {
    const chunk = pts.slice(k, k + 100)
    const url = 'https://api.opentopodata.org/v1/srtm30m?locations=' + chunk.map(p => `${p.latitude.toFixed(6)},${p.longitude.toFixed(6)}`).join('|')
    let ok = false
    for (let tries = 0; tries < 2 && !ok; tries++) {
      try {
        const r = await fetch(url, { cache: 'no-store' })
        const d: any = await r.json()
        if (r.ok && Array.isArray(d.results)) { for (const x of d.results) z.push(Number(x.elevation ?? NaN)); ok = true }
      } catch { /* try again */ }
      if (!ok) await sleep(1200)
    }
    if (!ok) return NextResponse.json({ error: 'The ground-level service did not answer. Try again in a minute, or add a survey file instead.' }, { status: 502 })
    if (k + 100 < pts.length) await sleep(1100)
  }
  if (z.some(v => !Number.isFinite(v))) return NextResponse.json({ error: 'The service has no ground data for this spot. Add a survey file instead.' }, { status: 422 })
  return NextResponse.json({ n: N, size, z })
}
