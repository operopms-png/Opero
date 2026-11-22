'use client'
// Estate Agency: one timeline per person. Calls, emails, meetings and notes you log, together with
// that person's offers, checks and sales, so everything about them is in one place.
import { useEffect, useState } from 'react'
import { supabase, getAccountId } from '../../lib/supabase'

const KINDS = ['Call', 'Email', 'WhatsApp', 'SMS', 'Meeting', 'Viewing', 'Note']
const ACCENT = '#2F6DB5'
const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #D0D5DD', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }
const TYPE_LABEL: Record<string, string> = { contact: 'Contact', landlord: 'Landlord', tenant: 'Tenant' }

type Person = { key: string; type: 'contact' | 'landlord' | 'tenant'; id: string; name: string; sub: string }

export default function ContactHistorySection() {
  const [people, setPeople] = useState<Person[]>([])
  const [sel, setSel] = useState('')
  const [q, setQ] = useState('')
  const [events, setEvents] = useState<any[]>([])
  const [kind, setKind] = useState('Call')
  const [text, setText] = useState('')
  const [uid, setUid] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const id = await getAccountId(user); setUid(id)
      const [c, l, t] = await Promise.all([
        supabase.from('estate_contacts').select('id,name,kind').eq('user_id', id),
        supabase.from('estate_landlords').select('id,name').eq('user_id', id),
        supabase.from('estate_tenants').select('id,name').eq('user_id', id),
      ])
      const list: Person[] = [
        ...(c.data ?? []).map((x: any) => ({ key: 'contact:' + x.id, type: 'contact' as const, id: x.id, name: x.name, sub: x.kind })),
        ...(l.data ?? []).map((x: any) => ({ key: 'landlord:' + x.id, type: 'landlord' as const, id: x.id, name: x.name, sub: 'landlord' })),
        ...(t.data ?? []).map((x: any) => ({ key: 'tenant:' + x.id, type: 'tenant' as const, id: x.id, name: x.name, sub: 'tenant' })),
      ].sort((a, b) => a.name.localeCompare(b.name))
      setPeople(list)
    })()
  }, [])

  const person = people.find(p => p.key === sel)

  async function loadEvents() {
    if (!person || !uid) { setEvents([]); return }
    const log = await supabase.from('estate_contact_log').select('*').eq('user_id', uid).eq('person_type', person.type).eq('person_id', person.id)
    const out: any[] = (log.data ?? []).map((r: any) => ({ id: r.id, at: r.logged_at, kind: r.kind, text: r.summary, by: r.created_by, own: true }))
    if (person.type === 'contact') {
      const [o, k, s] = await Promise.all([
        supabase.from('estate_offers').select('created_at,amount,status,direction').eq('user_id', uid).eq('contact_id', person.id),
        supabase.from('estate_client_checks').select('created_at,kind,status').eq('user_id', uid).eq('contact_id', person.id),
        supabase.from('estate_sales').select('created_at,status,agreed_price').eq('user_id', uid).or(`buyer_id.eq.${person.id},seller_id.eq.${person.id}`),
      ])
      ;(o.data ?? []).forEach((r: any) => out.push({ at: r.created_at, kind: 'Offer', text: `Offer ${r.direction}: ${Number(r.amount).toLocaleString()} (${r.status})` }))
      ;(k.data ?? []).forEach((r: any) => out.push({ at: r.created_at, kind: 'Check', text: `${r.kind} check: ${r.status}` }))
      ;(s.data ?? []).forEach((r: any) => out.push({ at: r.created_at, kind: 'Sale', text: `Sale ${r.status}${r.agreed_price ? ` at ${Number(r.agreed_price).toLocaleString()}` : ''}` }))
    }
    out.sort((a, b) => String(b.at).localeCompare(String(a.at)))
    setEvents(out)
  }
  useEffect(() => { loadEvents() /* eslint-disable-next-line */ }, [sel, uid])

  async function add() {
    if (!person) return
    if (!text.trim()) { setErr('Write what happened'); return }
    setErr('')
    const { data: { user } } = await supabase.auth.getUser()
    const res = await supabase.from('estate_contact_log').insert([{ user_id: uid, person_type: person.type, person_id: person.id, kind, summary: text.trim(), created_by: user?.email ?? null }])
    if (res.error) { setErr(res.error.message); return }
    setText(''); loadEvents()
  }
  async function remove(id: string) { await supabase.from('estate_contact_log').delete().eq('id', id); loadEvents() }

  const shown = people.filter(p => !q || p.name.toLowerCase().includes(q.toLowerCase())).slice(0, 200)

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search people" style={{ ...inp, maxWidth: 240 }} />
        <select value={sel} onChange={e => setSel(e.target.value)} style={{ ...inp, maxWidth: 360 }}>
          <option value="">Choose a person</option>
          {shown.map(p => <option key={p.key} value={p.key}>{p.name} ({p.sub})</option>)}
        </select>
      </div>
      {!person ? <div style={{ textAlign: 'center', padding: 60, color: '#98A2B3', fontSize: 14 }}>Choose a buyer, seller, applicant, corporate client, landlord or tenant to see their history.</div> : (
        <>
          <div style={{ background: '#fff', border: '1px solid ' + ACCENT, borderRadius: 12, padding: 16, marginBottom: 14 }}>
            <div style={{ fontWeight: 600, marginBottom: 10 }}>{person.name} <span style={{ fontWeight: 400, color: '#667085', fontSize: 13 }}>· {TYPE_LABEL[person.type]}</span></div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select value={kind} onChange={e => setKind(e.target.value)} style={{ ...inp, width: 140 }}>{KINDS.map(k => <option key={k}>{k}</option>)}</select>
              <input value={text} onChange={e => setText(e.target.value)} placeholder="What was said or agreed" style={{ ...inp, flex: 1, minWidth: 220 }} onKeyDown={e => { if (e.key === 'Enter') add() }} />
              <button onClick={add} style={{ background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Log it</button>
            </div>
            {err && <div style={{ color: '#B42318', fontSize: 13, marginTop: 8 }}>{err}</div>}
          </div>
          {events.length === 0 ? <div style={{ textAlign: 'center', padding: 40, color: '#98A2B3', fontSize: 14 }}>Nothing logged yet</div>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {events.map((e, i) => (
                <div key={e.id ?? i} style={{ background: '#fff', borderRadius: 10, border: '1px solid #E4E7EC', padding: '10px 14px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: e.own ? '#EAF3FC' : '#F2F4F7', color: e.own ? ACCENT : '#667085', minWidth: 52, textAlign: 'center' }}>{e.kind}</span>
                  <div style={{ flex: 1, minWidth: 180, fontSize: 14, color: '#323338' }}>{e.text}</div>
                  <div style={{ fontSize: 12, color: '#98A2B3' }}>{new Date(e.at).toLocaleDateString()}{e.by ? ` · ${e.by}` : ''}</div>
                  {e.own && <button onClick={() => remove(e.id)} style={{ fontSize: 12, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>}
                </div>
              ))}
            </div>}
        </>
      )}
    </div>
  )
}
