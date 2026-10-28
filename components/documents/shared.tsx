'use client'
// Pieces shared by the Documents pages.
import React, { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { C, input } from '../crm/Page'
import { staffApi } from '../../lib/staff-api'

export const DOC_STATUS: Record<string, { l: string; bg: string; c: string }> = {
  draft: { l: 'Draft', bg: '#F2F2F2', c: '#5C5850' }, pending_approval: { l: 'Awaiting approval', bg: '#FFF4E0', c: '#A15C00' }, rejected: { l: 'Changes rejected', bg: '#FDECEC', c: '#B42318' },
  sent: { l: 'Sent', bg: '#FBF6EA', c: '#89CFF0' }, opened: { l: 'Opened', bg: '#EAF2FC', c: '#2F6DB5' }, signed: { l: 'Signed', bg: '#E6F7EF', c: '#0E7C55' }, void: { l: 'Cancelled', bg: '#F2F2F2', c: '#8A877F' },
}

export const KIND_LABEL: Record<string, string> = { pm_tenant: 'Tenant', ea_tenant: 'Tenant', pm_owner: 'Owner', ea_owner: 'Owner', client: 'Owner', partner: 'Partner', guest: 'Guest', crm: 'Contact' }

export async function downloadDocPdf(id: string, name: string) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`/api/documents?id=${id}&pdf=1`, { headers: { Authorization: `Bearer ${session?.access_token ?? ''}` } })
  if (!res.ok) { alert('Could not make the PDF'); return }
  const url = URL.createObjectURL(await res.blob()); const a = document.createElement('a'); a.href = url; a.download = name + '.pdf'; a.click(); URL.revokeObjectURL(url)
}

export function PersonSearch({ onPick, placeholder }: { onPick: (p: any) => void; placeholder?: string }) {
  const [q, setQ] = useState(''), [res, setRes] = useState<any[]>([]), [open, setOpen] = useState(false)
  const search = useCallback(async (t: string) => { if (t.trim().length < 2) { setRes([]); return } try { const r = await staffApi('/api/documents?people=' + encodeURIComponent(t)); setRes(r.people) } catch { setRes([]) } }, [])
  useEffect(() => { const h = setTimeout(() => search(q), 250); return () => clearTimeout(h) }, [q, search])
  return (
    <div style={{ position: 'relative' }}>
      <input style={input} value={q} onChange={e => { setQ(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)} placeholder={placeholder || 'Search a tenant, guest, owner, partner or contact'} />
      {open && res.length > 0 && <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 30, background: '#fff', border: '1px solid ' + C.border, borderRadius: 6, boxShadow: '0 8px 24px rgba(0,0,0,.12)', maxHeight: 260, overflowY: 'auto', marginTop: 4 }}>
        {res.map((p, i) => <button key={i} type="button" onClick={() => { onPick(p); setQ(''); setRes([]); setOpen(false) }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', border: 'none', borderBottom: '1px solid #F2F2F2', background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: C.ink }}>{p.name}</div><div style={{ fontSize: 11.5, color: C.muted }}>{[p.label, p.sub, p.email].filter(Boolean).join(' · ')}</div></button>)}
      </div>}
    </div>
  )
}
