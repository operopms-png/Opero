'use client'
// Dashboard box: Road to 100 properties. Signed homes against the goal, the pace needed to hit the date and the owner funnel.
// Progress comes from Landlord Leads (Signed) plus the starting number; targets are edited here.
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { staffApi } from '@/lib/staff-api'
import type { Road } from '@/lib/road-to-100'

const STATE = { done: ['Goal reached', '#138a62'], ahead: ['Ahead of pace', '#138a62'], on: ['On pace', '#138a62'], behind: ['Behind pace', '#C0392B'], nodate: ['Set a date', '#98A2B3'] } as const
const FUNNEL: [keyof Road['funnel'], string][] = [['new', 'New'], ['contacted', 'Contacted'], ['valuation', 'Valuation sent'], ['meeting', 'Meeting booked'], ['signed', 'Signed']]
const inp: React.CSSProperties = { border: '1px solid #D0D5DD', borderRadius: 8, padding: '7px 9px', fontSize: 13, minWidth: 0 }
const dt = (d: string | null) => d ? new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : 'no date'

export default function DashboardRoad() {
  const [r, setR] = useState<Road | null>(null)
  const [fail, setFail] = useState(false)
  const [edit, setEdit] = useState(false)
  const [f, setF] = useState({ target: '', deadline: '', baseline: '' })
  const [err, setErr] = useState('')
  useEffect(() => {
    const load = () => staffApi('/api/road-to-100').then((x: any) => setR(x)).catch(() => setFail(true))
    load()
    const t = setInterval(load, 60000) // stays in step without a reload
    const vis = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', vis)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', vis) }
  }, [])
  if (fail) return null
  if (!r) return <div style={{ margin: '0 30px 16px', color: '#98A2B3', fontSize: 13 }}>Loading…</div>
  const [word, col] = STATE[r.state]
  const max = Math.max(1, ...FUNNEL.map(([k]) => r.funnel[k]))
  const open = () => { setF({ target: String(r.goal.target), deadline: r.goal.deadline || '', baseline: String(r.goal.baseline) }); setErr(''); setEdit(true) }
  const save = async () => { try { setR(await staffApi('/api/road-to-100', { target: f.target, deadline: f.deadline, baseline: f.baseline })); setEdit(false) } catch (e: any) { setErr(e.message) } }
  return (
    <div style={{ margin: '0 30px 16px', background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, padding: '18px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'baseline' }}>
        <div><div style={{ fontSize: 14.5, fontWeight: 700, color: '#16233F' }}>{r.goal.title.replace(/100/, String(r.goal.target))}</div><div style={{ fontSize: 12, color: '#667085', marginTop: 2 }}>Goal: {r.goal.target} properties by {dt(r.goal.deadline)}</div></div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', fontSize: 12.5, fontWeight: 600 }}>
          <span style={{ color: col }}>{word}</span>
          <button onClick={() => (edit ? setEdit(false) : open())} style={{ border: 0, background: 'none', color: '#2F6DB5', cursor: 'pointer', fontWeight: 600, fontSize: 12.5, padding: 0 }}>{edit ? 'Cancel' : 'Edit goal'}</button>
          <Link href="/staff-centre/landlord-leads" style={{ color: '#2F6DB5', textDecoration: 'none' }}>Landlord Leads →</Link>
        </div>
      </div>
      {edit && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end', margin: '12px 0', background: '#F6F8FB', borderRadius: 10, padding: 10 }}>
          <label style={{ fontSize: 11.5, color: '#667085' }}>Target<br /><input style={{ ...inp, width: 90 }} inputMode="numeric" value={f.target} onChange={e => setF({ ...f, target: e.target.value })} /></label>
          <label style={{ fontSize: 11.5, color: '#667085' }}>By<br /><input style={inp} type="date" value={f.deadline} onChange={e => setF({ ...f, deadline: e.target.value })} /></label>
          <label style={{ fontSize: 11.5, color: '#667085' }}>Extra homes outside the portal<br /><input style={{ ...inp, width: 90 }} inputMode="numeric" value={f.baseline} onChange={e => setF({ ...f, baseline: e.target.value })} /></label>
          <button onClick={save} style={{ background: '#1B2F6E', color: '#fff', border: 0, borderRadius: 8, padding: '8px 14px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Save</button>
          {err && <span style={{ color: '#B42318', fontSize: 12.5 }}>{err}</span>}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '14px 0 6px' }}>
        <span style={{ fontSize: 34, fontWeight: 700, color: '#16233F' }}>{r.current}</span><span style={{ fontSize: 14, color: '#667085' }}>of {r.goal.target} properties · {r.pct}%</span>
      </div>
      <div style={{ height: 10, background: '#E8EDF5', borderRadius: 10, overflow: 'hidden' }}><div style={{ width: `${r.pct}%`, height: '100%', background: '#1B2F6E', borderRadius: 10 }} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, marginTop: 14 }}>
        {[
          ['Still to sign', String(r.remaining)],
          ['Needed each month', r.neededPerMonth == null ? '—' : String(r.neededPerMonth)],
          ['Signed, last 30 days', String(r.signedLast30)],
          ['Owner enquiries, last 30 days', String(r.enquiries30)],
        ].map(([k, v]) => <div key={k} style={{ background: '#F6F8FB', borderRadius: 8, padding: '9px 11px' }}><div style={{ fontSize: 19, fontWeight: 700, color: '#16233F' }}>{v}</div><div style={{ fontSize: 11.5, color: '#667085' }}>{k}</div></div>)}
      </div>
      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {FUNNEL.map(([k, label]) => (
          <div key={k} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 34px', gap: 8, alignItems: 'center', fontSize: 12.5 }}>
            <span style={{ color: '#475467' }}>{label}</span>
            <div style={{ height: 8, background: '#F0F2F6', borderRadius: 8 }}><div style={{ width: `${(r.funnel[k] / max) * 100}%`, height: '100%', background: k === 'signed' ? '#138a62' : '#2F6DB5', borderRadius: 8 }} /></div>
            <b style={{ color: '#16233F', textAlign: 'right' }}>{r.funnel[k]}</b>
          </div>
        ))}
        <div style={{ fontSize: 11.5, color: '#98A2B3' }}>{r.funnel.lost} marked lost. {r.managed} homes are in Property Management and Estate Agency, {r.pipeline} properties are open in Client Properties. Progress adds those homes, any extra homes you enter, leads marked Signed in Landlord Leads and Client Properties in the Signed stage.</div>
      </div>
    </div>
  )
}
