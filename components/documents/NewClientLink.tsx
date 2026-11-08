'use client'
// Staff Centre → Documents → "New client link": a private page for someone who is not in the system yet.
import { useEffect, useState } from 'react'
import { C, Modal, btn, input, label } from '../crm/Page'
import { ownerFetch } from '@/lib/platform-fetch'

const STATUS: Record<string, [string, string, string]> = { open: ['Not opened', '#F2F4F7', '#667085'], started: ['In progress', '#FFF4E0', '#B54708'], done: ['Finished', '#E7F6EC', '#067647'] }

export default function NewClientLink({ onClose }: { onClose: () => void }) {
  const [templates, setTemplates] = useState<any[]>([])
  const [links, setLinks] = useState<any[]>([])
  const [f, setF] = useState({ kind: 'owner', module: 'pm', template_id: '', name: '', email: '', property_label: '', ask_docs: true })
  const [out, setOut] = useState<{ url: string; whatsapp: string } | null>(null)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const loadLinks = () => ownerFetch('/api/onboarding-links').then(r => { if (r.ok) setLinks(r.data.links || []) })
  useEffect(() => { ownerFetch('/api/documents?templates=1').then(r => { if (r.ok) setTemplates((r.data.templates || []).filter((t: any) => t.active && t.needs_signature)) }); loadLinks() }, [])
  const set = (k: string, v: any) => setF(x => ({ ...x, [k]: v }))
  const copy = (t: string) => { try { navigator.clipboard.writeText(t); setMsg('Copied.') } catch { setMsg('Select the text and copy it.') } }
  async function create() {
    setBusy(true); setMsg(''); setOut(null)
    const r = await ownerFetch('/api/onboarding-links', { method: 'POST', body: JSON.stringify({ ...f, template_id: f.template_id || undefined }) })
    setBusy(false)
    if (!r.ok) { setMsg(r.data?.error || 'Could not create the link.'); return }
    setOut(r.data); loadLinks()
  }
  return (
    <Modal title="New client link" onClose={onClose} width={560}>
      <div style={{ padding: 22 }}>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 10 }}>For someone who is not in the system yet. They open the link, add their details, upload documents and sign. Their owner or tenant record is created for you.</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={label} htmlFor="ncl-kind">They are</label><select id="ncl-kind" style={input} value={f.kind} onChange={e => set('kind', e.target.value)}><option value="owner">An owner</option><option value="tenant">A tenant</option></select></div>
          <div><label style={label} htmlFor="ncl-mod">Added to</label><select id="ncl-mod" style={input} value={f.module} onChange={e => set('module', e.target.value)}><option value="pm">Property Management</option><option value="ea">Estate Agency</option></select></div>
        </div>
        <label style={{ ...label, marginTop: 10 }} htmlFor="ncl-tpl">Contract they sign</label>
        <select id="ncl-tpl" style={input} value={f.template_id} onChange={e => set('template_id', e.target.value)}><option value="">None (details and documents only)</option>{templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
          <div><label style={label} htmlFor="ncl-name">Name (optional)</label><input id="ncl-name" style={input} value={f.name} onChange={e => set('name', e.target.value)} /></div>
          <div><label style={label} htmlFor="ncl-email">Email (optional)</label><input id="ncl-email" style={input} value={f.email} onChange={e => set('email', e.target.value)} /></div>
        </div>
        <label style={{ ...label, marginTop: 10 }} htmlFor="ncl-prop">Property (optional)</label><input id="ncl-prop" style={input} value={f.property_label} onChange={e => set('property_label', e.target.value)} />
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '12px 0', fontSize: 13.5 }}><input type="checkbox" checked={f.ask_docs} onChange={e => set('ask_docs', e.target.checked)} />Ask them to upload their ID and documents</label>
        <button style={btn('gold')} disabled={busy} onClick={create}>{busy ? 'Creating…' : 'Create link'}</button>
        {msg && <div style={{ marginTop: 10, fontSize: 13, color: C.muted }}>{msg}</div>}
        {out && <div style={{ marginTop: 12, background: '#F2F7FD', border: '1px solid #C9D6E6', borderRadius: 8, padding: 12, fontSize: 13 }}>
          <div style={{ wordBreak: 'break-all', fontWeight: 600 }}>{out.url}</div>
          <div style={{ color: '#475467', margin: '6px 0 8px' }}>{out.whatsapp}</div>
          <button style={btn('ghost', true)} onClick={() => copy(out.url)}>Copy link</button> <button style={btn('ghost', true)} onClick={() => copy(out.whatsapp)}>Copy WhatsApp message</button>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>Valid 14 days. Anyone with the link can fill it in, so send it only to that person.</div>
        </div>}
        {links.length > 0 && <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: C.muted, marginBottom: 6 }}>Recent links</div>
          {links.slice(0, 8).map(l => { const s = l.expired ? ['Expired', '#FEE4E2', '#B42318'] : STATUS[l.status] || STATUS.open; return (
            <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '7px 0', borderTop: '1px solid #F0F1F4', fontSize: 13 }}>
              <span>{l.name || 'No name yet'} · {l.kind === 'owner' ? 'Owner' : 'Tenant'} · {l.module === 'pm' ? 'PM' : 'Estate'}</span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 10, background: s[1], color: s[2], whiteSpace: 'nowrap' }}>{s[0]}</span>
            </div>) })}
        </div>}
      </div>
    </Modal>
  )
}
