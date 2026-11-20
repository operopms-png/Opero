'use client'
// Developments → Feasibility: the saved-sites wrapper around the Feasibility screen.
// Each company's sites are its own (dev_feasibility, same access rule as the other Developments tables).
import { useCallback, useEffect, useState } from 'react'
import Feasibility, { newSaved, type Saved } from '@/components/dev/Feasibility'
import { supabase, getAccountId } from '@/lib/supabase'
import { staffApi } from '@/lib/staff-api'
import { cur } from '@/lib/company-currency'

type Row = { id: string; name: string; data: Saved; updated_at: string }

export default function FeasibilityTab() {
  const [rows, setRows] = useState<Row[]>([])
  const [openId, setOpenId] = useState<string | 'example' | null>('example')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [uid, setUid] = useState<string | undefined>()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const id = user ? await getAccountId(user) : undefined
    setUid(id)
    if (!id) return
    const { data } = await supabase.from('dev_feasibility').select('id,name,data,updated_at').eq('user_id', id).order('updated_at', { ascending: false })
    setRows((data as Row[]) || [])
  }, [])
  useEffect(() => { load() }, [load])

  async function save(s: Saved) {
    if (!uid) { setMsg('Sign in again to save.'); return }
    setSaving(true); setMsg('')
    const payload = { user_id: uid, name: s.siteName || 'Untitled site', data: s, updated_at: new Date().toISOString() }
    const isNew = openId === 'example' || !openId
    const { data, error } = isNew
      ? await supabase.from('dev_feasibility').insert(payload).select('id').single()
      : await supabase.from('dev_feasibility').update(payload).eq('id', openId).select('id').single()
    setSaving(false)
    if (error) { setMsg(error.message); return }
    setMsg('Saved.'); if (isNew && data) setOpenId((data as any).id); load()
  }
  async function remove(id: string) {
    if (!window.confirm('Delete this saved site? This cannot be undone.')) return
    await supabase.from('dev_feasibility').delete().eq('id', id)
    if (openId === id) setOpenId('example'); load()
  }

  const current = rows.find(r => r.id === openId)
  const initial: Saved = current ? { ...newSaved(), ...current.data } : newSaved()
  const btn = (on: boolean): React.CSSProperties => ({ padding: '7px 13px', border: `1px solid ${on ? '#14110D' : '#E6E1D5'}`, background: on ? '#14110D' : '#fff', color: on ? '#fff' : '#1E1C18', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' })

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <button style={btn(openId === 'example')} onClick={() => setOpenId('example')}>Example site</button>
        {rows.map(r => (
          <span key={r.id} style={{ display: 'inline-flex', gap: 2 }}>
            <button style={btn(openId === r.id)} onClick={() => setOpenId(r.id)}>{r.name}</button>
            <button title="Delete" onClick={() => remove(r.id)} style={{ ...btn(false), color: '#B42318', padding: '7px 9px' }}>×</button>
          </span>
        ))}
        <span style={{ fontSize: 13, color: '#667085' }}>{openId === 'example' ? 'Change anything, then press Save to keep it as your own site.' : msg}</span>
        {openId === 'example' && msg && <span style={{ fontSize: 13, color: '#667085' }}>{msg}</span>}
      </div>
      <Feasibility key={String(openId) + (current?.updated_at || '')} symbol={cur()} initial={initial} isExample={openId === 'example'} onSave={save} saving={saving}
        loadGround={(lat, lng, size) => staffApi('/api/dev-terrain', { lat, lng, size })} />
    </div>
  )
}
