'use client'
// Staff Centre → Portals → Cleaners & Maintenance: how many people and jobs each crew has, and a link to every portal.
import { useEffect, useState } from 'react'
import { supabase, getAccountId } from '@/lib/supabase'
import { normalizeRole } from '@/lib/useRole'

const C = { ink: '#10234d', muted: '#6b7a9f', blue: '#2f5bd6', soft: '#eaf0fd', line: '#dfe6f4' }
const TEAMS = [
  { key: 'cleaning', role: 'Cleaning Team', title: 'Cleaners', tables: ['cleaning_tasks', 'pm_cleaning_tasks', 'estate_cleaning_tasks'], props: ['properties', 'pm_properties', 'estate_properties'] },
  { key: 'maintenance', role: 'Maintenance Team', title: 'Maintenance', tables: ['maintenance_tickets', 'pm_maintenance', 'estate_maintenance'], props: ['properties', 'pm_properties', 'estate_properties'] },
]
const DONE = ['completed', 'resolved', 'closed']
const ymd = (d: Date) => d.toISOString().slice(0, 10)

export default function CrewPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any[]>([])

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const biz = await getAccountId(user)
      const { data: team } = await supabase.from('team_members').select('id,name,email,phone,role,property_ids').eq('user_id', biz)
      const today = ymd(new Date())
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
      const out: any[] = []
      for (const t of TEAMS) {
        const people = (team ?? []).filter((m: any) => normalizeRole(m.role) === t.role)
        const { data: shifts } = people.length ? await supabase.from('staff_shifts').select('staff_id,type').in('staff_id', people.map((p: any) => p.id)).eq('date', today) : { data: [] as any[] }
        const jobs: any[] = []
        for (let i = 0; i < 3; i++) {
          const { data: props } = await supabase.from(t.props[i]).select('id,name').eq('user_id', biz).is('ended_at', null)
          const ids = (props ?? []).map((p: any) => p.id)
          if (!ids.length) continue
          const { data: rows } = await supabase.from(t.tables[i]).select('*').in('property_id', ids)
          const nm = new Map((props ?? []).map((p: any) => [p.id, p.name]))
          ;(rows ?? []).forEach((r: any) => jobs.push({ ...r, _prop: nm.get(r.property_id) }))
        }
        const open = jobs.filter(j => !DONE.includes(j.status) && j.status !== 'in_progress' && j.status !== 'skipped')
        const prog = jobs.filter(j => j.status === 'in_progress')
        const done = jobs.filter(j => DONE.includes(j.status))
        const doneWeek = done.filter(j => (j.completed_at || j.resolved_at || '') >= weekAgo)
        const cost = t.key === 'maintenance' ? jobs.filter(j => (j.resolved_at || '') >= monthStart.toISOString()).reduce((s, j) => s + (Number(j.cost) || 0), 0) : null
        const per = people.map((p: any) => {
          const mine = jobs.filter(j => j.assigned_to === p.id)
          return { ...p, working: (shifts ?? []).some((s: any) => s.staff_id === p.id && s.type === 'Working'), open: mine.filter(j => !DONE.includes(j.status)).length, done: mine.filter(j => DONE.includes(j.status)).length }
        })
        const recent = jobs.filter(j => !DONE.includes(j.status)).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 6)
        out.push({ ...t, people: per, open: open.length, prog: prog.length, done: done.length, doneWeek: doneWeek.length, unassigned: jobs.filter(j => !DONE.includes(j.status) && !j.assigned_to).length, cost, recent })
      }
      setData(out); setLoading(false)
    })()
  }, [])

  const card: React.CSSProperties = { background: '#fff', border: `1px solid ${C.line}`, borderRadius: 14, padding: 18 }
  const stat = (n: any, l: string) => <div style={{ ...card, padding: 14, textAlign: 'center' }}><div style={{ fontSize: 24, fontWeight: 700, color: C.ink }}>{n}</div><div style={{ fontSize: 12, color: C.muted }}>{l}</div></div>
  if (loading) return <div style={{ padding: 40, color: C.muted }}>Loading…</div>
  return (
    <div style={{ padding: '28px 30px 40px', maxWidth: 1000 }}>
      <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: C.ink }}>Cleaners and Maintenance</h1>
      <p style={{ margin: '6px 0 20px', fontSize: 14, color: C.muted }}>Who is on each team, what they have open and what is done. Open any person to see their portal exactly as they do.</p>
      {data.map(t => (
        <div key={t.key} style={{ marginBottom: 30 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 10, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: 18, color: C.ink }}>{t.title} <span style={{ fontWeight: 500, color: C.muted, fontSize: 14 }}>· {t.people.length} {t.people.length === 1 ? 'person' : 'people'}</span></h2>
            <a href={`/staff-dashboard?team=${t.key}`} style={{ fontSize: 13, fontWeight: 600, color: C.blue, textDecoration: 'none' }}>Open {t.title.toLowerCase()} portal →</a>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10, marginBottom: 12 }}>
            {stat(t.people.filter((p: any) => p.working).length, 'On shift today')}{stat(t.open, 'Open')}{stat(t.prog, 'In progress')}{stat(t.doneWeek, 'Done this week')}{stat(t.unassigned, 'Not assigned')}
            {t.cost !== null && stat(Math.round(t.cost).toLocaleString(), 'Repair cost this month')}
          </div>
          <div style={card}>
            {t.people.length === 0 ? <div style={{ color: C.muted, fontSize: 14 }}>Nobody on this team yet. Add them in Settings, Team Management with the {t.role} role.</div> : t.people.map((p: any, i: number) => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '11px 0', borderTop: i ? `1px solid ${C.line}` : 'none', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{p.name} <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: p.working ? '#ECFDF5' : '#F2F4F7', color: p.working ? '#047857' : '#667085', marginLeft: 6 }}>{p.working ? 'On shift' : 'Off'}</span></div>
                  <div style={{ fontSize: 12, color: C.muted }}>{p.email}{p.phone ? ` · ${p.phone}` : ''}{p.property_ids?.length ? ` · ${p.property_ids.length} properties` : ' · all properties'}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 13, color: C.muted }}>
                  <span>{p.open} open · {p.done} done</span>
                  <a href={`/staff-dashboard?team=${t.key}&staff_id=${p.id}`} style={{ fontWeight: 600, color: C.blue, textDecoration: 'none' }}>View portal →</a>
                </div>
              </div>
            ))}
          </div>
          {t.recent.length > 0 && <div style={{ ...card, marginTop: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 6 }}>Latest open jobs</div>
            {t.recent.map((j: any) => <div key={j.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '7px 0', fontSize: 13, borderTop: `1px solid ${C.line}` }}><span>{j.title || `Clean ${j.scheduled_date ?? ''}`} <span style={{ color: C.muted }}>· {j._prop}</span></span><span style={{ color: C.muted }}>{String(j.status).replace('_', ' ')}{j.source === 'cleaner' ? ' · from cleaner' : ''}</span></div>)}
          </div>}
        </div>
      ))}
    </div>
  )
}
