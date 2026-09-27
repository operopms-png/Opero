'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'

// Staff Centre -> Website Chats
// Every conversation from the AI chat box on the business's own website, the leads it captured,
// the assistant's settings, the install code, and which properties it can show.

const ACCENT = '#3B4AFF'
const SITE = 'https://helloopero.com'
const CURRENCIES = [
  { v: '', l: 'Don’t show prices (team confirms)' },
  { v: 'GBP', l: 'GBP £' }, { v: 'USD', l: 'USD $' }, { v: 'JMD', l: 'JMD J$' }, { v: 'AED', l: 'AED' }, { v: 'EUR', l: 'EUR €' },
]
const INTEREST_LABEL: Record<string, string> = {
  rent_a_home: 'Looking for a home', list_property: 'Wants to list a property', guaranteed_rent: 'Guaranteed rent',
  invest: 'Investing / partnership', careers: 'Careers', other: 'General enquiry',
}
const input = { width: '100%', padding: '9px 12px', border: '1px solid #D0D5DD', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' as const, background: '#fff' }
const label = { fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 4, display: 'block' }
const card = { background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC' }

function ago(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const h = Math.floor(mins / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return d < 7 ? `${d}d ago` : new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function Page() {
  const [loading, setLoading] = useState(true)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [view, setView] = useState<'chats' | 'settings'>('chats')
  const [filter, setFilter] = useState<'all' | 'leads' | 'unread'>('all')
  const [chats, setChats] = useState<any[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
  const [thread, setThread] = useState<any[]>([])
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [notice, setNotice] = useState('')
  const [settings, setSettings] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [props, setProps] = useState<any[]>([])
  const [copied, setCopied] = useState(false)
  const [testing, setTesting] = useState(false)
  const threadEnd = useRef<HTMLDivElement>(null)

  useEffect(() => {
    init()
    return () => removeTestWidget()
  }, [])
  useEffect(() => { threadEnd.current?.scrollIntoView({ block: 'end' }) }, [thread])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data: biz } = await supabase.rpc('current_business_id')
    const bid = (biz as string) || user.id
    setBusinessId(bid)

    let { data: s } = await supabase.from('website_chat_settings').select('*').eq('business_id', bid).maybeSingle()
    if (!s) {
      const { data: created } = await supabase.from('website_chat_settings')
        .insert({ business_id: bid, assistant_name: 'Assistant', enabled: true }).select('*').single()
      s = created
    }
    setSettings(s)
    await Promise.all([loadChats(bid), loadProps(bid)])
    setLoading(false)

    const deep = new URLSearchParams(window.location.search).get('chat')
    if (deep) openChat(deep)
  }

  async function loadChats(bid = businessId) {
    if (!bid) return
    const { data } = await supabase.from('website_chats').select('*')
      .eq('business_id', bid).gt('message_count', 0)
      .order('last_message_at', { ascending: false }).limit(300)
    setChats(data ?? [])
  }

  async function loadProps(bid = businessId) {
    if (!bid) return
    const [{ data: str }, { data: est }] = await Promise.all([
      supabase.from('properties').select('id, name, city, location, show_on_website').eq('user_id', bid).order('name'),
      supabase.from('estate_properties').select('id, name, address, status, show_on_website').eq('user_id', bid).order('name'),
    ])
    setProps([
      ...(str ?? []).map(p => ({ ...p, table: 'properties', kind: 'Furnished apartment', where: p.city || p.location })),
      ...(est ?? []).map(p => ({ ...p, table: 'estate_properties', kind: 'Estate agency', where: p.address })),
    ])
  }

  async function openChat(id: string) {
    setOpenId(id)
    setReply('')
    setNotice('')
    const { data } = await supabase.from('website_chat_messages').select('*').eq('chat_id', id).order('created_at')
    setThread(data ?? [])
    const chat = chats.find(c => c.id === id)
    if (!chat || !chat.staff_read) {
      await supabase.from('website_chats').update({ staff_read: true }).eq('id', id)
      setChats(cs => cs.map(c => c.id === id ? { ...c, staff_read: true } : c))
    }
  }

  async function sendReply() {
    if (!openId || !reply.trim()) return
    setSending(true)
    setNotice('')
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/website-chat-reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
      body: JSON.stringify({ chat_id: openId, message: reply }),
    })
    const d = await res.json().catch(() => ({}))
    setSending(false)
    if (!res.ok) { setNotice(d.error || 'Could not send'); return }
    setReply('')
    setNotice('Email sent ✓')
    openChat(openId)
  }

  async function saveSettings() {
    if (!settings) return
    setSaving(true)
    const { error } = await supabase.from('website_chat_settings').update({
      enabled: settings.enabled,
      assistant_name: (settings.assistant_name || 'Assistant').trim(),
      company_name: settings.company_name?.trim() || null,
      knowledge: settings.knowledge?.trim() || null,
      alert_email: settings.alert_email?.trim() || null,
      currency: settings.currency || null,
      updated_at: new Date().toISOString(),
    }).eq('business_id', settings.business_id)
    setSaving(false)
    setNotice(error ? 'Could not save: ' + error.message : 'Saved ✓')
    setTimeout(() => setNotice(''), 2500)
  }

  async function toggleProp(p: any) {
    const next = !p.show_on_website
    setProps(ps => ps.map(x => x.id === p.id ? { ...x, show_on_website: next } : x))
    const { error } = await supabase.from(p.table).update({ show_on_website: next }).eq('id', p.id)
    if (error) setProps(ps => ps.map(x => x.id === p.id ? { ...x, show_on_website: !next } : x))
  }

  function removeTestWidget() {
    document.getElementById('opero-chat')?.remove()
    document.getElementById('opero-chat-test')?.remove()
    ;(window as any).__operoChatLoaded = false
  }
  function toggleTest() {
    if (testing) { removeTestWidget(); setTesting(false); return }
    if (!settings?.public_key) return
    const s = document.createElement('script')
    s.id = 'opero-chat-test'
    s.src = '/chat-widget.js?v=' + Date.now()
    s.setAttribute('data-key', settings.public_key)
    s.async = true
    s.onload = () => setTimeout(() => (window as any).OperoChat?.open(), 600)
    document.body.appendChild(s)
    setTesting(true)
  }

  const snippet = settings ? `<script src="${SITE}/chat-widget.js" data-key="${settings.public_key}" async></script>` : ''
  const shown = chats.filter(c => filter === 'all' ? true : filter === 'leads' ? (c.email || c.phone) : !c.staff_read)
  const open = chats.find(c => c.id === openId)
  const unread = chats.filter(c => !c.staff_read).length
  const leads = chats.filter(c => c.email || c.phone).length
  const liveCount = props.filter(p => p.show_on_website).length

  return (
    <div style={{ minHeight: '100vh', background: '#F7F8FA', fontFamily: "'Inter',sans-serif" }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #E4E7EC', padding: '0 28px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#98A2B3', textTransform: 'uppercase', letterSpacing: '0.06em' }}>STAFF CENTRE</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#101828' }}>Website Chats</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {([['chats', `Chats${unread ? ` (${unread})` : ''}`], ['settings', 'Settings & install']] as const).map(([k, l]) => (
            <button key={k} onClick={() => { setView(k); setNotice('') }} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid ' + (view === k ? ACCENT : '#D0D5DD'), background: view === k ? '#EEF1FF' : '#fff', color: view === k ? ACCENT : '#344054', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{l}</button>
          ))}
        </div>
      </div>

      {loading ? <div style={{ padding: 40, color: '#667085', fontSize: 13 }}>Loading…</div> : view === 'chats' ? (
        <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 16 }}>
            {[['Conversations', chats.length], ['Leads captured', leads], ['Unread', unread], ['Properties on website', liveCount]].map(([l, v]) => (
              <div key={l as string} style={{ ...card, padding: '14px 16px' }}>
                <div style={{ fontSize: 12, color: '#667085' }}>{l}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#101828' }}>{v}</div>
              </div>
            ))}
          </div>
          {settings && !settings.enabled && (
            <div style={{ background: '#FFFAEB', border: '1px solid #FEDF89', color: '#93370D', borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>
              The chat box is switched off, so it isn’t showing on your website. Turn it on in Settings & install.
            </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
            <div style={{ ...card, flex: '1 1 300px', maxWidth: 400, overflow: 'hidden' }}>
              <div style={{ display: 'flex', gap: 6, padding: 10, borderBottom: '1px solid #F2F4F7' }}>
                {(['all', 'leads', 'unread'] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)} style={{ padding: '5px 12px', borderRadius: 20, border: 'none', background: filter === f ? ACCENT : '#F2F4F7', color: filter === f ? '#fff' : '#344054', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' }}>{f}</button>
                ))}
              </div>
              <div style={{ maxHeight: 620, overflowY: 'auto' }}>
                {shown.length === 0 && (
                  <div style={{ padding: 24, fontSize: 13, color: '#667085', lineHeight: 1.6 }}>
                    {chats.length === 0 ? <>No website chats yet. Once the chat box is on your website, every conversation appears here. Set it up in <b>Settings & install</b>.</> : 'Nothing here.'}
                  </div>
                )}
                {shown.map(c => (
                  <button key={c.id} onClick={() => openChat(c.id)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 14px', border: 'none', borderBottom: '1px solid #F2F4F7', background: openId === c.id ? '#F5F7FF' : '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {!c.staff_read && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F04438', flexShrink: 0 }} />}
                      <span style={{ fontSize: 13, fontWeight: c.staff_read ? 500 : 700, color: '#101828', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name || 'Website visitor'}</span>
                      <span style={{ fontSize: 11, color: '#98A2B3', flexShrink: 0 }}>{ago(c.last_message_at)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#667085', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.summary || (c.interest ? INTEREST_LABEL[c.interest] : `${Math.ceil((c.message_count ?? 0) / 2)} question${c.message_count > 2 ? 's' : ''}`)}
                    </div>
                    {(c.email || c.phone) && <span style={{ display: 'inline-block', marginTop: 5, fontSize: 10.5, fontWeight: 700, color: '#027A48', background: '#ECFDF3', borderRadius: 10, padding: '2px 8px' }}>LEAD</span>}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ ...card, flex: '2 1 420px', minHeight: 420, display: 'flex', flexDirection: 'column' }}>
              {!open ? (
                <div style={{ margin: 'auto', fontSize: 13, color: '#98A2B3', padding: 40 }}>Select a conversation</div>
              ) : (<>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #F2F4F7' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#101828' }}>{open.name || 'Website visitor'}</div>
                  <div style={{ fontSize: 12, color: '#667085', marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: '4px 14px' }}>
                    {open.email && <a href={`mailto:${open.email}`} style={{ color: ACCENT }}>{open.email}</a>}
                    {open.phone && <a href={`tel:${open.phone}`} style={{ color: ACCENT }}>{open.phone}</a>}
                    {open.interest && <span>{INTEREST_LABEL[open.interest]}</span>}
                    <span>Started {new Date(open.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    {open.page_url && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>on {open.page_url.replace(/^https?:\/\//, '')}</span>}
                    {open.crm_contact_id && <a href="/staff-centre/crm" style={{ color: '#027A48', fontWeight: 600 }}>In CRM ✓</a>}
                  </div>
                  {open.summary && <div style={{ fontSize: 12.5, color: '#344054', background: '#F9FAFB', borderRadius: 8, padding: '7px 10px', marginTop: 8 }}>{open.summary}</div>}
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: 18, background: '#FCFCFD', display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 460 }}>
                  {thread.map(m => (
                    <div key={m.id} style={{ alignSelf: m.role === 'visitor' ? 'flex-start' : 'flex-end', maxWidth: '80%' }}>
                      <div style={{ fontSize: 10.5, color: '#98A2B3', marginBottom: 2, textAlign: m.role === 'visitor' ? 'left' : 'right' }}>
                        {m.role === 'visitor' ? (open.name || 'Visitor') : m.role === 'staff' ? `${m.meta?.by?.replace(/\s*\(.*\)$/, '') || 'Team'} · by email` : 'Assistant'} · {new Date(m.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div style={{ fontSize: 13, lineHeight: 1.5, padding: '9px 12px', borderRadius: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: m.role === 'visitor' ? '#fff' : m.role === 'staff' ? '#ECFDF3' : '#EEF1FF', border: '1px solid ' + (m.role === 'visitor' ? '#E4E7EC' : 'transparent'), color: '#101828' }}>
                        {m.content}
                        {m.meta?.cards?.length ? <div style={{ fontSize: 11, color: '#667085', marginTop: 4 }}>Showed {m.meta.cards.length} propert{m.meta.cards.length === 1 ? 'y' : 'ies'}</div> : null}
                        {m.meta?.form ? <div style={{ fontSize: 11, color: '#667085', marginTop: 4 }}>Asked for contact details: {m.meta.form}</div> : null}
                      </div>
                    </div>
                  ))}
                  <div ref={threadEnd} />
                </div>
                <div style={{ padding: 14, borderTop: '1px solid #F2F4F7' }}>
                  {open.email ? (<>
                    <textarea value={reply} onChange={e => setReply(e.target.value)} rows={3} placeholder={`Reply to ${open.name?.split(' ')[0] || 'the visitor'} by email…`} style={{ ...input, resize: 'vertical' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                      <button onClick={sendReply} disabled={sending || !reply.trim()} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: sending || !reply.trim() ? 0.6 : 1 }}>{sending ? 'Sending…' : 'Send email'}</button>
                      <span style={{ fontSize: 12, color: notice.includes('✓') ? '#027A48' : '#B42318' }}>{notice}</span>
                      <span style={{ fontSize: 11.5, color: '#98A2B3', marginLeft: 'auto' }}>Their reply comes to {settings?.alert_email || 'your login email'}</span>
                    </div>
                  </>) : open.phone ? (
                    <div style={{ fontSize: 13, color: '#344054' }}>They left a phone number only: <a href={`tel:${open.phone}`} style={{ color: ACCENT, fontWeight: 600 }}>{open.phone}</a></div>
                  ) : (
                    <div style={{ fontSize: 13, color: '#98A2B3' }}>This visitor didn’t leave contact details.</div>
                  )}
                </div>
              </>)}
            </div>
          </div>
        </div>
      ) : settings && (
        <div style={{ padding: 24, maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ ...card, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#101828' }}>Assistant</div>
                <div style={{ fontSize: 12.5, color: '#667085' }}>It answers from the information below and your live properties. It never makes up prices or promises.</div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#344054', cursor: 'pointer', flexShrink: 0 }}>
                <input type="checkbox" checked={!!settings.enabled} onChange={e => setSettings({ ...settings, enabled: e.target.checked })} /> On
              </label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12 }}>
              <div><label style={label}>Assistant name</label><input style={input} value={settings.assistant_name ?? ''} onChange={e => setSettings({ ...settings, assistant_name: e.target.value })} /></div>
              <div><label style={label}>Company name</label><input style={input} value={settings.company_name ?? ''} onChange={e => setSettings({ ...settings, company_name: e.target.value })} /></div>
              <div><label style={label}>Send lead alerts to</label><input style={input} type="email" placeholder="Your login email" value={settings.alert_email ?? ''} onChange={e => setSettings({ ...settings, alert_email: e.target.value })} /></div>
              <div><label style={label}>Property prices</label>
                <select style={input} value={settings.currency ?? ''} onChange={e => setSettings({ ...settings, currency: e.target.value })}>
                  {CURRENCIES.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={label}>What the assistant knows about your business</label>
              <textarea style={{ ...input, resize: 'vertical', lineHeight: 1.5 }} rows={12} value={settings.knowledge ?? ''} onChange={e => setSettings({ ...settings, knowledge: e.target.value })}
                placeholder="Services, locations, how it works, fees you’re happy to share, opening hours, FAQs, how to get in touch…" />
              <div style={{ fontSize: 11.5, color: '#98A2B3', marginTop: 4 }}>Only write things you’re happy for any visitor to read. Anything not here, it passes to your team.</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
              <button onClick={saveSettings} disabled={saving} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{saving ? 'Saving…' : 'Save'}</button>
              <button onClick={toggleTest} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #D0D5DD', background: '#fff', color: '#344054', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{testing ? 'Close test chat' : 'Try it here'}</button>
              <span style={{ fontSize: 12, color: notice.includes('✓') ? '#027A48' : '#B42318' }}>{notice}</span>
            </div>
          </div>

          <div style={{ ...card, padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#101828' }}>Add it to your website</div>
            <div style={{ fontSize: 12.5, color: '#667085', margin: '4px 0 12px', lineHeight: 1.6 }}>
              Paste this once into your website’s footer or “custom code” area (WordPress: a Custom HTML block or your theme’s footer scripts; Elementor: Site Settings → Custom Code; Wix/Squarespace: Custom Code → Body end). It then shows on every page.
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'stretch', flexWrap: 'wrap' }}>
              <code style={{ flex: '1 1 400px', background: '#101828', color: '#E4E7EC', borderRadius: 8, padding: '10px 12px', fontSize: 12, wordBreak: 'break-all' }}>{snippet}</code>
              <button onClick={() => { navigator.clipboard?.writeText(snippet); setCopied(true); setTimeout(() => setCopied(false), 2000) }} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: copied ? '#027A48' : ACCENT, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{copied ? 'Copied ✓' : 'Copy'}</button>
            </div>
          </div>

          <div style={{ ...card, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #F2F4F7' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#101828' }}>Properties the assistant can show</div>
              <div style={{ fontSize: 12.5, color: '#667085', marginTop: 2 }}>Switch on the ones visitors can ask about. Furnished apartments show their booked dates; estate agency ones only show while their status is “available”.</div>
            </div>
            {props.length === 0 && <div style={{ padding: 20, fontSize: 13, color: '#98A2B3' }}>No properties yet.</div>}
            {props.map(p => (
              <div key={p.table + p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px', borderBottom: '1px solid #F2F4F7' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#101828' }}>{p.name || 'Untitled'}</div>
                  <div style={{ fontSize: 11.5, color: '#98A2B3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{[p.kind, p.where, p.table === 'estate_properties' ? p.status : null].filter(Boolean).join(' · ')}</div>
                </div>
                <button onClick={() => toggleProp(p)} aria-pressed={!!p.show_on_website} style={{ width: 42, height: 24, borderRadius: 12, border: 'none', background: p.show_on_website ? ACCENT : '#D0D5DD', position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
                  <span style={{ position: 'absolute', top: 3, left: p.show_on_website ? 21 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left .15s' }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
