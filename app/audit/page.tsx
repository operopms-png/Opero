'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function AuditPage() {
    const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const [{ data: bookings }, { data: cleaning }, { data: maintenance }, { data: properties }] = await Promise.all([
        supabase.from('bookings').select('*, properties(name)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
        supabase.from('cleaning_tasks').select('*, properties(name)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
        supabase.from('maintenance_tickets').select('*, properties(name)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
        supabase.from('properties').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
      ])
      const entries: any[] = []
      bookings?.forEach(b => entries.push({ type: 'booking', action: 'Booking created', detail: `${b.guest_name ?? 'Guest'} — ${b.properties?.name}`, date: b.created_at }))
      cleaning?.forEach(t => entries.push({ type: 'cleaning', action: 'Cleaning task created', detail: `${t.properties?.name} — ${t.assigned_to ?? 'Unassigned'}`, date: t.created_at }))
      maintenance?.forEach(t => entries.push({ type: 'maintenance', action: 'Maintenance ticket', detail: `${t.title} — ${t.properties?.name}`, date: t.created_at }))
      properties?.forEach(p => entries.push({ type: 'property', action: 'Property added', detail: p.name, date: p.created_at }))
      entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setLogs(entries.slice(0, 50))
      setLoading(false)
    }
    load()
  }, [])

  const TYPE_COLOR: Record<string, string> = { booking: '#3B4AFF', cleaning: '#10B981', maintenance: '#F59E0B', property: '#8B5CF6' }

  return (
    <div style={{ minHeight: '100vh', background: '#F7F8FA', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #E4E7EC', padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', gap: 10 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#344054" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: '#101828' }}>Audit Log</h1>
        <span style={{ background: '#F3F4F6', color: '#6B7280', borderRadius: 20, padding: '2px 10px', fontSize: 13 }}>{logs.length}</span>
      </div>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px' }}>
        {loading ? <div style={{ textAlign: 'center', padding: 80, color: '#98A2B3' }}>Loading...</div> :
        logs.length === 0 ? <div style={{ textAlign: 'center', padding: 80, color: '#98A2B3', fontSize: 14 }}>No activity yet</div> : (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E4E7EC', overflow: 'hidden' }}>
            {logs.map((log, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', borderBottom: i < logs.length - 1 ? '1px solid #F2F4F7' : 'none' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: TYPE_COLOR[log.type] ?? '#98A2B3', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#101828' }}>{log.action}</div>
                  <div style={{ fontSize: 12, color: '#667085', marginTop: 2 }}>{log.detail}</div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: TYPE_COLOR[log.type] + '20', color: TYPE_COLOR[log.type], textTransform: 'capitalize' }}>{log.type}</div>
                <div style={{ fontSize: 12, color: '#98A2B3', whiteSpace: 'nowrap' }}>{new Date(log.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
