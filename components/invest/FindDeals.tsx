'use client'
// Deal Analyser -> Find Deals: type what you want and where; the AI searches for real listings and learns from your choices.
import { useEffect, useState } from 'react'
import { staffApi } from '@/lib/staff-api'

type Brief = { id: string; text: string; criteria: any; active: boolean; last_run: string | null }
type Match = { id: string; brief_id: string; url: string; title: string; address: string | null; price: number | null; currency: string | null; beds: number | null; summary: string | null; fit_score: number | null; reason: string | null; status: string; deal_id: string | null }
const SYM: Record<string, string> = { GBP: '£', JMD: 'J$', USD: '$' }
const card: React.CSSProperties = { background: '#fff', border: '1px solid #E6E9EF', borderRadius: 8, padding: 20 }
const btn = (primary = false): React.CSSProperties => ({ padding: '8px 14px', borderRadius: 6, border: primary ? 'none' : '1px solid #D0D4E4', background: primary ? '#2F6DB5' : '#fff', color: primary ? '#fff' : '#344054', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' })

export default function FindDeals({ onSaved }: { onSaved?: () => void }) {
  const [text, setText] = useState('')
  const [briefs, setBriefs] = useState<Brief[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [learning, setLearning] = useState('')
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [link, setLink] = useState<{ token: string; active: boolean } | null>(null)
  const [copied, setCopied] = useState(false)
  const linkUrl = link ? `${typeof window !== 'undefined' ? window.location.origin : ''}/submit-deal/${link.token}` : ''
  const loadLink = () => staffApi<{ token: string; active: boolean }>('/api/deal-submit').then(setLink).catch(() => {})
  async function patchLink(body: any) {
    const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()
    const r = await fetch('/api/deal-submit', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` }, body: JSON.stringify(body) })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) { setErr(d.error || 'Something went wrong'); return }
    await loadLink()
  }
  const load = () => staffApi<{ briefs: Brief[]; matches: Match[]; learning: string }>('/api/deal-finder').then(d => { setBriefs(d.briefs); setMatches(d.matches); setLearning(d.learning) }).catch(e => setErr(e.message))
  useEffect(() => { load(); loadLink() }, [])

  async function search(id: string) {
    setBusy('search:' + id); setErr(''); setMsg('Searching the web for listings. This takes up to a minute.')
    try {
      const r = await staffApi<{ added: number; error?: string }>('/api/deal-finder', { action: 'search', briefId: id })
      setMsg(r.added ? `Found ${r.added} new listing${r.added === 1 ? '' : 's'}.` : 'Nothing new this time. Try widening the brief.')
      await load()
    } catch (e: any) { setErr(e.message); setMsg('') }
    setBusy('')
  }
  async function add() {
    setBusy('brief'); setErr(''); setMsg('')
    try {
      const r = await staffApi<{ id: string }>('/api/deal-finder', { action: 'brief', text })
      setText(''); await load(); await search(r.id)
    } catch (e: any) { setErr(e.message); setBusy('') }
  }
  async function act(action: string, body: any, after?: () => void) {
    setErr('')
    try { const r = await staffApi('/api/deal-finder', { action, ...body }); if (r.learning !== undefined) setLearning(r.learning); await load(); after?.() } catch (e: any) { setErr(e.message) }
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ fontSize: 18, fontWeight: 600, color: '#323338', marginBottom: 4 }}>Find Deals</div>
      <div style={{ fontSize: 13, color: '#676879', marginBottom: 16 }}>Tell the AI what you want and where. It searches for real listings every day. Like, pass or save each one and it learns your taste.</div>

      <div style={{ ...card, marginBottom: 16 }}>
        <label htmlFor="brief" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 6 }}>What are you looking for?</label>
        <textarea id="brief" rows={3} value={text} maxLength={1500} onChange={e => setText(e.target.value)} placeholder="e.g. 3-bed terraced house in Manchester under £150k for buy-to-let, at least 8% yield, needs light refurbishment"
          style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '1px solid #D0D4E4', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }} />
        <div style={{ marginTop: 10 }}><button onClick={add} disabled={busy !== '' || text.trim().length < 8} style={{ ...btn(true), opacity: busy || text.trim().length < 8 ? .6 : 1 }}>{busy === 'brief' ? 'Saving…' : 'Find deals'}</button></div>
      </div>

      {err && <div role="alert" style={{ color: '#B42318', fontSize: 13, marginBottom: 12 }}>{err}</div>}
      {msg && <div role="status" style={{ fontSize: 13, color: '#344054', background: '#EAF3FC', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>{msg}</div>}

      {briefs.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#323338', marginBottom: 8 }}>Your searches</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {briefs.map(b => (
              <div key={b.id} style={{ ...card, padding: 14, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200, fontSize: 13, color: '#323338' }}>{b.text}<div style={{ fontSize: 11, color: '#9699A6', marginTop: 2 }}>{b.last_run ? 'Last searched ' + new Date(b.last_run).toLocaleDateString('en-GB') : 'Not searched yet'} · {b.active ? 'Searching daily' : 'Paused'}</div></div>
                <button style={btn()} disabled={busy !== ''} onClick={() => search(b.id)}>{busy === 'search:' + b.id ? 'Searching…' : 'Search now'}</button>
                <button style={btn()} onClick={() => act('toggle', { briefId: b.id, active: !b.active })}>{b.active ? 'Pause' : 'Resume'}</button>
                <button style={{ ...btn(), color: '#B42318' }} onClick={() => act('delete', { briefId: b.id })}>Delete</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {learning && (
        <div style={{ ...card, background: '#F4F9FD', borderLeft: '4px solid #89CFF0', marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1D4E89', marginBottom: 6 }}>What the AI has learned about your taste</div>
          <div style={{ fontSize: 13, color: '#344054', whiteSpace: 'pre-wrap' }}>{learning}</div>
        </div>
      )}

      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#323338', marginBottom: 4 }}>Agent deal link</div>
        <div style={{ fontSize: 13, color: '#676879', marginBottom: 10 }}>Send this link to local agents and partners. Deals they submit land in Saved Deals at the Found stage, and you get an email.</div>
        {link ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input readOnly aria-label="Agent deal link" value={linkUrl} onFocus={e => e.currentTarget.select()} style={{ flex: 1, minWidth: 220, padding: '8px 10px', border: '1px solid #D0D4E4', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }} />
            <button style={btn(true)} onClick={() => { navigator.clipboard?.writeText(linkUrl); setCopied(true); setTimeout(() => setCopied(false), 2000) }}>{copied ? 'Copied' : 'Copy link'}</button>
            <button style={btn()} onClick={() => patchLink({ active: !link.active })}>{link.active ? 'Turn off' : 'Turn on'}</button>
            <button style={btn()} onClick={() => { if (window.confirm('This stops the old link working and makes a new one. Continue?')) patchLink({ regenerate: true }) }}>New link</button>
          </div>
        ) : <div style={{ fontSize: 13, color: '#9699A6' }}>Loading…</div>}
      </div>

      <div style={{ fontSize: 14, fontWeight: 600, color: '#323338', marginBottom: 8 }}>Matches</div>
      {matches.length === 0 ? <div style={{ ...card, textAlign: 'center', color: '#9699A6', padding: 40, fontSize: 13 }}>No matches yet. Describe what you want above.</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {matches.map(m => (
            <div key={m.id} style={card}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <a href={m.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 15, fontWeight: 600, color: '#2F6DB5' }}>{m.title}</a>
                {m.price ? <span style={{ fontSize: 14, fontWeight: 600 }}>{SYM[m.currency || 'GBP']}{Number(m.price).toLocaleString('en-GB')}</span> : null}
                {m.beds ? <span style={{ fontSize: 12, color: '#676879' }}>{m.beds} bed</span> : null}
                {m.fit_score != null && <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, background: '#EAF3FC', color: '#1D4E89', padding: '2px 8px', borderRadius: 20 }}>{m.fit_score}% fit</span>}
              </div>
              {m.address && <div style={{ fontSize: 12, color: '#676879', marginTop: 2 }}>{m.address}</div>}
              {m.summary && <div style={{ fontSize: 13, color: '#344054', marginTop: 8 }}>{m.summary}</div>}
              {m.reason && <div style={{ fontSize: 12, color: '#676879', marginTop: 4 }}>Why: {m.reason}</div>}
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                {m.status === 'saved'
                  ? <span style={{ fontSize: 12, color: '#0E7C55', fontWeight: 600 }}>Saved to Saved Deals</span>
                  : <button style={btn(true)} onClick={() => act('save', { matchId: m.id }, onSaved)}>Save to Saved Deals</button>}
                {m.status !== 'saved' && <button style={{ ...btn(), background: m.status === 'liked' ? '#E3F5EC' : '#fff' }} onClick={() => act('feedback', { matchId: m.id, verdict: 'like' })}>{m.status === 'liked' ? 'Liked' : 'Like'}</button>}
                {m.status !== 'saved' && <button style={btn()} onClick={() => { const note = window.prompt('Why not? (optional, helps the AI learn)') ; act('feedback', { matchId: m.id, verdict: 'pass', note: note || '' }) }}>Pass</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
