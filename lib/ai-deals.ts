// Deal screening skill. Runs the deterministic Deal Decision Engine on deals still at "Found" and leaves
// ONE task listing a go / review / no-go for each. It never moves a deal or spends money: a person decides.
import { svc, aiTask, freshCounts, enabledBusinesses } from './ai-proposal-utils'
import { screenDeal } from './deal-engine-run'
import { dayStr } from './ai-proposal-utils'

const WORD: Record<string, string> = { PASS: 'Go', REVIEW: 'Review', REJECT: 'No-go' }

export async function proposeDealScreening() {
  const db = svc(); const result = freshCounts()
  const businesses = await enabledBusinesses('deal_screening'); result.businesses = businesses.length
  for (const biz of businesses) {
    try {
      const { data: deals } = await db.from('investment_deals').select('id, strategy, address, data').eq('user_id', biz).eq('stage', 'Found').order('created_at', { ascending: true }).limit(10)
      if (!deals?.length) { result.skipped++; continue }
      const lines: string[] = []
      for (const d of deals) {
        const form = d.data?.form ?? d.data ?? {}
        const { engineOutput: o } = await screenDeal(biz, d.strategy, form)
        const why = [...o.ruleResults.filter((r: any) => /FAIL|REVIEW|MISSING/i.test(String(r.result))).map((r: any) => r.rule), ...o.missingFields.map((m: string) => `missing ${m}`)].slice(0, 3).join('; ')
        lines.push(`${d.address || 'Deal'} (${d.strategy.toUpperCase()}): ${WORD[o.status] ?? o.status}${why ? ' — ' + why : ''}`)
        await db.from('investment_deals').update({ stage: 'Screened', stage_updated_at: new Date().toISOString(), data: { ...(d.data ?? {}), screening: { status: o.status, at: dayStr() } } }).eq('id', d.id)
      }
      const made = await aiTask(biz, `Deals screened: ${lines.length} ready for your decision`, lines.join('\n') + '\nOpen Deal Analyser → Saved Deals to move each one forward or reject it.', 1)
      if (made) result.queued++; else result.skipped++
    } catch (e) { result.errors.push(`deal_screening ${biz}: ${e instanceof Error ? e.message : String(e)}`) }
  }
  return result
}
