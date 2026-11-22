'use client'
// Staff Centre → Company Setup: step-by-step plans (for example registering a US parent company),
// with a status, owner, due date, cost, notes and documents on every step. Admins only unless ticked in Team Management.
import React, { useEffect, useRef, useState } from 'react'
import { C, CrmPage, CrmHeader, Body, Loading, Empty, btn, input } from '../../../components/crm/Page'
import { staffApi } from '../../../lib/staff-api'
import { supabase } from '../../../lib/supabase'

const STATUS: Record<string, { label: string; color: string }> = { todo: { label: 'To do', color: '#9699A6' }, doing: { label: 'In progress', color: '#FDAB3D' }, done: { label: 'Done', color: '#00C875' } }
const size = (n: number | null) => n == null ? '' : n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'

export default function CompanySetup() {
  const [plans, setPlans] = useState<any[] | null>(null)
  const [sel, setSel] = useState<string | null>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [stepTitle, setStepTitle] = useState('')
  const [open, setOpen] = useState<string | null>(null)

  const load = () => staffApi<{ plans: any[] }>('/api/company-setup').then(d => { setPlans(d.plans); setSel(s => s && d.plans.some(p => p.id === s) ? s : d.plans[0]?.id ?? null); setErr('') }).catch(e => setErr(e.message))
  useEffect(() => { load() }, [])
  const act = async (body: any, then?: () => void) => { setErr(''); try { await staffApi('/api/company-setup', body); await load(); then?.() } catch (e: any) { setErr(e.message) } }
  const upload = async (stepId: string, file: File) => {
    setBusy(stepId); setErr('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const fd = new FormData(); fd.append('step_id', stepId); fd.append('file', file)
      const res = await fetch('/api/company-setup', { method: 'POST', headers: { Authorization: `Bearer ${session?.access_token ?? ''}` }, body: fd })
      const d = await res.json().catch(() => ({}))
      if (!res.ok || d.error) throw new Error(d.error || 'Upload failed')
      await load()
    } catch (e: any) { setErr(e.message) } finally { setBusy('') }
  }

  const plan = (plans ?? []).find(p => p.id === sel)
  const done = plan ? plan.steps.filter((s: any) => s.status === 'done').length : 0
  const total = plan ? plan.steps.length : 0

  return (
    <CrmPage>
      <CrmHeader title="Company Setup" subtitle="Step-by-step plans for setting up and running the company itself, with the documents for each step stored with it. Only admins see this unless an admin ticks Company Setup for someone in Team Management." />
      <Body>
        {err && <div style={{ color: C.red, marginBottom: 12 }}>{err}</div>}
        {!plans ? (!err && <Loading />) : (
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {plans.map(p => <button key={p.id} onClick={() => setSel(p.id)} style={{ ...btn(sel === p.id ? 'gold' : 'ghost', true) }}>{p.title}</button>)}
              <button style={btn('ghost', true)} onClick={() => act({ action: 'create-plan', template: 'us-parent' })}>+ Start the US registration plan</button>
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Or name a blank plan" style={{ ...input, width: 220 }} />
              <button style={{ ...btn('ghost', true), opacity: newTitle.trim() ? 1 : 0.6 }} disabled={!newTitle.trim()} onClick={() => act({ action: 'create-plan', title: newTitle }, () => setNewTitle(''))}>Add plan</button>
            </div>

            {!plan ? <Empty>No plans yet. Start the US registration plan above, or name a blank plan of your own.</Empty> : (
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ background: '#fff', border: '1px solid ' + C.border, borderRadius: 8, padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: C.ink }}>{plan.title}</div>
                      {plan.summary && <div style={{ fontSize: 13, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>{plan.summary}</div>}
                    </div>
                    <button style={btn('danger', true)} onClick={() => { if (confirm('Delete this plan, its steps and every document stored on them? This cannot be undone.')) act({ action: 'delete-plan', id: plan.id }) }}>Delete plan</button>
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, height: 8, background: '#E6E9EF', borderRadius: 4 }}><div style={{ width: total ? `${(done / total) * 100}%` : 0, height: 8, borderRadius: 4, background: C.green }} /></div>
                    <div style={{ fontSize: 13, color: C.muted, whiteSpace: 'nowrap' }}>{done} of {total} done</div>
                  </div>
                </div>

                {plan.steps.map((s: any, i: number) => (
                  <Step key={s.id} s={s} n={i + 1} isOpen={open === s.id} busy={busy === s.id} last={i === total - 1}
                    onToggle={() => setOpen(o => o === s.id ? null : s.id)}
                    onSave={(patch: any) => act({ action: 'update-step', id: s.id, ...patch })}
                    onMove={(dir: string) => act({ action: 'move-step', id: s.id, dir })}
                    onDelete={() => { if (confirm('Delete this step and its documents?')) act({ action: 'delete-step', id: s.id }) }}
                    onUpload={(f: File) => upload(s.id, f)}
                    onDeleteFile={(id: string) => { if (confirm('Delete this document?')) act({ action: 'delete-file', id }) }} />
                ))}

                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={stepTitle} onChange={e => setStepTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && stepTitle.trim() && act({ action: 'add-step', plan_id: plan.id, title: stepTitle }, () => setStepTitle(''))} placeholder="Add a step" style={input} />
                  <button style={{ ...btn('gold'), opacity: stepTitle.trim() ? 1 : 0.6 }} disabled={!stepTitle.trim()} onClick={() => act({ action: 'add-step', plan_id: plan.id, title: stepTitle }, () => setStepTitle(''))}>Add step</button>
                </div>
              </div>
            )}
          </div>
        )}
      </Body>
    </CrmPage>
  )
}

