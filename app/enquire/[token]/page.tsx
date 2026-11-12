'use client'
export const dynamic = 'force-dynamic'
// Public enquiry form: Guaranteed Rent / Short Let Partnership / Estate Property Management. No login.
// Each submission lands in the company's CRM (contact + a deal in the Enquiry stage).
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ENQUIRY_SERVICES, BEDROOMS, BATHROOMS, FURNITURE, WHEN, ROLES } from '@/lib/enquiry-form'

const NAVY = '#16233F', BLUE = '#2F6DB5'
const inp: React.CSSProperties = { width: '100%', padding: '11px 12px', borderRadius: 8, border: '1px solid #D0D5DD', fontSize: 15, fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff', color: NAVY }
const lab: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: NAVY, margin: '16px 0 5px' }
const card: React.CSSProperties = { background: '#fff', borderRadius: 14, padding: '22px 20px', boxShadow: '0 1px 3px rgba(16,24,40,.08)', marginBottom: 16 }
const blank = () => ({ location: '', bedrooms: '', bathrooms: '', furniture: '' })

function Choice({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{options.map(o =>
    <button type="button" key={o} onClick={() => onChange(o)} style={{ padding: '9px 16px', borderRadius: 999, border: `1.5px solid ${value === o ? BLUE : '#D0D5DD'}`, background: value === o ? '#EAF2FB' : '#fff', color: NAVY, fontSize: 14, fontWeight: value === o ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit' }}>{o}</button>)}</div>
}
const Req = () => <span style={{ color: '#D92D20' }}> *</span>

export default function EnquirePage() {
  const { token } = useParams() as { token: string }
  const [live, setLive] = useState<boolean | null>(null)
  const [service, setService] = useState('')
  const [f, setF] = useState({ first_name: '', last_name: '', email: '', country_code: '+1 876', phone: '', role: '', owns: '', listed: '', planning: '', when: '', budget: '', message: '', marketing: false, website: '' })
  const [props, setProps] = useState([blank()])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)
  const set = (k: string, v: any) => setF(p => ({ ...p, [k]: v }))

  useEffect(() => { fetch('/api/public/enquiry?t=' + encodeURIComponent(token)).then(r => setLive(r.ok)).catch(() => setLive(false)) }, [token])

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr('')
    if (!service) return setErr('Please choose the service you are interested in.')
    setBusy(true)
    try {
      const r = await fetch('/api/public/enquiry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, service, ...f, properties: f.owns === 'Yes' ? props : [] }) })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j.error || 'Something went wrong. Please try again.')
      setDone(true); window.scrollTo(0, 0)
    } catch (x: any) { setErr(x.message) }
    setBusy(false)
  }
  const upd = (i: number, k: string, v: string) => setProps(p => p.map((r, j) => j === i ? { ...r, [k]: v } : r))
  const svc = ENQUIRY_SERVICES.find(s => s.key === service)

  return (
    <div style={{ minHeight: '100vh', background: '#F2F5F9', fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif", color: NAVY }}>
      <div style={{ background: NAVY, color: '#fff', padding: '26px 16px 60px', textAlign: 'center' }}>
        <div style={{ letterSpacing: 4, fontWeight: 700, fontSize: 15 }}>NOVOURQ</div>
        <h1 style={{ margin: '12px 0 4px', fontSize: 24, fontWeight: 700 }}>Work with us</h1>
        <div style={{ opacity: .8, fontSize: 14 }}>Tell us about you and your property and we will be in touch.</div>
      </div>
      <div style={{ maxWidth: 640, margin: '-36px auto 0', padding: '0 16px 40px' }}>
        {live === null && <div style={card}>Loading…</div>}
        {live === false && <div style={card}><b>This link is not active.</b><p style={{ color: '#667085', fontSize: 14 }}>Please contact us for a new one.</p></div>}
        {done && <div style={card}><h2 style={{ marginTop: 0 }}>Thank you{f.first_name ? `, ${f.first_name}` : ''}.</h2><p style={{ lineHeight: 1.6 }}>We have your enquiry{svc ? ` about ${svc.label}` : ''}. A member of our team will contact you shortly. We have also sent a confirmation to {f.email}.</p></div>}
        {live && !done && (
          <form onSubmit={submit}>
            <div style={{ ...card, background: '#EAF2FB', fontSize: 14, lineHeight: 1.6 }}>
              For tenant housing enquiries, please check our <a href="/homes" style={{ color: BLUE, fontWeight: 600 }}>available units</a>. This form is for landlords and investors.
            </div>
            <div style={card}>
              <div style={{ fontWeight: 700, marginBottom: 10 }}>What are you interested in?<Req /></div>
              <div style={{ display: 'grid', gap: 10 }}>
                {ENQUIRY_SERVICES.map(s => (
                  <button type="button" key={s.key} onClick={() => setService(s.key)} style={{ textAlign: 'left', padding: '14px 16px', borderRadius: 10, border: `2px solid ${service === s.key ? BLUE : '#E4E7EC'}`, background: service === s.key ? '#EAF2FB' : '#fff', cursor: 'pointer', fontFamily: 'inherit', color: NAVY }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{s.label}</div>
                    <div style={{ fontSize: 13, color: '#667085', marginTop: 3 }}>{s.text}</div>
                  </button>))}
              </div>
            </div>

            <div style={card}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
                <div><label style={{ ...lab, marginTop: 0 }}>First name<Req /></label><input style={inp} value={f.first_name} onChange={e => set('first_name', e.target.value)} required /></div>
                <div><label style={{ ...lab, marginTop: 0 }}>Last name<Req /></label><input style={inp} value={f.last_name} onChange={e => set('last_name', e.target.value)} required /></div>
              </div>
              <label style={lab}>Email<Req /></label><input style={inp} type="email" value={f.email} onChange={e => set('email', e.target.value)} required />
              <label style={lab}>Phone number<Req /></label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input style={{ ...inp, width: 100, flex: 'none' }} value={f.country_code} onChange={e => set('country_code', e.target.value)} aria-label="Country code" />
                <input style={inp} type="tel" value={f.phone} onChange={e => set('phone', e.target.value)} required />
              </div>
              <label style={lab}>I am a<Req /></label><Choice value={f.role} options={ROLES} onChange={v => set('role', v)} />
              <label style={lab}>Do you currently own or sublease a property?<Req /></label><Choice value={f.owns} options={['Yes', 'Not yet']} onChange={v => set('owns', v)} />
            </div>

            {f.owns === 'Yes' && (
              <div style={card}>
                <div style={{ fontWeight: 700 }}>Your properties</div>
                {props.map((p, i) => (
                  <div key={i} style={{ marginTop: 14, paddingTop: 14, borderTop: i ? '1px solid #EAECF0' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#667085' }}><span>Property {i + 1}</span>{props.length > 1 && <button type="button" onClick={() => setProps(x => x.filter((_, j) => j !== i))} style={{ border: 'none', background: 'none', color: '#D92D20', cursor: 'pointer', fontFamily: 'inherit' }}>Remove</button>}</div>
                    <label style={lab}>Location</label><input style={inp} value={p.location} onChange={e => upd(i, 'location', e.target.value)} placeholder="Area, parish or address" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
                      <div><label style={lab}>Bedrooms</label><select style={inp} value={p.bedrooms} onChange={e => upd(i, 'bedrooms', e.target.value)}><option value="">Select</option>{BEDROOMS.map(o => <option key={o}>{o}</option>)}</select></div>
                      <div><label style={lab}>Bathrooms</label><select style={inp} value={p.bathrooms} onChange={e => upd(i, 'bathrooms', e.target.value)}><option value="">Select</option>{BATHROOMS.map(o => <option key={o}>{o}</option>)}</select></div>
                      <div><label style={lab}>Furniture</label><select style={inp} value={p.furniture} onChange={e => upd(i, 'furniture', e.target.value)}><option value="">Select</option>{FURNITURE.map(o => <option key={o}>{o}</option>)}</select></div>
                    </div>
                  </div>))}
                {props.length < 20 && <button type="button" onClick={() => setProps(p => [...p, blank()])} style={{ marginTop: 14, padding: '9px 14px', borderRadius: 8, border: `1.5px dashed ${BLUE}`, background: '#fff', color: BLUE, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>+ Add another property</button>}
                <label style={lab}>Is it listed on Airbnb or Booking.com?</label><Choice value={f.listed} options={['Yes', 'No']} onChange={v => set('listed', v)} />
              </div>
            )}

            {f.owns === 'Not yet' && (
              <div style={card}>
                <label style={{ ...lab, marginTop: 0 }}>Are you planning to buy or sublease a property?</label><Choice value={f.planning} options={['Yes', 'No']} onChange={v => set('planning', v)} />
                {f.planning === 'Yes' && <>
                  <label style={lab}>When?</label><Choice value={f.when} options={WHEN} onChange={v => set('when', v)} />
                  <label style={lab}>What is your budget?</label><input style={inp} value={f.budget} onChange={e => set('budget', e.target.value)} placeholder="For example USD 150,000" />
                </>}
              </div>
            )}

            <div style={card}>
              <label style={{ ...lab, marginTop: 0 }}>How can we help you?<Req /></label>
              <textarea style={{ ...inp, minHeight: 110, resize: 'vertical' }} value={f.message} onChange={e => set('message', e.target.value)} required />
              <input tabIndex={-1} autoComplete="off" aria-hidden="true" value={f.website} onChange={e => set('website', e.target.value)} style={{ position: 'absolute', left: -9999, opacity: 0, height: 0 }} />
              <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 16, fontSize: 13, color: '#667085', lineHeight: 1.5 }}>
                <input type="checkbox" checked={f.marketing} onChange={e => set('marketing', e.target.checked)} style={{ marginTop: 3 }} />
                I would like to receive news and offers from NOVOURQ. You can unsubscribe at any time.
              </label>
              {err && <div style={{ marginTop: 14, color: '#B42318', background: '#FEF3F2', padding: '10px 12px', borderRadius: 8, fontSize: 14 }}>{err}</div>}
              <button type="submit" disabled={busy} style={{ display: 'block', width: '100%', marginTop: 18, border: 'none', borderRadius: 10, background: NAVY, color: '#fff', fontSize: 16, fontWeight: 700, padding: 14, cursor: 'pointer', fontFamily: 'inherit', opacity: busy ? .6 : 1 }}>{busy ? 'Sending…' : 'Submit'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
