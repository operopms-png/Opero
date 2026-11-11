'use client'
// Staff Centre → Tenant onboarding: the documents every new tenant gets, and who has been sent / has signed them.
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { CrmPage, CrmHeader, Body, Stat, Pill, Empty, Loading, btn, input, C } from '../../../components/crm/Page'

async function api(url: string, init?: RequestInit) {
  const { data: { session } } = await supabase.auth.getSession()
  const r = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` } })
  return { ok: r.ok, data: await r.json().catch(() => ({})) }
}

export default function TenantOnboardingPage() {
  const [d, setD] = useState<any>(null); const [q, setQ] = useState(''); const [busy, setBusy] = useState(''); const [msg, setMsg] = useState('')
  const load = () => api('/api/tenancy-pack?overview=1').then(r => { if (r.ok) setD(r.data); else setMsg(r.data?.error || 'Could not load.') })
  useEffect(() => { load() }, [])
  async function send(t: any) {
    setBusy(t.id); setMsg('')
    const r = await api('/api/tenancy-pack', { method: 'POST', body: JSON.stringify({ kind: t.kind, id: t.id }) }); setBusy('')
    if (!r.ok) { setMsg(r.data?.error || 'Could not send.'); return }
    setMsg(r.data.made ? `Sent ${r.data.made} document${r.data.made > 1 ? 's' : ''} to ${t.name}. They show in the Onboarding tab of their portal and on their link.` : `${t.name} already has everything.`); load()
  }
  if (!d) return <CrmPage><CrmHeader title="Tenant onboarding" subtitle="" />{msg ? <Body><div style={{ color: C.red }}>{msg}</div></Body> : <Loading />}</CrmPage>
  const total = d.items.filter((i: any) => i.type === 'doc').length
  const list = d.tenants.filter((t: any) => !q || (t.name || '').toLowerCase().includes(q.toLowerCase()))
  return (
    <CrmPage>
      <CrmHeader title="Tenant onboarding" subtitle="The documents every new tenant gets in one tab, to view and sign. Press Send pack on a tenant and it appears in their portal and on their secure link."
        actions={<><button style={btn('ghost')} onClick={() => { window.location.href = '/staff-centre/documents/templates' }}>Edit templates</button><button style={btn('ghost')} onClick={() => { window.location.href = '/staff-centre/documents' }}>Bank accounts</button></>} />
      <Body>
        <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, padding: 14, marginBottom: 14 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>What is in the pack</div>
          {d.items.map((i: any, n: number) => <div key={i.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: n ? '1px solid #F0F1F4' : 'none', fontSize: 14 }}><span>{n + 1}. {i.title}</span><Pill color={i.type === 'file' ? C.grey : C.blue}>{i.type === 'file' ? 'PDF to read' : 'Template'}</Pill></div>)}
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 8 }}>The information sheet, lease agreement, payment instructions and welcome letter are templates you can edit under Documents, Templates. Bank details in them come from Documents, Bank accounts.</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 14 }}>
          <Stat label="Tenants" value={d.tenants.length} /><Stat label="Pack not sent" value={d.tenants.filter((t: any) => t.sent === 0).length} /><Stat label="Fully signed" value={d.tenants.filter((t: any) => t.sent > 0 && t.signed >= 2).length} />
        </div>
        <input style={{ ...input, maxWidth: 300, marginBottom: 12 }} placeholder="Search tenant" value={q} onChange={e => setQ(e.target.value)} />
        {msg && <div style={{ fontSize: 13, color: C.muted, marginBottom: 10 }}>{msg}</div>}
        {list.length === 0 ? <Empty>No tenants yet.</Empty> : list.map((t: any) => (
          <div key={t.kind + t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 14px', marginBottom: 8 }}>
            <div><div style={{ fontWeight: 600 }}>{t.name} <span style={{ fontSize: 12, color: C.muted, fontWeight: 400 }}>· {t.kind === 'pm_tenant' ? 'Property Management' : 'Estate Agency'}</span></div><div style={{ fontSize: 12.5, color: C.muted }}>{t.sent === 0 ? 'Pack not sent yet' : `${t.sent} of ${total} sent · ${t.signed} signed`}</div></div>
            <button style={btn(t.sent >= total ? 'ghost' : 'gold', true)} disabled={busy === t.id} onClick={() => send(t)}>{busy === t.id ? 'Sending…' : t.sent >= total ? 'Resend missing' : 'Send pack'}</button>
          </div>))}
      </Body>
    </CrmPage>
  )
}
