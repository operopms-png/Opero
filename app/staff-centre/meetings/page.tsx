'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { BRAND } from '@/lib/crm-board'
import { MEETINGS_BOARD, type BoardStore } from '@/lib/marketing-boards'
import MkBoardView from '@/components/marketing/MkBoardView'
import MkPanel from '@/components/marketing/MkPanel'

// Staff Centre → Meetings: scheduling links as a CRM-style board.
// Pick a length (15/30/60 min), copy the link, send it; when they pick a time it shows as Booked.
// Plus one shareable booking page (/meeting): client requests land here as "New request".
async function api(method: string, body?: any) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch('/api/meetings', { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` }, body: body ? JSON.stringify(body) : undefined })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.error) throw new Error(data.error || 'Something went wrong')
  return data
}

function useMeetings(): BoardStore & { loading: boolean; error: string | null } {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [list, setList] = useState<any[]>([])
  const ref = useRef(list); ref.current = list

  useEffect(() => { api('GET').then(d => setList(d.meetings ?? [])).catch(e => setError(e.message)).finally(() => setLoading(false)) }, [])

  const update = useCallback(async (_k: string, id: string, patch: Record<string, any>) => {
    const prev = ref.current
    setList(l => l.map(m => m.id === id ? { ...m, ...patch } : m))
    try { await api('PATCH', { id, ...patch }) } catch (e: any) { alert(e.message); setList(prev) }
  }, [])
  const add = useCallback(async (_k: string, values: Record<string, any>) => {
    const duration = [15, 30, 60].includes(Number(values.duration_minutes)) ? Number(values.duration_minutes) : 30
    try {
      const d = await api('POST', { title: values.title ?? `${duration} min meeting`, duration_minutes: duration })
      setList(l => [d.meeting, ...l])
      return d.meeting
    } catch (e: any) { alert(e.message); return null }
  }, [])
  const remove = useCallback(async (_k: string, ids: string[]) => {
    try { await api('DELETE', { ids }); setList(l => l.filter(m => !ids.includes(m.id))) } catch (e: any) { alert(e.message) }
  }, [])
  const duplicate = useCallback(async (_k: string, ids: string[]) => {
    for (const m of ref.current.filter(x => ids.includes(x.id))) {
      try { const d = await api('POST', { title: `${m.title} (copy)`, duration_minutes: m.duration_minutes }); setList(l => [d.meeting, ...l]) } catch (e: any) { alert(e.message); return }
    }
  }, [])
  return { loading, error, rows: { meetings: list }, replies: {}, events: [], people: [], stats: {}, sendingId: null, update, add, remove, duplicate, sendEmail: async () => {} }
}

export default function MeetingsPage() {
  const store = useMeetings()
  const [open, setOpen] = useState<string | null>(null)
  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', contain: 'inline-size', fontFamily: 'Figtree, Inter, -apple-system, sans-serif', color: BRAND.ink, background: '#fff' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&display=swap');
        .crm-hover-show { opacity: 0; transition: opacity .1s }
        .crm-row:hover .crm-hover-show, .crm-colhead:hover .crm-hover-show { opacity: 1 }
        .crm-row:hover, .crm-row:hover .crm-sticky { background: ${BRAND.hover} !important }
        .crm-nav:hover { background: ${BRAND.hover} }
        .crm-tb:hover { background: ${BRAND.hover} }
      `}</style>
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {store.loading ? <div style={{ padding: 60, color: BRAND.muted, textAlign: 'center' }}>Loading meetings…</div>
          : store.error ? <div style={{ padding: 60, color: '#DF2F4A' }}>Couldn’t load meetings: {store.error}</div>
          : <MkBoardView mk={store} board={MEETINGS_BOARD} onOpen={setOpen}
              headerRight={<BookingLink />} />}
      </main>
      {open && <MkPanel key={open} mk={store} board={MEETINGS_BOARD} id={open} onClose={() => setOpen(null)} onOpenOther={(_b, id) => setOpen(id)} />}
    </div>
  )
}

// The one link to share with clients (email footer, website, WhatsApp, socials).
function BookingLink() {
  const [copied, setCopied] = useState(false)
  const url = typeof window !== 'undefined' ? `${window.location.origin}/meeting` : '/meeting'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 8 }}>
      <span style={{ fontSize: 12.5, color: BRAND.muted }}>Client booking link:</span>
      <code style={{ fontSize: 12.5, background: '#F6F7FB', border: `1px solid ${BRAND.border}`, borderRadius: 4, padding: '3px 8px', color: BRAND.ink }}>{url.replace(/^https?:\/\//, '')}</code>
      <button onClick={() => { navigator.clipboard?.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
        style={{ border: 'none', background: BRAND.goldDark, color: '#fff', borderRadius: 4, padding: '5px 12px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{copied ? 'Copied ✓' : 'Copy'}</button>
      <a href="/meeting" target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: BRAND.goldDark, textDecoration: 'none' }}>Open ↗</a>
    </div>
  )
}
