'use client'
// AI Command Centre -> Chief of Staff. Plan the day, or tell the AI what you want done in plain English.
// It creates tasks on the Task board and email drafts in Approvals. Nothing is sent until a person approves.
import React, { useEffect, useState } from 'react'
import { C, CrmPage, CrmHeader, Body, Loading, btn, input } from '../../../../components/crm/Page'
import { staffApi } from '../../../../lib/staff-api'

const card: React.CSSProperties = { background: '#fff', border: '1px solid ' + C.border, borderRadius: 8, padding: 16, marginBottom: 16 }

export default function Chief() {
  const [plan, setPlan] = useState<any>(undefined)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [res, setRes] = useState<any>(null)
  useEffect(() => { staffApi('/api/ai-chief').then((d: any) => setPlan(d.plan)).catch(e => { setErr(e.message); setPlan(null) }) }, [])

  const make = async () => { setBusy('plan'); setErr(''); try { const d: any = await staffApi('/api/ai-chief', { action: 'plan' }); setPlan(d.plan) } catch (e: any) { setErr(e.message) } setBusy('') }
  const send = async () => { setBusy('ask'); setErr(''); setRes(null); try { setRes(await staffApi('/api/ai-chief', { instruction: text })); setText('') } catch (e: any) { setErr(e.message) } setBusy('') }
  const p = plan?.result

  return (
    <CrmPage>
      <CrmHeader title="Chief of Staff" subtitle="The AI plans the day from your records and turns your instructions into work. Tasks go to the Task board and emails wait in Approvals. Nothing is sent until a team member approves it."
        actions={<button style={btn('gold')} disabled={busy === 'plan'} onClick={make}>{busy === 'plan' ? 'Planning…' : "Plan today now"}</button>} />
      <Body>
        {err && <div style={{ color: C.red, marginBottom: 12 }}>{err}</div>}
        <div style={card}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Tell the AI what to do</div>
          <textarea style={{ ...input, minHeight: 80, resize: 'vertical' }} placeholder="For example: Chase all overdue rent this week, and email the landlord of 12 Park Road about the boiler service." value={text} onChange={e => setText(e.target.value)} />
          <div style={{ marginTop: 10 }}><button style={btn('gold')} disabled={busy === 'ask' || text.trim().length < 4} onClick={send}>{busy === 'ask' ? 'Working…' : 'Give instruction'}</button></div>
          {res && <div style={{ marginTop: 12, fontSize: 14, background: C.hover, borderRadius: 6, padding: '10px 12px' }}>{res.reply}<div style={{ color: C.muted, marginTop: 4 }}>{res.tasks} task{res.tasks === 1 ? '' : 's'} added to the <a href="/staff-centre/tasks" style={{ color: '#1B2F6E' }}>Task board</a> · {res.drafts} email draft{res.drafts === 1 ? '' : 's'} in <a href="/staff-centre/ai-command-centre/approvals" style={{ color: '#1B2F6E' }}>Approvals</a></div></div>}
          <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>Emails are only drafted to tenants and landlords on file, or to addresses you type into the instruction. Otherwise the AI makes a task for your team to send it.</div>
        </div>
        <div style={card}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Today&apos;s plan</div>
          {plan === undefined ? <Loading /> : !p ? <div style={{ color: C.muted, fontSize: 14 }}>No plan yet. Press &quot;Plan today now&quot;, or switch on the Chief of Staff agent to get one every morning.</div> : (
            <>
              <div style={{ fontSize: 14, marginBottom: 10 }}>{p.summary}</div>
              <div style={{ fontSize: 12, color: C.faint, marginBottom: 10 }}>Made {new Date(plan.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
              {p.steps.map((s: any, i: number) => <div key={i} style={{ borderTop: '1px solid ' + C.border, padding: '10px 0' }}><div style={{ fontWeight: 600, fontSize: 14 }}>{i + 1}. {s.title}</div><div style={{ fontSize: 13, color: C.muted }}>{s.why} {s.notes}</div></div>)}
            </>
          )}
        </div>
      </Body>
    </CrmPage>
  )
}
