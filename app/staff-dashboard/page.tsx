'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { normalizeRole } from '../../lib/useRole'

const ACCENT = '#5B7CFA'

export default function StaffDashboard() {
  const [loading, setLoading] = useState(true)
  const [member, setMember] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { window.location.href = '/login'; return }

      // Same fix as useRole(): take the most recent matching row, not
      // .single(), so a duplicate team_members row can't break this.
      const { data: rows } = await supabase
        .from('team_members')
        .select('*')
        .eq('email', user.email)
        .order('created_at', { ascending: false })
        .limit(1)
      const m = rows?.[0]
      if (!m) { window.location.href = '/login'; return }
      m.role = normalizeRole(m.role)
      setMember(m)

      const businessId = m.user_id
      const propertyIds: string[] = m.property_ids ?? []
      const isMaintenance = m.role === 'Maintenance Team'
      const isCleaner = m.role === 'Cleaning Team'

      // Figure out which properties (across STR/PM/Estate) this person
      // can see, then pull the matching tickets/tasks from each module's
      // own tables. Restrict to property_ids if any are assigned;
      // otherwise show everything the business has in that module.
      const [strProps, pmProps, eaProps] = await Promise.all([
        supabase.from('properties').select('id,name').eq('user_id', businessId),
        supabase.from('pm_properties').select('id,name').eq('user_id', businessId),
        supabase.from('estate_properties').select('id,name').eq('user_id', businessId),
      ])
      const filterIds = (list: any[]) => propertyIds.length > 0 ? list.filter(p => propertyIds.includes(p.id)) : list
      const strIds = filterIds(strProps.data ?? []).map(p => p.id)
      const pmIds = filterIds(pmProps.data ?? []).map(p => p.id)
      const eaIds = filterIds(eaProps.data ?? []).map(p => p.id)
      const safe = (ids: string[]) => ids.length ? ids : ['00000000-0000-0000-0000-000000000000']

      const results: any[] = []
      if (isMaintenance) {
        const [str, pm, ea] = await Promise.all([
          supabase.from('maintenance_tickets').select('*, properties(name)').in('property_id', safe(strIds)),
          supabase.from('pm_maintenance').select('*, pm_properties(name)').in('property_id', safe(pmIds)),
          supabase.from('estate_maintenance').select('*, estate_properties(name)').in('property_id', safe(eaIds)),
        ])
        results.push(
          ...(str.data ?? []).map((t: any) => ({ id: t.id, table: 'maintenance_tickets', title: t.title ?? t.description ?? 'Maintenance issue', property: t.properties?.name, status: t.status, priority: t.priority })),
          ...(pm.data ?? []).map((t: any) => ({ id: t.id, table: 'pm_maintenance', title: t.title ?? 'Maintenance issue', property: t.pm_properties?.name, status: t.status, priority: t.priority })),
          ...(ea.data ?? []).map((t: any) => ({ id: t.id, table: 'estate_maintenance', title: t.title ?? 'Maintenance issue', property: t.estate_properties?.name, status: t.status, priority: t.priority })),
        )
      } else if (isCleaner) {
        const [str, pm, ea] = await Promise.all([
          supabase.from('cleaning_tasks').select('*, properties(name)').in('property_id', safe(strIds)),
          supabase.from('pm_cleaning_tasks').select('*, pm_properties(name)').in('property_id', safe(pmIds)),
          supabase.from('estate_cleaning_tasks').select('*, estate_properties(name)').in('property_id', safe(eaIds)),
        ])
        results.push(
          ...(str.data ?? []).map((t: any) => ({ id: t.id, table: 'cleaning_tasks', title: `Cleaning — ${t.scheduled_date ?? 'unscheduled'}`, property: t.properties?.name, status: t.status, priority: null })),
          ...(pm.data ?? []).map((t: any) => ({ id: t.id, table: 'pm_cleaning_tasks', title: `Cleaning — ${t.scheduled_date ?? 'unscheduled'}`, property: t.pm_properties?.name, status: t.status, priority: null })),
          ...(ea.data ?? []).map((t: any) => ({ id: t.id, table: 'estate_cleaning_tasks', title: `Cleaning — ${t.scheduled_date ?? 'unscheduled'}`, property: t.estate_properties?.name, status: t.status, priority: null })),
        )
      }
      setItems(results)
      setLoading(false)
    })
  }, [])

  async function updateStatus(item: any, status: string) {
    await supabase.from(item.table).update({ status }).eq('id', item.id)
    setItems(prev => prev.map(i => i === item ? { ...i, status } : i))
  }

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#98A2B3' }}>Loading...</div>

  const open = items.filter(i => i.status === 'open' || i.status === 'pending').length
  const inProgress = items.filter(i => i.status === 'in_progress').length
  const done = items.filter(i => i.status === 'completed' || i.status === 'resolved' || i.status === 'closed').length

  return (
    <div style={{ minHeight: '100vh', background: '#F7F8FA', fontFamily: "'Inter',sans-serif" }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #E4E7EC', padding: '0 28px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#98A2B3', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{member.role} Dashboard</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#101828' }}>Hi, {member.name}</div>
        </div>
        <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login' }} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #D0D5DD', background: '#fff', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', color: '#344054' }}>Sign out</button>
      </div>

      <div style={{ padding: 28, maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', padding: 20, textAlign: 'center' }}><div style={{ fontSize: 26, fontWeight: 700, color: '#F59E0B' }}>{open}</div><div style={{ fontSize: 12, color: '#667085', marginTop: 4 }}>Open</div></div>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', padding: 20, textAlign: 'center' }}><div style={{ fontSize: 26, fontWeight: 700, color: ACCENT }}>{inProgress}</div><div style={{ fontSize: 12, color: '#667085', marginTop: 4 }}>In Progress</div></div>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', padding: 20, textAlign: 'center' }}><div style={{ fontSize: 26, fontWeight: 700, color: '#10B981' }}>{done}</div><div style={{ fontSize: 12, color: '#667085', marginTop: 4 }}>Done</div></div>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #E4E7EC', fontSize: 14, fontWeight: 600, color: '#101828' }}>Your Tasks</div>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#98A2B3' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{member.role === 'Cleaning Team' ? '🧹' : '🔧'}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#101828', marginBottom: 6 }}>Nothing assigned yet</div>
              <div style={{ fontSize: 13 }}>Ask your manager to assign you properties or tasks.</div>
            </div>
          ) : items.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #F2F4F7' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#101828' }}>{item.title}</div>
                <div style={{ fontSize: 12, color: '#667085', marginTop: 2 }}>{item.property ?? '—'}{item.priority ? ` · ${item.priority} priority` : ''}</div>
              </div>
              <select value={item.status} onChange={e => updateStatus(item, e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #E4E7EC', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}>
                {member.role === 'Cleaning Team' ? (
                  <><option value="pending">Pending</option><option value="in_progress">In Progress</option><option value="completed">Completed</option></>
                ) : (
                  <><option value="open">Open</option><option value="in_progress">In Progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option></>
                )}
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
