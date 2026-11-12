'use client'
// Partners → Agent Programme: the links to send agents (sign-up and portal).
import { useEffect, useState } from 'react'
import { ownerFetch } from '@/lib/platform-fetch'

export default function AgentLinks() {
  const [urls, setUrls] = useState<{ signup: string; portal: string } | null>(null)
  const [copied, setCopied] = useState('')
  useEffect(() => { ownerFetch('/api/enquiry-link').then(r => { if (r.data?.agentUrl) setUrls({ signup: r.data.agentUrl, portal: r.data.agentUrl.replace(/\/agent-signup\/.*/, '/agent-portal') }) }).catch(() => {}) }, [])
  if (!urls) return null
  const copy = (k: string, v: string) => { navigator.clipboard?.writeText(v).then(() => { setCopied(k); setTimeout(() => setCopied(''), 1600) }).catch(() => {}) }
  const row = (k: string, label: string, hint: string, v: string) => (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 600 }}>{label} <span style={{ fontWeight: 400, color: '#8a857a' }}>{hint}</span></div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
        <input readOnly value={v} onFocus={e => e.currentTarget.select()} style={{ flex: '1 1 240px', minWidth: 0, padding: '7px 10px', border: '1px solid #ddd8cc', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }} />
        <button onClick={() => copy(k, v)} style={{ padding: '7px 14px', borderRadius: 6, border: 'none', background: '#191815', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{copied === k ? 'Copied' : 'Copy link'}</button>
        <a href={v} target="_blank" rel="noreferrer" style={{ padding: '7px 14px', borderRadius: 6, border: '1px solid #ddd8cc', fontSize: 13, textDecoration: 'none', color: 'inherit' }}>Open</a>
      </div>
    </div>)
  return (
    <div style={{ padding: '14px 18px', borderBottom: '1px solid #ebe7de', background: '#fcfbf8' }}>
      {row('s', 'Agent sign-up link', '(send to new agents; they create their login, then you press Activate)', urls.signup)}
      {row('p', 'Agent portal link', '(where approved agents sign in)', urls.portal)}
    </div>
  )
}
