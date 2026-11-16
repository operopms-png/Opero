'use client'
// Dashboard → Market intelligence: Quick Insights (AI), My Watchlist, Top Locations by Rental Yield and
// Featured Property Analysis, built from this company's saved deals and watchlist (Invest pages).
// Only shown to people who have the Invest module. "Preview example" swaps in labelled example figures.
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase, getAccountId } from '../../lib/supabase'
import { staffApi } from '../../lib/staff-api'
import { useRole } from '../../lib/useRole'
import { buildIntel, ruleInsights, EXAMPLE, type Insight } from '../../lib/market-intel'
import MarketIntelView from './MarketIntelView'

export default function MarketIntelPanels() {
  const { modules, loading: roleLoading } = useRole()
  const [rows, setRows] = useState<{ deals: any[]; watch: any[] } | null>(null)
  const [example, setExample] = useState(false)
  const [ai, setAi] = useState<Insight[] | null>(null)
  const [busy, setBusy] = useState(false)
  const allowed = !roleLoading && modules.includes('invest')

  useEffect(() => {
    if (!allowed) return
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const acct = await getAccountId(user)
      const [d, w] = await Promise.all([
        supabase.from('investment_deals').select('id,address,strategy,data,created_at').eq('user_id', acct).order('created_at', { ascending: false }).limit(300),
        supabase.from('investment_watchlist').select('id,address,price,notes,status').eq('user_id', acct).order('created_at', { ascending: false }).limit(50),
      ])
      setRows({ deals: d.data ?? [], watch: w.data ?? [] })
    })().catch(() => setRows({ deals: [], watch: [] }))
  }, [allowed])

  const intel = useMemo(() => rows ? buildIntel(rows.deals, rows.watch) : null, [rows])
  const factsKey = intel ? JSON.stringify(intel.facts) : ''
  const hasFacts = !!intel && (intel.facts.savedDeals > 0 || intel.facts.watchlist > 0)

  // One AI call per day per browser unless Refresh is pressed; plain sentences if the AI is unavailable.
  const write = useCallback(async (force: boolean) => {
    if (!intel || !hasFacts) { setAi([]); return }
    const key = 'novourq:market-insights:' + new Date().toISOString().slice(0, 10) + ':' + factsKey.length
    if (!force) { try { const c = JSON.parse(localStorage.getItem(key) || 'null'); if (Array.isArray(c) && c.length) { setAi(c); return } } catch {} }
    setBusy(true)
    try {
      const r: any = await staffApi('/api/market-insights', { facts: intel.facts })
      setAi(r.insights); try { localStorage.setItem(key, JSON.stringify(r.insights)) } catch {}
    } catch { setAi(ruleInsights(intel.facts)) }
    setBusy(false)
  }, [intel, hasFacts, factsKey])
  useEffect(() => { if (intel) write(false) }, [intel, write])

  if (!allowed) return null
  const live = intel ?? { watch: [], watchTotal: 0, groups: [], featured: null, facts: EXAMPLE.facts }
  return (
    <section aria-label="Market intelligence" style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', margin: '0 2px 10px' }}>
        <div>
          <div style={{ fontSize: 12.5, letterSpacing: '.1em', textTransform: 'uppercase', color: '#34508a', fontWeight: 700 }}>Market intelligence</div>
          <div style={{ fontSize: 12, color: '#6b7fae', marginTop: 2 }}>{example ? 'Example figures for preview only. These are not your data.' : 'From your saved deals and watchlist in Invest.'}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setExample(v => !v)} aria-pressed={example} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (example ? '#2f5bd6' : '#cfdcf3'), background: example ? '#2f5bd6' : '#fff', color: example ? '#fff' : '#0f2150', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{example ? 'Showing example · Back to mine' : 'Preview example'}</button>
          <Link href="/invest" style={{ fontSize: 12.5, color: '#5470a8', fontWeight: 600, textDecoration: 'none' }}>Open Invest →</Link>
        </div>
      </div>
      {example
        ? <MarketIntelView intel={EXAMPLE} insights={EXAMPLE.insights} example />
        : <MarketIntelView intel={live} insights={ai ?? []} insightsBusy={busy || (!!intel && ai === null)} onRefresh={hasFacts ? () => write(true) : undefined} />}
    </section>
  )
}
