'use client'
// Settings -> AI Authority: choose what Novourq Cloud AI may do on its own, what waits for a person, and what is off.
import { useEffect, useState } from 'react'
import { staffApi } from '@/lib/staff-api'

type Rule = { key: string; label: string; help: string; mode: 'auto' | 'approval' | 'never'; isDefault: boolean }
const card: React.CSSProperties = { background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, padding: 22, marginBottom: 18 }
const MODES: { v: Rule['mode']; l: string }[] = [{ v: 'auto', l: 'Automatic' }, { v: 'approval', l: 'Wait for a person' }, { v: 'never', l: 'Off' }]

export default function AiAuthorityPanel() {
  const [rules, setRules] = useState<Rule[]>([])
  const [locked, setLocked] = useState<string[]>([])
  const [isAdmin, setIsAdmin] = useState(true)
  const [err, setErr] = useState('')
  const load = () => staffApi<{ rules: Rule[]; locked: string[]; isAdmin: boolean }>('/api/ai-authority').then(d => { setRules(d.rules); setLocked(d.locked); setIsAdmin(d.isAdmin) }).catch(() => {})
  useEffect(() => { load() }, [])
  async function set(key: string, mode: Rule['mode']) {
    setErr('')
    try { await staffApi('/api/ai-authority', { key, mode }); await load() } catch (e: any) { setErr(e.message) }
  }
  return (
    <div style={{ maxWidth: 760 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#323338', margin: '0 0 4px' }}>AI Authority</h2>
      <div style={{ fontSize: 13, color: '#667085', marginBottom: 20 }}>Choose what Novourq Cloud AI may do on its own. Everything it does is recorded in the AI Activity log, with why it acted and who authorised it.</div>
      {!isAdmin && <div style={{ ...card, color: '#667085', fontSize: 14 }}>Only an account admin can change these.</div>}
      {err && <div role="alert" style={{ color: '#B42318', fontSize: 13, marginBottom: 12 }}>{err}</div>}
      <div style={card}>
        {rules.map((r, n) => (
          <div key={r.key} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', padding: '12px 0', borderTop: n ? '1px solid #E4E7EC' : 0 }}>
            <div style={{ flex: '1 1 220px', minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#323338' }}>{r.label}</div>
              <div style={{ fontSize: 12.5, color: '#667085' }}>{r.help}</div>
            </div>
            <div role="group" aria-label={r.label} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {MODES.map(m => (
                <button key={m.v} disabled={!isAdmin} onClick={() => set(r.key, m.v)} aria-pressed={r.mode === m.v}
                  style={{ border: '1px solid ' + (r.mode === m.v ? '#2F6DB5' : '#D0D5DD'), background: r.mode === m.v ? '#2F6DB5' : '#fff', color: r.mode === m.v ? '#fff' : '#344054', borderRadius: 8, padding: '6px 12px', fontSize: 13, cursor: isAdmin ? 'pointer' : 'default', fontFamily: 'inherit' }}>{m.l}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ ...card, fontSize: 13, color: '#344054', lineHeight: 1.6 }}>
        <b>Always wait for a person</b> (cannot be switched to automatic):
        <ul style={{ margin: '6px 0 10px', paddingLeft: 18 }}>{locked.map(l => <li key={l}>{l}</li>)}</ul>
        Any draft that mentions money or a contract also waits for a person. The AI sends at most 40 things a day on its own.
      </div>
    </div>
  )
}
