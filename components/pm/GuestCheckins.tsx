'use client'
// Guest Check-ins tab (short lets): who has checked in online, who still needs to, ID photos,
// security deposit and signed terms. Data from /api/guest-checkins; guests use /checkin/[token].
import { useCallback, useEffect, useState } from 'react'
import { ownerFetch } from '@/lib/platform-fetch'

const card: React.CSSProperties = { background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12 }
const th: React.CSSProperties = { textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#667085', textTransform: 'uppercase', letterSpacing: '.05em', padding: '10px 14px', borderBottom: '1px solid #E4E7EC' }
const td: React.CSSProperties = { padding: '12px 14px', fontSize: 13.5, borderBottom: '1px solid #F2F4F7', verticalAlign: 'top' }
const btn: React.CSSProperties = { fontSize: 12, color: '#2F6DB5', background: 'none', border: '1px solid #2F6DB5', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', marginRight: 6, marginBottom: 4, fontFamily: 'inherit' }
const pill = (bg: string, fg: string): React.CSSProperties => ({ display: 'inline-block', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: bg, color: fg, marginRight: 4 })
const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

export default function GuestCheckins() {
  const [items, setItems] = useState<any[]>([])
  const [enabled, setEnabled] = useState(0)
  const [filter, setFilter] = useState<'all' | 'todo' | 'done'>('all')
  const [busy, setBusy] = useState('')
  const [note, setNote] = useState('')
  const [open, setOpen] = useState<string | null>(null)

  const load = useCallback(async () => {
    const r = await ownerFetch('/api/guest-checkins')
    if (r.ok) { setItems(r.data.items ?? []); setEnabled(r.data.enabledCount ?? 0) } else setNote(r.data?.error || 'Could not load check-ins.')
  }, [])
  useEffect(() => { load() }, [load])

  async function act(it: any, action: string, extra: any = {}) {
    const key = it.booking_id + action
    setBusy(key); setNote('')
    const r = await ownerFetch('/api/guest-checkins', { method: 'POST', body: JSON.stringify({ action, id: it.id, booking_table: it.booking_table, booking_id: it.booking_id, ...extra }) })
    setBusy('')
    if (!r.ok) setNote(r.data?.error || 'That did not work.')
    else if (action === 'send') setNote(r.data.emailed ? 'Check-in link emailed to the guest.' : (r.data.note || 'Link created.') + ' ' + (r.data.link || ''))
    else if (action === 'remind') setNote(r.data.emailed ? 'Reminder sent.' : 'No email address on this booking.')
    else setNote('Done.')
    load()
  }
  async function charge(it: any) {
    const amt = window.prompt(`Amount to charge for damage (maximum ${it.deposit.amount}):`)
    if (!amt) return
    const reason = window.prompt('Reason (shown to the guest on their receipt):') || ''
    if (!window.confirm(`Charge the guest's saved card ${amt} for: ${reason || 'damage'}?`)) return
    act(it, 'charge', { amount: Number(amt), reason })
  }

  const done = (i: any) => i.status === 'complete'
  const shown = items.filter(i => filter === 'all' || (filter === 'done' ? done(i) : !done(i)))
  const stat = (label: string, v: number) => <div style={{ ...card, padding: '16px 20px', flex: 1 }}><div style={{ fontSize: 11, fontWeight: 600, color: '#667085', textTransform: 'uppercase' }}>{label}</div><div style={{ fontSize: 26, fontWeight: 700, color: '#1B2A4A', marginTop: 4 }}>{v}</div></div>

  return (
    <div>
      <div style={{ display: 'flex', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
        {stat('Arrivals listed', items.length)}
        {stat('Checked in', items.filter(done).length)}
        {stat('Waiting on guest', items.filter(i => i.sent && !done(i)).length)}
        {stat('Link not sent', items.filter(i => !i.sent).length)}
      </div>
      {enabled === 0 && <div style={{ ...card, padding: 14, marginBottom: 14, fontSize: 13.5, color: '#475467' }}>No property has online check-in switched on. Edit a property and turn on Online check-in to email guests their link automatically three days before arrival. You can still send a link to any booking by hand.</div>}
      <div style={{ marginBottom: 12 }}>
        {(['all', 'todo', 'done'] as const).map(f => <button key={f} onClick={() => setFilter(f)} style={{ ...btn, background: filter === f ? '#2F6DB5' : '#fff', color: filter === f ? '#fff' : '#2F6DB5' }}>{f === 'all' ? 'All' : f === 'todo' ? 'To do' : 'Checked in'}</button>)}
      </div>
      {note && <div style={{ ...card, padding: '10px 14px', marginBottom: 12, fontSize: 13.5, wordBreak: 'break-all' }}>{note}</div>}
      <div style={{ ...card, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
          <thead><tr><th style={th}>Guest</th><th style={th}>Property</th><th style={th}>Stay</th><th style={th}>Check-in status</th><th style={th}>Actions</th></tr></thead>
          <tbody>
            {shown.length === 0 && <tr><td style={{ ...td, color: '#98A2B3' }} colSpan={5}>No arrivals to show.</td></tr>}
            {shown.map(i => {
              const k = i.booking_table + i.booking_id
              return (<>
                <tr key={k}>
                  <td style={td}><div style={{ fontWeight: 600 }}>{i.guest}</div><div style={{ color: '#667085', fontSize: 12 }}>{i.email || 'No email'}</div></td>
                  <td style={td}>{i.property}</td>
                  <td style={td}>{fmt(i.check_in)} to {fmt(i.check_out)}</td>
                  <td style={td}>
                    {done(i) ? <span style={pill('#E7F6EC', '#067647')}>Checked in</span> : i.sent ? <span style={pill('#FFF4E0', '#B54708')}>Waiting on guest</span> : <span style={pill('#F2F4F7', '#475467')}>Link not sent</span>}
                    {i.sent && <div style={{ marginTop: 4 }}>
                      <span style={pill(i.has_id ? '#E7F6EC' : '#F2F4F7', i.has_id ? '#067647' : '#667085')}>ID</span>
                      {i.deposit.amount > 0 && <span style={pill(i.deposit.status === 'card_saved' ? '#E7F6EC' : i.deposit.status === 'charged' ? '#FEF3F2' : '#F2F4F7', i.deposit.status === 'card_saved' ? '#067647' : i.deposit.status === 'charged' ? '#B42318' : '#667085')}>Deposit: {i.deposit.status === 'none' ? 'not saved' : i.deposit.status.replace('_', ' ')}</span>}
                      <span style={pill(i.terms.signed ? '#E7F6EC' : '#F2F4F7', i.terms.signed ? '#067647' : '#667085')}>Terms</span>
                    </div>}
                  </td>
                  <td style={td}>
                    {!i.sent && <button style={btn} disabled={!!busy} onClick={() => act(i, 'send')}>Send link</button>}
                    {i.sent && !done(i) && <button style={btn} disabled={!!busy} onClick={() => act(i, 'remind')}>Remind</button>}
                    {i.sent && <button style={btn} onClick={() => setOpen(open === k ? null : k)}>{open === k ? 'Hide' : 'View'}</button>}
                    {i.deposit.status === 'card_saved' && <button style={{ ...btn, color: '#B42318', borderColor: '#B42318' }} disabled={!!busy} onClick={() => charge(i)}>Charge damage</button>}
                    {i.deposit.status === 'card_saved' && <button style={btn} disabled={!!busy} onClick={() => window.confirm('Release the deposit and forget the saved card?') && act(i, 'release')}>Release deposit</button>}
                  </td>
                </tr>
                {open === k && <tr key={k + 'd'}><td colSpan={5} style={{ ...td, background: '#FAFCFE' }}>
                  <div>Phone: {i.phone || 'not given'} · Guests: {i.num_guests ?? 'not given'} · Arrival: {i.arrival_time || 'not given'}</div>
                  <div style={{ marginTop: 6 }}>Terms: {i.terms.signed ? `signed by ${i.terms.name} on ${new Date(i.terms.at).toLocaleString('en-GB')}` : 'not signed yet'}</div>
                  {i.deposit.charged != null && <div style={{ marginTop: 6 }}>Charged {i.deposit.charged} for: {i.deposit.reason || 'damage'}</div>}
                  <div style={{ marginTop: 6 }}>ID photos: {i.id_files.length ? i.id_files.map((f: any, n: number) => f.url ? <a key={n} href={f.url} target="_blank" rel="noreferrer" style={{ color: '#2F6DB5', marginRight: 10 }}>{f.name}</a> : <span key={n}>{f.name} </span>) : 'none yet'} <span style={{ color: '#98A2B3', fontSize: 12 }}>(links last 5 minutes; photos are deleted 30 days after check-out)</span></div>
                  {i.link && <div style={{ marginTop: 6, wordBreak: 'break-all', fontSize: 12.5, color: '#667085' }}>Guest link: {i.link}</div>}
                </td></tr>}
              </>)
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
