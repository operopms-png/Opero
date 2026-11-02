'use client'
// AI Command Centre -> Import. Paste a spreadsheet; the AI maps it to landlords, properties and tenants and
// queues one import in Approvals. Nothing is added until a team member approves it.
import React, { useState } from 'react'
import { C, CrmPage, CrmHeader, Body, btn, input } from '../../../../components/crm/Page'
import { staffApi } from '../../../../lib/staff-api'

export default function Import() {
  const [csv, setCsv] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState<any>(null)
  const go = async () => { setBusy(true); setErr(''); setDone(null); try { setDone(await staffApi('/api/ai-import', { csv })); setCsv('') } catch (e: any) { setErr(e.message) } setBusy(false) }
  const file = (f?: File) => { if (f) f.text().then(setCsv) }
  return (
    <CrmPage>
      <CrmHeader title="Import" subtitle="Move your existing records in. Upload or paste a spreadsheet saved as CSV. The AI maps it to landlords, properties and tenants and leaves the result in Approvals. Nothing is added until you approve it." />
      <Body>
        {err && <div style={{ color: C.red, marginBottom: 12 }}>{err}</div>}
        {done && <div style={{ background: C.hover, borderRadius: 6, padding: '10px 12px', marginBottom: 14, fontSize: 14 }}>Found {done.properties} propert{done.properties === 1 ? 'y' : 'ies'} and {done.tenants} tenant{done.tenants === 1 ? '' : 's'}. <a href="/staff-centre/ai-command-centre/approvals" style={{ color: '#1B2F6E', fontWeight: 600 }}>Review and approve in Approvals</a></div>}
        <div style={{ background: '#fff', border: '1px solid ' + C.border, borderRadius: 8, padding: 16, maxWidth: 820 }}>
          <input type="file" accept=".csv,text/csv,text/plain" onChange={e => file(e.target.files?.[0])} style={{ marginBottom: 10 }} />
          <textarea style={{ ...input, minHeight: 220, resize: 'vertical', fontFamily: 'monospace', fontSize: 12.5 }} placeholder="Or paste CSV here. Include a header row, for example: Property, Address, City, Bedrooms, Rent, Landlord, Landlord email, Tenant, Tenant email" value={csv} onChange={e => setCsv(e.target.value)} />
          <div style={{ marginTop: 10 }}><button style={btn('gold')} disabled={busy || csv.trim().length < 10} onClick={go}>{busy ? 'Reading…' : 'Read spreadsheet'}</button></div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 10 }}>Up to about 150 properties and 200 tenants at a time. The AI copies what is written and leaves gaps empty. Existing records with the same name or email are skipped.</div>
        </div>
      </Body>
    </CrmPage>
  )
}
