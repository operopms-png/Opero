'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { SITE_URL } from '@/lib/brand'

// Staff Centre -> Website Chats
// Every conversation from the AI chat box on the business's own website, the leads it captured,
// the assistant's settings, the install code, and which properties it can show.

const ACCENT = '#A8862E'
const SITE = SITE_URL
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

  const INK = '#323338', MUTED = '#676879', LINE = '#E6E9EF', BORDER = '#D0D4E4', CREAM = '#FBF4E6'
  const navBtn = (active: boolean): React.CSSProperties => ({ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', border: active ? `1px solid ${ACCENT}` : '1px solid transparent', borderRadius: 4, background: active ? CREAM : 'none', color: INK, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' })
  const INTEREST_COLOR: Record<string, string> = { rent_a_home: '#579BFC', list_property: '#00C875', guaranteed_rent: '#D0AE4C', invest: '#9D50DD', careers: '#66CCFF', other: '#C4C4C4' }
  const cardS: React.CSSProperties = { background: '#fff', border: `1px solid ${LINE}`, borderRadius: 8 }
  const inp: React.CSSProperties = { width: '100%', height: 36, padding: '0 10px', border: `1px solid ${BORDER}`, borderRadius: 4, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff' }
  const lab: React.CSSProperties = { fontSize: 13, color: MUTED, marginBottom: 4, display: 'block' }
  const Count = ({ n, red }: { n: number; red?: boolean }) => n ? (red ? <span style={{ background: '#DF2F4A', color: '#fff', fontSize: 11, fontWeight: 600, borderRadius: 9, padding: '0 7px' }}>{n}</span> : <span style={{ fontSize: 11.5, color: MUTED }}>{n}</span>) : null

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - var(--hub-h, 0px))', width: '100%', contain: 'inline-size', fontFamily: 'Figtree, Inter, -apple-system, sans-serif', color: INK, background: '#fff' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&display=swap'); .wc-nav:hover{background:#F5F6F8} .wc-row:hover{background:#F5F6F8} @media (max-width: 900px){ .wc-ws{display:none !important} }`}</style>

      <aside className="wc-ws" style={{ width: 232, flexShrink: 0, borderRight: `1px solid ${LINE}`, padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontSize: 13, color: MUTED, padding: '0 6px 10px' }}>Workspace</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 34, border: `1px solid ${BORDER}`, borderRadius: 4, padding: '0 8px', fontSize: 13.5, marginBottom: 12, whiteSpace: 'nowrap' }}>
          <span style={{ width: 20, height: 20, borderRadius: 4, background: '#D0AE4C', color: '#624920', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>S</span>Website Chats
        </div>
        <div style={{ fontSize: 12, color: MUTED, padding: '4px 10px' }}>Chats</div>
        <button className="wc-nav" onClick={() => { setView('chats'); setFilter('all') }} style={navBtn(view === 'chats' && filter === 'all')}><span style={{ flex: 1 }}>All chats</span><Count n={chats.length} /></button>
        <button className="wc-nav" onClick={() => { setView('chats'); setFilter('leads') }} style={navBtn(view === 'chats' && filter === 'leads')}><span style={{ width: 10, height: 10, borderRadius: 3, background: '#00C875' }} /><span style={{ flex: 1 }}>Leads captured</span><Count n={leads} /></button>
        <button className="wc-nav" onClick={() => { setView('chats'); setFilter('unread') }} style={navBtn(view === 'chats' && filter === 'unread')}><span style={{ width: 10, height: 10, borderRadius: 3, background: '#DF2F4A' }} /><span style={{ flex: 1 }}>Unread</span><Count n={unread} red /></button>
        <div style={{ fontSize: 12, color: MUTED, padding: '14px 10px 4px' }}>Setup</div>
        <button className="wc-nav" onClick={() => { setView('settings'); setNotice('') }} style={navBtn(view === 'settings')}><span style={{ flex: 1 }}>Settings & install</span></button>
        <div style={{ marginTop: 'auto', padding: 10, fontSize: 12.5, color: MUTED, lineHeight: 1.5 }}>
          Chat box: <b style={{ color: settings?.enabled ? '#00A35E' : '#DF2F4A' }}>{settings?.enabled ? 'On' : 'Off'}</b><br />{liveCount} propert{liveCount === 1 ? 'y' : 'ies'} on your website
        </div>
      </aside>

      {loading ? <div style={{ flex: 1, padding: 60, color: MUTED, textAlign: 'center' }}>Loading website chats…</div> : view === 'chats' ? (<>
        <div style={{ width: 360, flexShrink: 0, borderRight: `1px solid ${LINE}`, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ padding: '16px 18px 12px', borderBottom: `1px solid ${LINE}` }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 500 }}>{filter === 'all' ? 'All chats' : filter === 'leads' ? 'Leads captured' : 'Unread'}</h1>
              <span style={{ fontSize: 12.5, color: MUTED }}>{shown.length}</span>
            </div>
            {settings && !settings.enabled && <div style={{ marginTop: 10, background: CREAM, border: '1px solid #EADBB8', color: '#624920', borderRadius: 6, padding: '8px 10px', fontSize: 12.5 }}>The chat box is off, so it isn’t on your website. Turn it on in Settings & install.</div>}
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {shown.length === 0 && (
              <div style={{ padding: 24, fontSize: 13.5, color: MUTED, lineHeight: 1.6 }}>
                {chats.length === 0 ? <>No website chats yet. Once the chat box is on your website, every conversation appears here. Set it up in <b>Settings & install</b>.</> : 'Nothing here.'}
              </div>
            )}
            {shown.map(c => {
              const sel = openId === c.id
              return (
                <div key={c.id} className={sel ? '' : 'wc-row'} onClick={() => openChat(c.id)} style={{ padding: '12px 16px', borderBottom: `1px solid ${LINE}`, cursor: 'pointer', background: sel ? CREAM : '#fff', boxShadow: sel ? `inset 3px 0 0 ${ACCENT}` : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {!c.staff_read && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#DF2F4A', flexShrink: 0 }} />}
                    <span style={{ fontSize: 13.5, fontWeight: c.staff_read ? 500 : 700, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name || 'Website visitor'}</span>
                    <span style={{ fontSize: 11.5, color: MUTED, flexShrink: 0 }}>{ago(c.last_message_at)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, margin: '5px 0 3px', flexWrap: 'wrap' }}>
                    {(c.email || c.phone) && <span style={{ background: '#00C875', color: '#fff', fontSize: 11.5, borderRadius: 3, padding: '1px 8px' }}>Lead</span>}
                    {c.interest && <span style={{ background: INTEREST_COLOR[c.interest] ?? '#C4C4C4', color: '#fff', fontSize: 11.5, borderRadius: 3, padding: '1px 8px' }}>{INTEREST_LABEL[c.interest] ?? c.interest}</span>}
                    {c.crm_contact_id && <span style={{ background: '#D0AE4C', color: '#fff', fontSize: 11.5, borderRadius: 3, padding: '1px 8px' }}>In CRM</span>}
                  </div>
                  <div style={{ fontSize: 12.5, color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.summary || `${Math.ceil((c.message_count ?? 0) / 2)} question${c.message_count > 2 ? 's' : ''}`}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: '#F6F7FB' }}>
          {!open ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: MUTED, fontSize: 14 }}>
              <div style={{ width: 56, height: 56, borderRadius: 12, background: CREAM, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>💬</div>
              Pick a chat to read it
            </div>
          ) : (<>
            <div style={{ padding: '14px 24px', borderBottom: `1px solid ${LINE}`, background: '#fff' }}>
              <div style={{ fontSize: 20, fontWeight: 500 }}>{open.name || 'Website visitor'}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6, alignItems: 'center', fontSize: 12.5, color: MUTED }}>
                {open.email && <a href={`mailto:${open.email}`} style={{ color: ACCENT, textDecoration: 'none' }}>✉ {open.email}</a>}
                {open.phone && <a href={`tel:${open.phone}`} style={{ color: ACCENT, textDecoration: 'none' }}>☎ {open.phone}</a>}
                {open.interest && <span style={{ background: INTEREST_COLOR[open.interest] ?? '#C4C4C4', color: '#fff', borderRadius: 3, padding: '1px 8px' }}>{INTEREST_LABEL[open.interest]}</span>}
                {open.crm_contact_id && <a href="/staff-centre/crm" style={{ background: '#D0AE4C', color: '#fff', borderRadius: 3, padding: '1px 8px', textDecoration: 'none' }}>In CRM ✓</a>}
                <span>Started {new Date(open.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                {open.page_url && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 }}>on {open.page_url.replace(/^https?:\/\//, '')}</span>}
              </div>
              {open.summary && <div style={{ fontSize: 13, background: CREAM, border: '1px solid #EADBB8', borderRadius: 6, padding: '8px 10px', marginTop: 10 }}><b style={{ fontWeight: 600 }}>Summary:</b> {open.summary}</div>}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {thread.map(m => {
                const mine = m.role !== 'visitor'
                return (
                  <div key={m.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
                    <div style={{ fontSize: 11.5, color: MUTED, marginBottom: 3, textAlign: mine ? 'right' : 'left' }}>
                      {m.role === 'visitor' ? (open.name || 'Visitor') : m.role === 'staff' ? `${m.meta?.by?.replace(/\s*\(.*\)$/, '') || 'Team'} · by email` : 'Assistant'} · {new Date(m.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style={{ fontSize: 13.5, lineHeight: 1.5, padding: '10px 14px', borderRadius: 8, whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: m.role === 'visitor' ? '#fff' : m.role === 'staff' ? ACCENT : CREAM, color: m.role === 'staff' ? '#fff' : INK, border: m.role === 'visitor' ? `1px solid ${LINE}` : m.role === 'assistant' ? '1px solid #EADBB8' : 'none' }}>
                      {m.content}
                      {m.meta?.cards?.length ? <div style={{ fontSize: 11.5, opacity: 0.75, marginTop: 4 }}>Showed {m.meta.cards.length} propert{m.meta.cards.length === 1 ? 'y' : 'ies'}</div> : null}
                      {m.meta?.form ? <div style={{ fontSize: 11.5, opacity: 0.75, marginTop: 4 }}>Asked for contact details: {m.meta.form}</div> : null}
                    </div>
                  </div>
                )
              })}
              <div ref={threadEnd} />
            </div>
            <div style={{ padding: 16, background: '#fff', borderTop: `1px solid ${LINE}` }}>
              {open.email ? (<>
                <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: 10, display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                  <textarea value={reply} onChange={e => setReply(e.target.value)} rows={2} placeholder={`Reply to ${open.name?.split(' ')[0] || 'the visitor'} by email…`} style={{ flex: 1, border: 'none', outline: 'none', resize: 'none', fontSize: 13.5, fontFamily: 'inherit', color: INK }} />
                  <button onClick={sendReply} disabled={sending || !reply.trim()} style={{ height: 32, padding: '0 16px', borderRadius: 4, border: 'none', background: ACCENT, color: '#fff', fontSize: 13.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', opacity: sending || !reply.trim() ? 0.6 : 1 }}>{sending ? 'Sending…' : 'Send email'}</button>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 6, fontSize: 12, color: MUTED }}>
                  <span style={{ color: notice.includes('✓') ? '#00A35E' : '#DF2F4A' }}>{notice}</span>
                  <span style={{ marginLeft: 'auto' }}>Their reply comes to {settings?.alert_email || 'your login email'}</span>
                </div>
              </>) : open.phone ? (
                <div style={{ fontSize: 13.5 }}>They left a phone number only: <a href={`tel:${open.phone}`} style={{ color: ACCENT, fontWeight: 600 }}>{open.phone}</a></div>
              ) : (
                <div style={{ fontSize: 13.5, color: MUTED }}>This visitor didn’t leave contact details.</div>
              )}
            </div>
          </>)}
        </div>
      </>) : settings && (
        <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', background: '#F6F7FB' }}>
          <div style={{ height: 110, background: `linear-gradient(135deg, ${CREAM}, #F3E6C8)` }} />
          <div style={{ padding: '0 32px 40px', marginTop: -70, maxWidth: 960, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 500, color: '#624920' }}>Settings & install</h1>
              <div style={{ fontSize: 13.5, color: '#8A6B2E', marginTop: 2 }}>The AI chat box on your website: what it knows, where alerts go, and which properties it can show.</div>
            </div>
            <div style={{ ...cardS, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 500 }}>Assistant</div>
                  <div style={{ fontSize: 13, color: MUTED }}>It answers from the information below and your live properties. It never makes up prices or promises.</div>
                </div>
                <button onClick={() => setSettings({ ...settings, enabled: !settings.enabled })} style={{ height: 30, padding: '0 14px', borderRadius: 3, border: 'none', background: settings.enabled ? '#00C875' : '#C4C4C4', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>{settings.enabled ? 'On' : 'Off'}</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12 }}>
                <div><label style={lab}>Assistant name</label><input style={inp} value={settings.assistant_name ?? ''} onChange={e => setSettings({ ...settings, assistant_name: e.target.value })} /></div>
                <div><label style={lab}>Company name</label><input style={inp} value={settings.company_name ?? ''} onChange={e => setSettings({ ...settings, company_name: e.target.value })} /></div>
                <div><label style={lab}>Send lead alerts to</label><input style={inp} type="email" placeholder="Your login email" value={settings.alert_email ?? ''} onChange={e => setSettings({ ...settings, alert_email: e.target.value })} /></div>
                <div><label style={lab}>Property prices</label>
                  <select style={inp} value={settings.currency ?? ''} onChange={e => setSettings({ ...settings, currency: e.target.value })}>
                    {CURRENCIES.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <label style={lab}>What the assistant knows about your business</label>
                <textarea style={{ ...inp, height: 'auto', padding: 10, resize: 'vertical', lineHeight: 1.5 }} rows={12} value={settings.knowledge ?? ''} onChange={e => setSettings({ ...settings, knowledge: e.target.value })}
                  placeholder="Services, locations, how it works, fees you’re happy to share, opening hours, FAQs, how to get in touch…" />
                <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>Only write things you’re happy for any visitor to read. Anything not here, it passes to your team.</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
                <button onClick={saveSettings} disabled={saving} style={{ height: 34, padding: '0 18px', borderRadius: 4, border: 'none', background: ACCENT, color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{saving ? 'Saving…' : 'Save'}</button>
                <button onClick={toggleTest} style={{ height: 34, padding: '0 16px', borderRadius: 4, border: `1px solid ${BORDER}`, background: '#fff', color: INK, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit' }}>{testing ? 'Close test chat' : 'Try it here'}</button>
                <span style={{ fontSize: 12.5, color: notice.includes('✓') ? '#00A35E' : '#DF2F4A' }}>{notice}</span>
              </div>
            </div>

            <div style={{ ...cardS, padding: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 500 }}>Add it to your website</div>
              <div style={{ fontSize: 13, color: MUTED, margin: '4px 0 12px', lineHeight: 1.6 }}>
                Paste this once into your website’s footer or “custom code” area (WordPress: a Custom HTML block or your theme’s footer scripts; Elementor: Site Settings → Custom Code; Wix/Squarespace: Custom Code → Body end). It then shows on every page.
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'stretch', flexWrap: 'wrap' }}>
                <code style={{ flex: '1 1 400px', background: CREAM, border: '1px solid #EADBB8', color: '#624920', borderRadius: 6, padding: '10px 12px', fontSize: 12.5, wordBreak: 'break-all' }}>{snippet}</code>
                <button onClick={() => { navigator.clipboard?.writeText(snippet); setCopied(true); setTimeout(() => setCopied(false), 2000) }} style={{ padding: '0 16px', borderRadius: 4, border: 'none', background: copied ? '#00C875' : ACCENT, color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{copied ? 'Copied ✓' : 'Copy'}</button>
              </div>
            </div>

            <div style={{ ...cardS, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: `1px solid ${LINE}` }}>
                <div style={{ fontSize: 16, fontWeight: 500 }}>Properties the assistant can show</div>
                <div style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>Switch on the ones visitors can ask about. Furnished apartments show their booked dates; estate agency ones only show while their status is “available”.</div>
              </div>
              {props.length === 0 && <div style={{ padding: 20, fontSize: 13.5, color: MUTED }}>No properties yet.</div>}
              {props.map(p => (
                <div key={p.table + p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: `1px solid ${LINE}` }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 500 }}>{p.name || 'Untitled'}</div>
                    <div style={{ fontSize: 12, color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{[p.kind, p.where, p.table === 'estate_properties' ? p.status : null].filter(Boolean).join(' · ')}</div>
                  </div>
                  <button onClick={() => toggleProp(p)} aria-pressed={!!p.show_on_website} style={{ width: 110, height: 30, borderRadius: 3, border: 'none', background: p.show_on_website ? '#00C875' : '#C4C4C4', color: '#fff', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>{p.show_on_website ? 'On website' : 'Hidden'}</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
