// Group/video call minutes per company. Rooms are named nvq-<company code>-<random>, and Daily keeps a
// record of who was in each room and for how long, so usage is read back from Daily (no table to keep in step).
// A "participant minute" is one person in a call for one minute, which is how Daily bills.
export const DAILY_COST_PER_MIN = 0.004 // USD, Daily's video rate after the free allowance

export const companyCode = (businessId: string) => businessId.replace(/-/g, '').slice(0, 8)

async function dailyGet(path: string) {
  const res = await fetch('https://api.daily.co/v1' + path, { headers: { Authorization: `Bearer ${process.env.DAILY_API_KEY}` } })
  if (!res.ok) throw new Error(`Call service error ${res.status}`)
  return res.json()
}

// Participant minutes this calendar month, per company code.
export async function monthUsageByCompany(): Promise<Record<string, number>> {
  const start = new Date(); start.setUTCDate(1); start.setUTCHours(0, 0, 0, 0)
  const out: Record<string, number> = {}
  let after = ''
  for (let page = 0; page < 20; page++) {
    const j = await dailyGet(`/meetings?timeframe_start=${Math.floor(start.getTime() / 1000)}&limit=100${after ? `&starting_after=${after}` : ''}`)
    const list: any[] = j?.data ?? []
    for (const m of list) {
      const code = /^nvq-([a-f0-9]{8})-/.exec(String(m.room || ''))?.[1]
      if (!code) continue
      const secs = (m.participants ?? []).reduce((s: number, p: any) => s + (Number(p.duration) || 0), 0)
      out[code] = (out[code] || 0) + secs / 60
    }
    if (list.length < 100) break
    after = list[list.length - 1].id
  }
  return out
}

export async function monthMinutesFor(businessId: string): Promise<number> {
  return (await monthUsageByCompany())[companyCode(businessId)] || 0
}
