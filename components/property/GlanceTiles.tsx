'use client'
// At a glance: a few headline numbers for each area (short stays, lettings, estate agency, developments),
// shown under the Real Estate Intelligence page. Read only; every figure comes from records already in the
// platform and each tile opens the page it comes from.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase, getAccountId } from '@/lib/supabase'

type Tone = 'good' | 'warn' | 'bad' | 'plain'
type Tile = { label: string; value: string; note: string; tone: Tone; href: string; trend?: number[]; progress?: number }
type Area = { key: 'str' | 'pm' | 'ea' | 'dev'; title: string; tiles: Tile[] }

const C = { ink: '#10234d', muted: '#6b7a9f', line: '#e4e9f4', blue: '#2F6DB5', soft: '#BFDDF7' }
const TONE: Record<Tone, string> = { good: '#067647', warn: '#B54708', bad: '#B42318', plain: '#667085' }
const day = (d = 0) => { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10) }
const monthStart = (back = 0) => { const x = new Date(); x.setDate(1); x.setMonth(x.getMonth() - back); return x.toISOString().slice(0, 10) }
const money = (n: number, s = '£') => `${s}${Math.round(n).toLocaleString('en-GB')}`
const closed = (s: unknown) => /done|complete|closed|resolved|cancel|void/i.test(String(s ?? ''))
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`

async function load(): Promise<Area[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const biz = await getAccountId(user)
  const q = (t: string, cols = '*') => supabase.from(t).select(cols).eq('user_id', biz).limit(5000)
  const today = day(), in7 = day(7), in30 = day(30), in14 = day(14)

  const [pay, maint, units, props, strProps, estProps, view, vac, estMaint, proj, mile, snag, devUnits, rev] = await Promise.all([
    q('pm_rent_payments', 'amount,due_date,paid_date,status'),
    q('pm_maintenance', 'status'),
    q('pm_units', 'status,tenant_id'),
    q('pm_properties', 'id'),
    q('properties', 'id'),
    q('estate_properties', 'listed,show_on_website,status'),
    q('estate_viewings', 'scheduled_at,status'),
    q('estate_vacancies', '*'),
    q('estate_maintenance', 'status'),
    q('dev_projects', 'total_budget,spent,status'),
    q('dev_milestones', 'due_date,status'),
    q('dev_snagging', 'status'),
    q('dev_units', 'status'),
    q('str_reviews', 'rating'),
  ])
  const ids = (strProps.data ?? []).map((p: any) => p.id)
  const bk = ids.length ? (await supabase.from('bookings').select('check_in,check_out,status,total_amount').in('property_id', ids).gte('check_out', monthStart(5)).limit(5000)).data ?? [] : []
  const live = (bk as any[]).filter(b => !/cancel/i.test(String(b.status ?? '')))

  // Short stays
  const nights = (a: string, b: string, from: string, to: string) => Math.max(0, (new Date(Math.min(+new Date(b), +new Date(to))).getTime() - new Date(Math.max(+new Date(a), +new Date(from))).getTime()) / 86400000)
  const booked = live.reduce((s, b) => s + nights(b.check_in, b.check_out, today, in30), 0)
  const occ = ids.length ? Math.round(booked / (ids.length * 30) * 100) : 0
  const revBy = (m: number) => live.filter(b => String(b.check_in).slice(0, 7) === monthStart(m).slice(0, 7)).reduce((s, b) => s + Number(b.total_amount || 0), 0)
  const revSeries = [5, 4, 3, 2, 1, 0].map(revBy)
  const ci = live.filter(b => b.check_in >= today && b.check_in <= in7)
  const ciToday = ci.filter(b => b.check_in === today).length
  const ratings = (rev.data ?? []).map((r: any) => Number(r.rating)).filter(n => n > 0)
  const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0
  const lastTwo = revSeries[4] ? Math.round((revSeries[5] - revSeries[4]) / revSeries[4] * 100) : null

  // Lettings
  const thisM = ((pay.data ?? []) as any[]).filter(p => String(p.due_date).slice(0, 7) === today.slice(0, 7))
  const paidAmt = (p: any) => (p.paid_date || /paid/i.test(String(p.status))) ? Number(p.amount || 0) : 0
  const dueM = thisM.reduce((s, p) => s + Number(p.amount || 0), 0)
  const gotM = thisM.reduce((s, p) => s + paidAmt(p), 0)
  const late = ((pay.data ?? []) as any[]).filter(p => !p.paid_date && !/paid|cancel|void/i.test(String(p.status)) && p.due_date && p.due_date < today)
  const lateAmt = late.reduce((s, p) => s + Number(p.amount || 0), 0)
  const collectedBy = (m: number) => ((pay.data ?? []) as any[]).filter(p => String(p.due_date).slice(0, 7) === monthStart(m).slice(0, 7)).reduce((s, p) => s + paidAmt(p), 0)
  const empty = ((units.data ?? []) as any[]).filter(u => !u.tenant_id || /vacant|empty|available/i.test(String(u.status))).length
  const openRepairs = ((maint.data ?? []) as any[]).filter(m => !closed(m.status)).length

  // Estate agency
  const listed = ((estProps.data ?? []) as any[]).filter(p => p.listed || p.show_on_website).length
  const weekView = ((view.data ?? []) as any[]).filter(v => v.scheduled_at && String(v.scheduled_at).slice(0, 10) >= today && String(v.scheduled_at).slice(0, 10) <= in7 && !/cancel/i.test(String(v.status ?? ''))).length
  const estVacant = ((vac.data ?? []) as any[]).filter(v => !closed((v as any).status)).length
  const estRepairs = ((estMaint.data ?? []) as any[]).filter(m => !closed(m.status)).length

  // Developments
  const budget = ((proj.data ?? []) as any[]).reduce((s, p) => s + Number(p.total_budget || 0), 0)
  const spent = ((proj.data ?? []) as any[]).reduce((s, p) => s + Number(p.spent || 0), 0)
  const openMs = ((mile.data ?? []) as any[]).filter(m => !closed(m.status))
  const dueMs = openMs.filter(m => m.due_date && m.due_date <= in14)
  const overdueMs = openMs.filter(m => m.due_date && m.due_date < today).length
  const snagsOpen = ((snag.data ?? []) as any[]).filter(s => !closed(s.status)).length
  const du = (devUnits.data ?? []) as any[]
  const sold = du.filter(u => /sold|complet/i.test(String(u.status))).length
  const reserved = du.filter(u => /reserv|exchang/i.test(String(u.status))).length

  const areas: Area[] = [
    { key: 'str', title: 'Short term rentals', tiles: [
      { label: 'Occupancy, next 30 days', value: `${occ}%`, note: plural(ids.length, 'property'), tone: 'plain', href: '/str?tab=Analytics', progress: occ },
      { label: 'Revenue this month', value: money(revSeries[5]), note: lastTwo == null ? 'Last 6 months' : `${lastTwo >= 0 ? '▲' : '▼'} ${Math.abs(lastTwo)}% on last month`, tone: lastTwo == null ? 'plain' : lastTwo >= 0 ? 'good' : 'bad', href: '/str?tab=Bookings', trend: revSeries },
      { label: 'Check-ins, next 7 days', value: String(ci.length), note: `${ciToday} today`, tone: 'plain', href: '/str?tab=Bookings' },
      { label: 'Guest rating', value: avg ? avg.toFixed(1) : '—', note: ratings.length ? plural(ratings.length, 'review') : 'No reviews yet', tone: 'plain', href: '/str?tab=Home' },
    ] },
    { key: 'pm', title: 'Lettings', tiles: [
      { label: 'Rent collected this month', value: dueM ? `${Math.round(gotM / dueM * 100)}%` : '—', note: dueM ? `${money(gotM)} of ${money(dueM)}` : 'Nothing due', tone: dueM && gotM / dueM < 0.8 ? 'warn' : 'good', href: '/pm?tab=Rent', trend: [5, 4, 3, 2, 1, 0].map(collectedBy) },
      { label: 'Arrears', value: money(lateAmt), note: late.length ? plural(late.length, 'overdue payment') : 'None overdue', tone: late.length ? 'bad' : 'good', href: '/staff-centre/finance/arrears' },
      { label: 'Empty units', value: String(empty), note: `${plural((props.data ?? []).length, 'property')} in total`, tone: empty ? 'warn' : 'good', href: '/pm?tab=Vacancies' },
      { label: 'Open repairs', value: String(openRepairs), note: 'Not yet completed', tone: openRepairs > 10 ? 'warn' : 'plain', href: '/pm?tab=Maintenance' },
    ] },
    { key: 'ea', title: 'Estate agency', tiles: [
      { label: 'Live listings', value: String(listed), note: 'Showing on your website', tone: 'plain', href: '/estate?section=Properties' },
      { label: 'Viewings, next 7 days', value: String(weekView), note: 'Not cancelled', tone: 'plain', href: '/estate?section=Viewings' },
      { label: 'Vacancies', value: String(estVacant), note: 'Open vacancies', tone: estVacant ? 'warn' : 'good', href: '/estate?section=Vacancies' },
      { label: 'Open repairs', value: String(estRepairs), note: 'Not yet completed', tone: estRepairs > 10 ? 'warn' : 'plain', href: '/estate?section=Maintenance' },
    ] },
    { key: 'dev', title: 'Developments', tiles: [
      { label: 'Budget spent', value: budget ? `${Math.round(spent / budget * 100)}%` : '—', note: budget ? `${money(spent)} of ${money(budget)}` : 'No budget set', tone: budget && spent / budget > 1 ? 'bad' : 'plain', href: '/dev?tab=Budget', progress: budget ? Math.min(100, spent / budget * 100) : undefined },
      { label: 'Milestones due, 14 days', value: String(dueMs.length), note: overdueMs ? `${overdueMs} overdue` : 'None overdue', tone: overdueMs ? 'bad' : 'plain', href: '/dev?tab=Milestones' },
      { label: 'Snags open', value: String(snagsOpen), note: 'Not yet resolved', tone: snagsOpen ? 'warn' : 'good', href: '/dev?tab=Projects' },
      { label: 'Units sold', value: du.length ? `${sold} of ${du.length}` : '—', note: reserved ? `${reserved} reserved` : 'None reserved', tone: 'plain', href: '/dev?tab=Units', progress: du.length ? sold / du.length * 100 : undefined },
    ] },
  ]
  return areas
}

function Spark({ v }: { v: number[] }) {
  const max = Math.max(...v, 1)
  const pts = v.map((n, i) => `${(i / (v.length - 1)) * 200},${32 - (n / max) * 28}`).join(' ')
  return <svg width="100%" height="34" viewBox="0 0 200 34" preserveAspectRatio="none" aria-hidden="true"><polyline fill="none" stroke={C.blue} strokeWidth="2.5" points={pts} /></svg>
}
function Bar({ pct }: { pct: number }) {
  return <svg width="100%" height="34" viewBox="0 0 200 34" preserveAspectRatio="none" aria-hidden="true"><rect y="12" width="200" height="10" rx="5" fill="#E4E7EC" /><rect y="12" width={Math.max(0, Math.min(100, pct)) * 2} height="10" rx="5" fill={C.blue} /></svg>
}

export default function GlanceTiles({ show }: { show: { str: boolean; pm: boolean; ea: boolean; dev: boolean } }) {
  const [areas, setAreas] = useState<Area[] | null>(null)
  useEffect(() => { load().then(setAreas).catch(() => setAreas([])) }, [])
  if (!areas) return null
  const shown = areas.filter(a => show[a.key])
  if (!shown.length) return null
  return (
    <div style={{ marginTop: 28 }}>
      <h2 style={{ margin: 0, fontSize: 21, color: C.ink }}>At a glance</h2>
      <p style={{ margin: '3px 0 4px', fontSize: 14, color: C.muted }}>Where each area stands today. Open any tile for the detail.</p>
      {shown.map(a => (
        <div key={a.key}>
          <h3 style={{ margin: '18px 0 8px', fontSize: 15, color: '#1D4E89' }}>{a.title}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 12 }}>
            {a.tiles.map(t => (
              <Link key={t.label} href={t.href} style={{ textDecoration: 'none', background: '#fff', border: `1px solid ${C.line}`, borderRadius: 12, padding: '12px 14px', display: 'block' }}>
                <div style={{ fontSize: 11, color: '#667085', textTransform: 'uppercase', letterSpacing: '.04em' }}>{t.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#1D4E89', margin: '3px 0 1px' }}>{t.value}</div>
                <div style={{ fontSize: 12, color: TONE[t.tone] }}>{t.note}</div>
                {t.trend && t.trend.some(n => n > 0) ? <Spark v={t.trend} /> : t.progress != null ? <Bar pct={t.progress} /> : <div style={{ height: 34 }} />}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