function Step({ s, n, isOpen, busy, last, onToggle, onSave, onMove, onDelete, onUpload, onDeleteFile }: any) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [f, setF] = useState({ owner: s.owner ?? '', due_date: s.due_date ?? '', cost: s.cost ?? '', notes: s.notes ?? '' })
  useEffect(() => { setF({ owner: s.owner ?? '', due_date: s.due_date ?? '', cost: s.cost ?? '', notes: s.notes ?? '' }) }, [s.owner, s.due_date, s.cost, s.notes])
  const st = STATUS[s.status] ?? STATUS.todo
  const dirty = f.owner !== (s.owner ?? '') || f.due_date !== (s.due_date ?? '') || f.cost !== (s.cost ?? '') || f.notes !== (s.notes ?? '')
  return (
    <div style={{ background: '#fff', border: '1px solid ' + C.border, borderLeft: '4px solid ' + st.color, borderRadius: 8 }}>
      <div onClick={onToggle} style={{ padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer', flexWrap: 'wrap' }}>
        <div style={{ width: 26, height: 26, borderRadius: 13, background: s.status === 'done' ? C.green : '#EAF3FC', color: s.status === 'done' ? '#fff' : C.gold, fontSize: 12.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{s.status === 'done' ? '✓' : n}</div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ fontWeight: 600, fontSize: 14.5, color: C.ink, textDecoration: s.status === 'done' ? 'line-through' : 'none' }}>{s.title}</div>
          <div style={{ fontSize: 12, color: C.faint, marginTop: 2 }}>{[s.owner, s.due_date && 'Due ' + new Date(s.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }), s.cost, s.files.length ? `${s.files.length} document${s.files.length > 1 ? 's' : ''}` : null].filter(Boolean).join(' · ')}</div>
        </div>
        <select value={s.status} onClick={e => e.stopPropagation()} onChange={e => onSave({ status: e.target.value })} style={{ ...input, width: 130, color: st.color, fontWeight: 600 }}>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>
      {isOpen && (
        <div style={{ padding: '0 14px 14px', display: 'grid', gap: 10, borderTop: '1px solid ' + C.row }}>
          {s.details && <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.55, paddingTop: 10 }}>{s.details}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
            <label style={{ fontSize: 12, color: C.muted }}>Owner<input value={f.owner} onChange={e => setF({ ...f, owner: e.target.value })} placeholder="Who is doing it" style={input} /></label>
            <label style={{ fontSize: 12, color: C.muted }}>Due date<input type="date" value={f.due_date} onChange={e => setF({ ...f, due_date: e.target.value })} style={input} /></label>
            <label style={{ fontSize: 12, color: C.muted }}>Cost<input value={f.cost} onChange={e => setF({ ...f, cost: e.target.value })} placeholder="For example $300" style={input} /></label>
          </div>
          <label style={{ fontSize: 12, color: C.muted }}>Notes<textarea value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} rows={3} placeholder="References, who you spoke to, what is still needed" style={{ ...input, resize: 'vertical' }} /></label>
          <div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>Documents for this step</div>
            {s.files.length === 0 && <div style={{ fontSize: 13, color: C.faint, marginBottom: 6 }}>Nothing stored yet.</div>}
            <div style={{ display: 'grid', gap: 6 }}>
              {s.files.map((d: any) => (
                <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', border: '1px solid ' + C.row, borderRadius: 6, padding: '7px 10px', fontSize: 13 }}>
                  <div style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.url ? <a href={d.url} target="_blank" rel="noreferrer" style={{ color: C.gold, fontWeight: 600 }}>{d.name}</a> : d.name}<span style={{ color: C.faint }}> · {size(d.size)}{d.uploaded_by ? ' · ' + d.uploaded_by : ''}</span></div>
                  <button style={btn('danger', true)} onClick={() => onDeleteFile(d.id)}>Delete</button>
                </div>))}
            </div>
            <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={e => { const file = e.target.files?.[0]; if (file) onUpload(file); e.target.value = '' }} />
            <button style={{ ...btn('ghost', true), marginTop: 8 }} disabled={busy} onClick={() => fileRef.current?.click()}>{busy ? 'Uploading…' : '+ Add a document'}</button>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button style={{ ...btn('gold', true), opacity: dirty ? 1 : 0.5 }} disabled={!dirty} onClick={() => onSave({ owner: f.owner, due_date: f.due_date, cost: f.cost, notes: f.notes })}>Save changes</button>
            {n > 1 && <button style={btn('ghost', true)} onClick={() => onMove('up')}>Move up</button>}
            {!last && <button style={btn('ghost', true)} onClick={() => onMove('down')}>Move down</button>}
            <button style={btn('danger', true)} onClick={onDelete}>Delete step</button>
          </div>
        </div>
      )}
    </div>
  )
}
