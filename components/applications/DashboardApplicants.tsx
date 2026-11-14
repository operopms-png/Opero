'use client'
// Dashboard card: new job applicants (stage Applied) with ready-made Acceptance / Decline / Interview replies.
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase, getAccountId } from '@/lib/supabase'
import { ApplicantReply } from '../marketing/MkPanel'

export default function DashboardApplicants() {
  const [rows, setRows] = useState<any[] | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const acc = await getAccountId(user)
    const { data } = await supabase.from('job_applications').select('id,candidate_name,email,role_applied,stage,created_at').eq('user_id', acc).eq('stage', 'Applied').order('created_at', { ascending: false }).limit(8)
    setRows(data ?? [])
  }
  useEffect(() => { load() }, [])
  const setStage = async (id: string, stage: string) => { await supabase.from('job_applications').update({ stage }).eq('id', id); setTimeout(load, 800) }
  return (
    <div style={{ margin: 0, minWidth: 0, background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, padding: '18px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div><div style={{ fontSize: 14.5, fontWeight: 700, color: '#16233F' }}>New applicants</div><div style={{ fontSize: 12, color: '#667085', marginTop: 2 }}>Reply with a ready-made acceptance, decline or interview message</div></div>
        <Link href="/staff-centre/applications" style={{ fontSize: 12.5, fontWeight: 600, color: '#2F6DB5', textDecoration: 'none' }}>Open Applications →</Link>
      </div>
      {rows === null ? <div style={{ padding: 14, color: '#98A2B3', fontSize: 13 }}>Loading…</div>
        : rows.length === 0 ? <div style={{ padding: 14, color: '#667085', fontSize: 13 }}>No new applicants waiting.</div>
        : rows.map(r => (
          <div key={r.id} style={{ borderBottom: '1px solid #F2F4F7', padding: '10px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 180 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{r.candidate_name || r.email}</div><div style={{ fontSize: 11.5, color: '#667085' }}>{r.role_applied}</div></div>
              <button onClick={() => setOpen(open === r.id ? null : r.id)} style={{ border: '1px solid #D0D4E4', background: '#fff', borderRadius: 7, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{open === r.id ? 'Close' : 'Reply'}</button>
            </div>
            {open === r.id && <ApplicantReply row={r} onStage={st => setStage(r.id, st)} />}
          </div>
        ))}
    </div>
  )
}
