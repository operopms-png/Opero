// Developments → Feasibility: ground levels, pads, and how much soil must be cut or filled.
// Works on a square grid of heights in metres. Heights come from a survey file the user adds,
// from the free elevation service (about 30 m between points, so rough), or from the labelled sample.

export type Grid = { n: number; size: number; z: number[]; source: 'sample' | 'survey' | 'service' }   // n x n points, size = metres per side
export type Pad = { id: string; x: number; y: number; w: number; d: number; level?: number }               // metres from the south-west corner

export const cellSize = (g: Grid) => g.size / (g.n - 1)
export const at = (g: Grid, i: number, j: number) => g.z[j * g.n + i]

/** Height at any point, by blending the four nearest grid points. */
export function heightAt(g: Grid, x: number, y: number): number {
  const c = cellSize(g)
  const fx = Math.min(g.n - 1.001, Math.max(0, x / c)), fy = Math.min(g.n - 1.001, Math.max(0, y / c))
  const i = Math.floor(fx), j = Math.floor(fy), tx = fx - i, ty = fy - j
  const a = at(g, i, j), b = at(g, i + 1, j), d = at(g, i, j + 1), e = at(g, i + 1, j + 1)
  return a * (1 - tx) * (1 - ty) + b * tx * (1 - ty) + d * (1 - tx) * ty + e * tx * ty
}

/** Example ground: a gentle hill with a creek running through it. Clearly labelled as an example in the screen. */
export function sampleGrid(n = 41, size = 320): Grid {
  const z: number[] = []
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1, y = (j / (n - 1)) * 2 - 1
    const hill = 9 * Math.exp(-((x + 0.35) ** 2 + (y - 0.3) ** 2) / 0.35)
    const slope = 3.2 * (1 - y)
    const creekLine = 0.18 * Math.sin(x * 3.1) + 0.15
    const creek = -3.6 * Math.exp(-((y - creekLine) ** 2) / 0.012)
    const ripple = 0.35 * Math.sin(x * 11) * Math.cos(y * 9)
    z.push(100 + hill + slope + creek + ripple)
  }
  return { n, size, z, source: 'sample' }
}

export function samplePads(): Pad[] {
  const pads: Pad[] = []
  let k = 1
  for (const [x, y] of [[60, 220], [110, 220], [160, 220], [210, 220], [60, 160], [110, 160], [160, 160], [210, 160]]) pads.push({ id: `Pad ${k++}`, x, y, w: 38, d: 30 })
  return pads
}

/** For each pad: the level that balances cut and fill, and the soil to move (cubic metres). */
export function padEarthworks(g: Grid, pads: Pad[], step = 2) {
  return pads.map(p => {
    let sum = 0, count = 0
    for (let x = p.x + step / 2; x < p.x + p.w; x += step) for (let y = p.y + step / 2; y < p.y + p.d; y += step) { sum += heightAt(g, x, y); count++ }
    const level = p.level ?? (count ? sum / count : 0)
    let cut = 0, fill = 0
    for (let x = p.x + step / 2; x < p.x + p.w; x += step) for (let y = p.y + step / 2; y < p.y + p.d; y += step) {
      const dz = heightAt(g, x, y) - level
      if (dz > 0) cut += dz * step * step; else fill += -dz * step * step
    }
    return { ...p, level, cut, fill }
  })
}

export const totalMoved = (rows: { cut: number; fill: number }[]) => ({
  cut: rows.reduce((a, r) => a + r.cut, 0), fill: rows.reduce((a, r) => a + r.fill, 0),
})

/** Survey points (x, y, z in metres, one per line, comma or tab separated) → a grid, by weighting nearby points. */
export function gridFromPoints(text: string, n = 41): Grid | null {
  const pts = text.split(/\r?\n/).map(l => l.split(/[,\t; ]+/).map(Number)).filter(r => r.length >= 3 && r.slice(0, 3).every(Number.isFinite)).map(r => ({ x: r[0], y: r[1], z: r[2] }))
  if (pts.length < 4) return null
  const minX = Math.min(...pts.map(p => p.x)), minY = Math.min(...pts.map(p => p.y))
  const size = Math.max(Math.max(...pts.map(p => p.x)) - minX, Math.max(...pts.map(p => p.y)) - minY)
  if (!(size > 0)) return null
  const z: number[] = []
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const gx = (i / (n - 1)) * size + minX, gy = (j / (n - 1)) * size + minY
    let w = 0, s = 0
    for (const p of pts) { const d2 = (p.x - gx) ** 2 + (p.y - gy) ** 2 + 1e-6; const wi = 1 / (d2 * d2); w += wi; s += wi * p.z }
    z.push(s / w)
  }
  return { n, size, z, source: 'survey' }
}

/** Points to ask the elevation service for: an n x n grid around a centre, `size` metres across. */
export function serviceSamplePoints(lat: number, lng: number, size: number, n: number) {
  const mLat = 111320, mLng = 111320 * Math.cos((lat * Math.PI) / 180)
  const out: { latitude: number; longitude: number }[] = []
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    out.push({ latitude: lat + ((j / (n - 1) - 0.5) * size) / mLat, longitude: lng + ((i / (n - 1) - 0.5) * size) / mLng })
  }
  return out
}
