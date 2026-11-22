'use client'
// Estate Agency sales side: sales progression. One card per sale with a checklist of
// conveyancing, due diligence, contracts and completion steps, started from an accepted offer.
import { useEffect, useState } from 'react'
import { supabase, getAccountId } from '../../lib/supabase'
import { CURRENCIES } from '@/lib/listings-shared'
import { SALE_STATUSES, SALE_STEPS } from '@/lib/estate-sales'

const ACCENT = '#2F6DB5'
const inp: React.CSSProperties = { padding: '7px 10px', borderRadius: 8, border: '1px solid #D0D5DD', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }
const COLOUR: Record<string, [string, string]> = { Completed: ['#D1FAE5', '#059669'], 'Fell through': ['#FEE2E2', '#B42318'], Exchanged: ['#FEF3C7', '#92400E'] }
const today = () => new Date().toISOString().slice(0, 10)

export default function SalesSection({ properties }: { properties: any[] }) {
  const [sales, setSales] = useState<any[]>([])
  const [steps, setSteps] = useState<any[]>([])
  const [people, setPeople] = useState<any[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const uid = await getAccountId(user)
    const [a, b, c] = await Promise.all([
      supabase.from('estate_sales').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      supabase.from('estate_sale_steps').select('*').eq('user_id', uid).order('sort'),
      supabase.from('estate_contacts').select('id,name').eq('user_id', uid),
    ])
    setSales(a.data ?? []); setSteps(b.data ?? []); setPeople(c.data ?? []); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const prop = (id: string) => properties.find(p => p.id === id)
  const money = (n: any, pid: string) => (n == null ? '' : (CURRENCIES[prop(pid)?.currency || 'JMD'] ?? CURRENCIES.JMD).symbol + Number(n).toLocaleString())
  const patchSale = async (id: string, patch: any) => {
    await supabase.from('estate_sales').update(patch).eq('id', id)
    // the property follows the sale: Sold when completed, back on the market if it fell through
    const pid = sales.find(x => x.id === id)?.property_id
    if (pid && patch.status) {
      const next = patch.status === 'Completed' ? 'Sold' : patch.status === 'Fell through' ? 'Available' : 'Sale agreed'
      await supabase.from('estate_properties').update({ status: next }).eq('id', pid)
    }
    load()
  }
  async function toggle(st: any) {
    await supabase.from('estate_sale_steps').update({ done: !st.done, done_date: !st.done ? today() : null }).eq('id', st.id)
    load()
  }
  async function setStep(id: string, patch: any) { await supabase.from('estate_sale_steps').update(patch).eq('id', id); load() }
  async function remove(id: string) { if (!confirm('Delete this sale and its checklist?')) return; await supabase.from('estate_sales').delete().eq('id', id); load() }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#98A2B3' }}>Loading…</div>
  if (!sales.length) return <div style={{ textAlign: 'center', padding: 60, color: '#98A2B3', fontSize: 14 }}>No sales yet. Accept an offer in Offers, then press Start sale.</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {sales.map(s => {
        const mine = steps.filter(x => x.sale_id === s.id)
        const done = mine.filter(x => x.done).length
        const pct = mine.length ? Math.round((done / mine.length) * 100) : 0
        const [bg, fg] = COLOUR[s.status] ?? ['#EAF3FC', ACCENT]
        const isOpen = openId === s.id
        return (
          <div key={s.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', overflow: 'hidden' }}>
            <div onClick={() => setOpenId(isOpen ? null : s.id)} style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', cursor: 'pointer' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#323338' }}>{prop(s.property_id)?.name ?? 'Property'}</div>
                <div style={{ fontSize: 12, color: '#667085', marginTop: 2 }}>
                  Buyer {people.find(p => p.id === s.buyer_id)?.name ?? '—'}{s.target_completion ? ` · target completion ${s.target_completion}` : ''}
                </div>
              </div>
              <div style={{ width: 130 }}>
                <div style={{ height: 6, background: '#F2F4F7', borderRadius: 4 }}><div style={{ width: pct + '%', height: 6, background: ACCENT, borderRadius: 4 }} /></div>
                <div style={{ fontSize: 11, color: '#667085', marginTop: 3 }}>{done} of {mine.length} steps</div>
              </div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{money(s.agreed_price, s.property_id)}</div>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: bg, color: fg }}>{s.status}</span>
            </div>
            {isOpen && (
              <div style={{ borderTop: '1px solid #E4E7EC', padding: 18, background: '#FCFCFD' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10, marginBottom: 16 }}>
                  <label style={{ fontSize: 12, color: '#344054' }}>Status<select style={{ ...inp, width: '100%', marginTop: 4 }} value={s.status} onChange={e => patchSale(s.id, { status: e.target.value, completed_date: e.target.value === 'Completed' ? today() : null })}>{SALE_STATUSES.map(x => <option key={x}>{x}</option>)}</select></label>
                  <label style={{ fontSize: 12, color: '#344054' }}>Agreed price<input type="number" style={{ ...inp, width: '100%', marginTop: 4 }} defaultValue={s.agreed_price ?? ''} onBlur={e => patchSale(s.id, { agreed_price: e.target.value === '' ? null : Number(e.target.value) })} /></label>
                  <label style={{ fontSize: 12, color: '#344054' }}>Target completion<input type="date" style={{ ...inp, width: '100%', marginTop: 4 }} defaultValue={s.target_completion ?? ''} onBlur={e => patchSale(s.id, { target_completion: e.target.value || null })} /></label>
                  <label style={{ fontSize: 12, color: '#344054' }}>Buyer's solicitor<input style={{ ...inp, width: '100%', marginTop: 4 }} defaultValue={s.buyer_solicitor ?? ''} onBlur={e => patchSale(s.id, { buyer_solicitor: e.target.value || null })} /></label>
                  <label style={{ fontSize: 12, color: '#344054' }}>Seller's solicitor<input style={{ ...inp, width: '100%', marginTop: 4 }} defaultValue={s.seller_solicitor ?? ''} onBlur={e => patchSale(s.id, { seller_solicitor: e.target.value || null })} /></label>
                </div>
                {SALE_STEPS.map(g => {
                  const list = mine.filter(x => x.category === g.category)
                  if (!list.length) return null
                  return (
                    <div key={g.category} style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{g.category}</div>
                      {list.map(st => (
                        <div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid #F2F4F7', flexWrap: 'wrap' }}>
                          <input type="checkbox" checked={st.done} onChange={() => toggle(st)} />
                          <span style={{ flex: 1, minWidth: 160, fontSize: 14, color: st.done ? '#98A2B3' : '#323338', textDecoration: st.done ? 'line-through' : 'none' }}>{st.name}</span>
                          {st.done && st.done_date && <span style={{ fontSize: 11, color: '#059669' }}>Done {st.done_date}</span>}
                          <input type="date" title="Due date" style={{ ...inp, padding: '3px 6px' }} defaultValue={st.due_date ?? ''} onBlur={e => setStep(st.id, { due_date: e.target.value || null })} />
                        </div>
                      ))}
                    </div>
                  )
                })}
                <div style={{ textAlign: 'right' }}><button onClick={() => remove(s.id)} style={{ fontSize: 12, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer' }}>Delete sale</button></div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
