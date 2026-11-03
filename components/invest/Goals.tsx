'use client'
// Deal Analyser -> Goals: set a portfolio target in plain words and see progress, pipeline and pace.
import { useEffect, useState } from 'react'
import { staffApi } from '@/lib/staff-api'

type P = { current: number; target: number; remaining: number; pct: number; weeksLeft: number | null; pipeline: Record<string, number>; expected: number; recentPerWeek: number; neededPerWeek: number | null; state: 'done' | 'on_track' | 'behind' | 'open'; unit: string }
type G = { id: string; text: string; target: { location: string; deadline: string | null; metric: string }; status: string; last_report: string | null; last_review: string | null; progress: P }
const STATE: Record<string, { label: string; bg: string; fg: string }> = {
  done: { label: 'Reached', bg: '#E3F5EC', fg: '#0E7C55' }, on_track: { label: 'On pace', bg: '#E3F5EC', fg: '#0E7C55' },
  behind: { label: 'Behind pace', bg: '#FDF1D6', fg: '#9A6700' }, open: { label: 'No deadline', bg: '#E6EEF8', fg: '#1D4E89' },
}
const card: React.CSSProperties = { background: '#fff', border: '1px solid #E6E9EF', borderRadius: 8, padding: 20 }
const btn = (primary = false): React.CSSProperties => ({ padding: '8px 14px', borderRadius: 6, border: primary ? 'none' : '1px solid #D0D4E4', background: primary ? '#2F6DB5' : '#fff', color: primary ? '#fff' : '#344054', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' })
const num = (v: number) => Number(v).toLocaleString('en-GB', { maximumFractionDigits: 1 })

export default function Goals() {
  const [text, setText] = useState('')
  const [goals, setGoals] = useState<G[]>([])
  const [odds, setOdds] = useState<Record<string, number>>({})
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const load = () => staffApi<{ goals: G[]; odds: Record<string, number> }>('/api/portfolio-goals').then(d => { setGoals(d.goals); setOdds(d.odds) }).catch(e => setErr(e.message))
  useEffect(() => { load() }, [])
  async function act(action: string, body: any, key: string) {
    setBusy(key); setErr('')
    try { await staffApi('/api/portfolio-goals', { action, ...body }); if (action === 'create') setText(''); await load() } catch (e: any) { setErr(e.message) }
    setBusy('')
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ fontSize: 18, fontWeight: 600, color: '#323338', marginBottom: 4 }}>Goals</div>
      <div style={{ fontSize: 13, color: '#676879', marginBottom: 16 }}>Set a target and the AI works towards it. It keeps a deal search running, checks progress every Monday and tells you what to do that week.</div>
      <div style={{ ...card, marginBottom: 16 }}>
        <label htmlFor="goal" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 6 }}>What do you want to reach?</label>
        <input id="goal" value={text} maxLength={600} onChange={e => setText(e.target.value)} placeholder="e.g. 50 units in Manchester by June, buy-to-let, under £150k each"
          style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '1px solid #D0D4E4', borderRadius: 8, fontSize: 14, fontFamily: 'inherit' }} />
        <div style={{ marginTop: 10 }}><button style={{ ...btn(true), opacity: busy || text.trim().length < 8 ? .6 : 1 }} disabled={busy !== '' || text.trim().length < 8} onClick={() => act('create', { text }, 'create')}>{busy === 'create' ? 'Setting up…' : 'Set goal'}</button></div>
      </div>
      {err && <div role="alert" style={{ color: '#B42318', fontSize: 13, marginBottom: 12 }}>{err}</div>}
      {goals.length === 0 ? <div style={{ ...card, textAlign: 'center', color: '#9699A6', padding: 40, fontSize: 13 }}>No goals yet. Describe one above.</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {goals.map(g => {
            const p = g.progress, s = STATE[p.state]
            return (
              <div key={g.id} style={{ ...card, opacity: g.status === 'paused' ? .65 : 1 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#323338', flex: 1, minWidth: 200 }}>{g.text}</div>
                  {g.status === 'paused' ? <span style={{ fontSize: 11, fontWeight: 700, background: '#EEE', color: '#555', padding: '2px 9px', borderRadius: 99 }}>Paused</span>
                    : <span style={{ fontSize: 11, fontWeight: 700, background: s.bg, color: s.fg, padding: '2px 9px', borderRadius: 99 }}>{s.label}</span>}
                </div>
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}><span><b>{num(p.current)}</b> of {num(p.target)} {p.unit}</span><span>{p.pct}%</span></div>
                  <div role="progressbar" aria-valuenow={p.pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to goal" style={{ height: 8, background: '#E4E7EC', borderRadius: 99, overflow: 'hidden' }}><div style={{ width: p.pct + '%', height: '100%', background: '#2F6DB5' }} /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 8, marginTop: 14 }}>
                  {[['Weeks left', p.weeksLeft ?? '—'], ['Deals found a week', p.recentPerWeek], ['Needed a week', p.neededPerWeek ?? '—'], ['Expected to complete', p.expected]].map(([l, v]) => (
                    <div key={String(l)} style={{ background: '#F7F8FA', borderRadius: 8, padding: '10px 12px' }}><div style={{ fontSize: 17, fontWeight: 700, color: '#323338', fontVariantNumeric: 'tabular-nums' }}>{v}</div><div style={{ fontSize: 11, color: '#9699A6' }}>{l}</div></div>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: '#676879', marginTop: 10 }}>Pipeline: {Object.entries(p.pipeline).map(([k, v]) => `${k} ${v}`).join(' · ')}</div>
                {g.last_report && <div style={{ marginTop: 12, padding: '10px 14px', background: '#F4F9FD', borderLeft: '4px solid #89CFF0', fontSize: 13, color: '#344054', whiteSpace: 'pre-wrap' }}>{g.last_report}<div style={{ fontSize: 11, color: '#9699A6', marginTop: 4 }}>{g.last_review ? 'Reviewed ' + new Date(g.last_review).toLocaleDateString('en-GB') : ''}</div></div>}
                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  <button style={btn()} disabled={busy !== ''} onClick={() => act('review', { goalId: g.id }, 'r' + g.id)}>{busy === 'r' + g.id ? 'Reviewing…' : 'Review now'}</button>
                  <button style={btn()} onClick={() => act('toggle', { goalId: g.id }, 't' + g.id)}>{g.status === 'paused' ? 'Resume' : 'Pause'}</button>
                  <button style={{ ...btn(), color: '#B42318' }} onClick={() => act('delete', { goalId: g.id }, 'd' + g.id)}>Delete</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {Object.keys(odds).length > 0 && <div style={{ fontSize: 11, color: '#9699A6', marginTop: 14 }}>How "expected to complete" is worked out: each deal in your pipeline counts for a share of a completion. {Object.entries(odds).map(([k, v]) => `${k} ${Math.round(v * 100)}%`).join(', ')}. These are planning assumptions, not forecasts.</div>}
    </div>
  )
}
