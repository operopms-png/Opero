// Document reader: reads uploaded tenancy agreements (PDF or photo) and compares what the
// document says with the lease record. If they differ, it proposes correcting the record. A person
// checks the differences and approves; nothing on the record changes before that.
//   Property Management: pm_leases     Estate Agency: estate_tenancies
import { callClaudeWithDocument } from './claude'
import { queueAiAction } from './ai-approvals'
import { svc, freshCounts, enabledBusinesses } from './ai-proposal-utils'

export const LEASE_TABLES: Record<string, { rent: string; docs: string[]; label: string }> = {
  pm_leases: { rent: 'monthly_rent', docs: ['signed_document_url', 'document_url'], label: 'lease' },
  estate_tenancies: { rent: 'rent', docs: ['document_url'], label: 'tenancy' },
}
const MAX_BYTES = 8 * 1024 * 1024
const PER_RUN = 5

const isDate = (s: any) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s).getTime())
const pos = (n: any) => { const x = Number(n); return Number.isFinite(x) && x > 0 ? Math.round(x * 100) / 100 : null }

function parseJson(text?: string) {
  const m = text?.match(/\{[\s\S]*\}/)
  if (!m) return null
  try { return JSON.parse(m[0]) } catch { return null }
}

async function fetchDoc(url: string): Promise<{ base64: string; mediaType: string } | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length === 0 || buf.length > MAX_BYTES) return null
    const ct = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
    const ext = url.split('?')[0].split('.').pop()?.toLowerCase()
    const mediaType = ct === 'application/pdf' || ext === 'pdf' ? 'application/pdf' : ct === 'image/png' || ext === 'png' ? 'image/png' : ct === 'image/jpeg' || ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ''
    return mediaType ? { base64: buf.toString('base64'), mediaType } : null
  } catch { return null }
}

const SYSTEM = `You read tenancy agreements. Extract only what is written in the document. Never guess: use null for anything not clearly stated.
Reply with ONLY a JSON object:
{"is_tenancy_agreement": true|false, "monthly_rent": number|null, "deposit": number|null, "start_date": "YYYY-MM-DD"|null, "end_date": "YYYY-MM-DD"|null}
monthly_rent is the rent for one month (convert a weekly or yearly figure only if the document states the monthly equivalent, otherwise null). Numbers have no currency symbols or commas.`

export async function proposeLeaseDocs() {
  const db = svc()
  const result = freshCounts()
  const businesses = await enabledBusinesses('doc_reader')
  result.businesses = businesses.length

  for (const businessId of businesses) {
    let done = 0
    for (const [table, cfg] of Object.entries(LEASE_TABLES)) {
      if (done >= PER_RUN) break
      const cols = ['id', cfg.rent, 'deposit', 'start_date', 'end_date', ...cfg.docs].join(', ')
      const { data: rows } = await db.from(table).select(cols).eq('user_id', businessId).limit(200)
      for (const row of (rows ?? []) as any[]) {
        if (done >= PER_RUN) break
        const url = cfg.docs.map(c => row[c]).find((u: any) => typeof u === 'string' && u.startsWith('http'))
        if (!url) continue
        const key = `${table}:${row.id}:${url.slice(-40)}`
        const { data: seen } = await db.from('ai_pending_actions').select('id').eq('user_id', businessId).eq('action_type', 'lease_update').eq('payload->>doc_key', key).limit(1)
        if (seen?.length) continue
        done++
        const file = await fetchDoc(url)
        if (!file) { result.skipped++; continue }
        const { text, error } = await callClaudeWithDocument(SYSTEM, 'Extract the details as JSON.', file, 400)
        const out = parseJson(text)
        if (error || !out) { result.errors.push(`${table} ${row.id}: ${error ?? 'unreadable answer'}`); continue }

        // Record this document as read even when nothing differs, so it is not read again.
        const fields: Record<string, any> = {}, lines: string[] = []
        const check = (name: string, label: string, doc: any, rec: any, fmt: (v: any) => string) => {
          if (doc == null) return
          if (rec == null || String(rec).slice(0, 10) !== String(doc).slice(0, 10) && Number(rec) !== Number(doc)) {
            fields[name] = doc
            lines.push(`${label}: record ${rec == null || rec === '' ? 'empty' : fmt(rec)}, document ${fmt(doc)}`)
          }
        }
        if (out.is_tenancy_agreement === false) { result.skipped++; await markRead(businessId, key, table, row.id); continue }
        const rent = pos(out.monthly_rent), dep = pos(out.deposit)
        check('rent', 'Monthly rent', rent, row[cfg.rent], v => Number(v).toLocaleString('en-GB'))
        check('deposit', 'Deposit', dep, row.deposit, v => Number(v).toLocaleString('en-GB'))
        check('start_date', 'Start date', isDate(out.start_date) ? out.start_date : null, row.start_date, v => String(v).slice(0, 10))
        check('end_date', 'End date', isDate(out.end_date) ? out.end_date : null, row.end_date, v => String(v).slice(0, 10))
        if (!lines.length) { result.skipped++; await markRead(businessId, key, table, row.id); continue }

        const q = await queueAiAction({
          userId: businessId, agentKey: 'doc_reader', actionType: 'lease_update',
          title: `Check ${cfg.label} against its document`, draftBody: lines.join('\n'),
          payload: { table, id: row.id, fields, doc_key: key, doc_url: url },
          context: { summary: `The uploaded agreement differs from the ${cfg.label} record. Read the document before approving: approving changes the record to match it.`, doc_url: url },
        })
        if ('queued' in q) result.queued++; else result.skipped++
      }
    }
  }
  return result
}

// A rejected, zero-change marker so the same file is not sent to the AI again tomorrow.
async function markRead(businessId: string, key: string, table: string, id: string) {
  await svc().from('ai_pending_actions').insert({
    user_id: businessId, agent_key: 'doc_reader', action_type: 'lease_update', status: 'rejected', title: 'Document matches the record',
    draft_body: 'No differences found.', payload: { table, id, doc_key: key }, context: {}, decision_note: 'Checked automatically: no differences', decided_at: new Date().toISOString(),
  })
}
