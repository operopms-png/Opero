// Road to 100: how far the company is from its property goal and whether it is on pace.
// baseline = extra homes you manage outside the portal; homes in Property Management / Estate Agency are counted automatically.
export type Goal = { title: string; target: number; deadline: string | null; baseline: number }
export type Funnel = { new: number; contacted: number; valuation: number; meeting: number; signed: number; lost: number }
export type Road = {
  goal: Goal; signed: number; current: number; remaining: number; pct: number
  monthsLeft: number | null; neededPerMonth: number | null; signedLast30: number; leadsLast30: number
  state: 'done' | 'ahead' | 'on' | 'behind' | 'nodate'; funnel: Funnel; pipeline: number; managed: number
}
export const DEFAULT_DEADLINE = '2027-06-01'
const DAY = 864e5

// `props` are rows from Client Properties: signed_at marks a signed property, `open` is how many are still being worked.
export function buildRoad(goal: Goal, leads: { status: string; created_at: string; updated_at: string | null }[], props: { signed: number; signedLast30: number; open: number; managed: number } = { signed: 0, signedLast30: 0, open: 0, managed: 0 }, now = Date.now()): Road {
  const funnel: Funnel = { new: 0, contacted: 0, valuation: 0, meeting: 0, signed: 0, lost: 0 }
  let signedLast30 = 0, leadsLast30 = 0
  for (const l of leads) {
    if (l.status === 'linked') { if (now - new Date(l.created_at).getTime() <= 30 * DAY) leadsLast30++; continue } // signed lead already counted as a Client Properties row
    const s = (l.status in funnel ? l.status : 'new') as keyof Funnel
    funnel[s]++
    if (s === 'signed' && now - new Date(l.updated_at || l.created_at).getTime() <= 30 * DAY) signedLast30++
    if (now - new Date(l.created_at).getTime() <= 30 * DAY) leadsLast30++
  }
  funnel.signed += props.signed
  signedLast30 += props.signedLast30
  const current = props.managed + goal.baseline + funnel.signed
  const remaining = Math.max(0, goal.target - current)
  const monthsLeft = goal.deadline ? Math.max(0, (new Date(goal.deadline + 'T00:00:00Z').getTime() - now) / (30.44 * DAY)) : null
  const neededPerMonth = monthsLeft == null ? null : remaining === 0 ? 0 : Math.ceil(remaining / Math.max(monthsLeft, 1 / 30))
  const state: Road['state'] = remaining === 0 ? 'done' : neededPerMonth == null ? 'nodate' : signedLast30 > neededPerMonth ? 'ahead' : signedLast30 >= neededPerMonth ? 'on' : 'behind'
  return { goal, signed: funnel.signed, current, remaining, pct: Math.min(100, Math.round((current / goal.target) * 1000) / 10), monthsLeft, neededPerMonth, signedLast30, leadsLast30, state, funnel, pipeline: props.open, managed: props.managed }
}
