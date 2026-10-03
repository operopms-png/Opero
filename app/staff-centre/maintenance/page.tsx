'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, getAccountId } from '@/lib/supabase'
import { BRAND } from '@/lib/crm-board'
import { MAINTENANCE_BOARD } from '@/lib/hr-boards'
import type { BoardStore } from '@/lib/marketing-boards'
import MkBoardView from '@/components/marketing/MkBoardView'
import MkPanel from '@/components/marketing/MkPanel'

// Staff Centre → Maintenance Board: all maintenance jobs from the three modules on one CRM-style board.
const TABLE: Record<string, string> = { str: 'maintenance_tickets', pm: 'pm_maintenance', estate: 'estate_maintenance' }
const EDITABLE = ['priority', 'status', 'description', 'title']

function useMaintenance(): BoardStore & { loading: boolean; error: string | null } {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [list, setList] = useState<any[]>([])
  const ref = useRef(list); ref.current = list

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const acc = await getAccountId(user)
      const [pm, ea, props] = await Promise.all([
        supabase.from('pm_maintenance').select('*,pm_properties(name)').eq('user_id', acc),
        supabase.from('estate_maintenance').select('*,estate_properties(name)').eq('user_id', acc),
        // maintenance_tickets has no user_id: scope it through the business's own properties
        supabase.from('properties').select('id').eq('user_id', acc),
      ])
      if (pm.error || ea.error) { setError((pm.error ?? ea.error)!.message); setLoading(false); return }
      const ids = (props.data ?? []).map((p: any) => p.id)
      const { data: team } = await supabase.from('team_members').select('id,name').eq('user_id', acc)
      const who = (v: any) => (team ?? []).find((t: any) => t.id === v)?.name ?? (typeof v === 'string' && !/^[0-9a-f-]{36}$/i.test(v) ? v : '')
      const str = ids.length ? await supabase.from('maintenance_tickets').select('*,properties(name)').in('property_id', ids) : { data: [] as any[] }
      const all = [
        ...(pm.data ?? []).map((m: any) => ({ ...m, _id: m.id, id: 'pm:' + m.id, module: 'pm', propertyName: m.pm_properties?.name, assignee: who(m.assigned_to) })),
        ...(ea.data ?? []).map((m: any) => ({ ...m, _id: m.id, id: 'estate:' + m.id, module: 'estate', propertyName: m.estate_properties?.name, assignee: who(m.assigned_to) })),
        ...((str.data ?? []) as any[]).map((m: any) => ({ ...m, _id: m.id, id: 'str:' + m.id, module: 'str', propertyName: m.properties?.name, title: m.title || m.issue_type || m.category || 'Maintenance issue', assignee: who(m.assigned_to) })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setList(all); setLoading(false)
    })()
  }, [])

  const update = useCallback(async (_k: string, id: string, patch: Record<string, any>) => {
    const row = ref.current.find(r => r.id === id); if (!row) return
    const clean = Object.fromEntries(Object.entries(patch).filter(([k]) => EDITABLE.includes(k)))
    if (!Object.keys(clean).length) return
    const prev = ref.current
    setList(l => l.map(r => r.id === id ? { ...r, ...clean } : r))
    const { error } = await supabase.from(TABLE[row.module]).update(clean).eq('id', row._id)
    if (error) { alert(error.message); setList(prev) }
  }, [])
  const remove = useCallback(async (_k: string, ids: string[]) => {
    for (const id of ids) {
      const row = ref.current.find(r => r.id === id); if (!row) continue
      const { error } = await supabase.from(TABLE[row.module]).delete().eq('id', row._id)
      if (error) { alert(error.message); return }
    }
    setList(l => l.filter(r => !ids.includes(r.id)))
  }, [])
  return { loading, error, rows: { maintenance: list }, replies: {}, events: [], people: [], stats: {}, sendingId: null, update, add: async () => null, remove, duplicate: async () => {}, sendEmail: async () => {} }
}

export default function MaintenanceBoardPage() {
  const store = useMaintenance()
  const [open, setOpen] = useState<string | null>(null)
  const openJobs = store.rows.maintenance.filter(r => r.status !== 'resolved' && r.status !== 'closed')
  const urgent = openJobs.filter(r => r.priority === 'urgent').length
  return (
    <div style={{ display: 'flex', height: 'calc(100vh - var(--hub-h, 0px))', width: '100%', contain: 'inline-size', fontFamily: 'Figtree, Inter, -apple-system, sans-serif', color: BRAND.ink, background: '#fff' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&display=swap');
        .crm-hover-show { opacity: 0; transition: opacity .1s }
        .crm-row:hover .crm-hover-show, .crm-colhead:hover .crm-hover-show { opacity: 1 }
        .crm-row:hover, .crm-row:hover .crm-sticky { background: ${BRAND.hover} !important }
        .crm-nav:hover { background: ${BRAND.hover} }
        .crm-tb:hover { background: ${BRAND.hover} }
      `}</style>
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {store.loading ? <div style={{ padding: 60, color: BRAND.muted, textAlign: 'center' }}>Loading maintenance…</div>
          : store.error ? <div style={{ padding: 60, color: '#DF2F4A' }}>Couldn’t load maintenance: {store.error}</div>
          : <MkBoardView mk={store} board={MAINTENANCE_BOARD} onOpen={setOpen}
              headerRight={<span style={{ display: 'inline-flex', gap: 8, marginRight: 8 }}>
                <span style={{ background: '#579BFC', color: '#fff', borderRadius: 3, padding: '3px 10px', fontSize: 12.5 }}>{openJobs.length} open</span>
                <span style={{ background: urgent ? '#DF2F4A' : '#C4C4C4', color: '#fff', borderRadius: 3, padding: '3px 10px', fontSize: 12.5 }}>{urgent} urgent</span>
              </span>} />}
      </main>
      {open && <MkPanel key={open} mk={store} board={MAINTENANCE_BOARD} id={open} onClose={() => setOpen(null)} onOpenOther={(_b, id) => setOpen(id)} />}
    </div>
  )
}
