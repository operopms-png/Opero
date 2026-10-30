import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'

// Tax and Compliance (Phase 1). Admins only. Three separate legal entities, each with its own
// obligations, Xero connection status and audit trail. Nothing here submits, pays or connects to a
// live service: Xero is shown as not connected until the owner authorises it.

const ENTITIES = [
  { code: 'holdings_uk', name: 'NOVOURQ Holdings Limited', country: 'UK', currency: 'GBP', role: 'Parent company tax and compliance',
    obligations: ['Corporation Tax', 'VAT (if applicable)', 'PAYE (if applicable)', 'National Insurance', 'Share transactions', 'Cross-border tax', 'Intercompany transactions', 'Annual filings'] },
  { code: 'uk_ops', name: 'NOVOURQ UK Limited', country: 'UK', currency: 'GBP', role: 'UK operating company tax and compliance',
    obligations: ['Corporation Tax', 'VAT', 'PAYE', 'National Insurance', 'SDLT / ATED', 'Business Rates', 'Property taxes', 'Annual filings'] },
  { code: 'jamaica_ops', name: 'NOVOURQ Jamaica Limited', country: 'JM', currency: 'JMD', role: 'Jamaican operating company tax and compliance',
    obligations: ['Corporate Income Tax', 'GCT', 'PAYE', 'NIS', 'Property Tax', 'NHT / Education Tax', 'HEART contributions', 'Transfer Tax / Stamp Duty'] },
]
const AGENT = 'finance_tax_director'
const SCOPES = [
  { key: 'read_deadlines', label: 'Read tax deadlines' },
  { key: 'read_accounting', label: 'Read accounting summaries (Xero, once connected)' },
  { key: 'draft_reports', label: 'Draft reports for your review' },
  { key: 'flag_risks', label: 'Flag compliance risks' },
]
const XERO = ['not_connected', 'pending_authorisation']
const REG = ['not_registered', 'incorporated', 'registered_for_tax']
const KINDS = ['dividend', 'loan', 'management_charge', 'other']

const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })

async function ensureSeeded(biz: string) {
  const { data: existing } = await db.from('legal_entities').select('id,code').eq('business_id', biz)
  const have = new Set((existing ?? []).map((e: any) => e.code))
  for (const e of ENTITIES) {
    if (!have.has(e.code)) {
      const { data: row } = await db.from('legal_entities').insert({ business_id: biz, code: e.code, name: e.name, country: e.country, currency: e.currency, role: e.role }).select('id').single()
      if (row) await db.from('tax_obligations').insert(e.obligations.map(t => ({ business_id: biz, entity_id: row.id, tax_type: t })))
    }
  }
  for (const s of SCOPES) await db.from('ai_agent_permissions').upsert({ business_id: biz, agent_key: AGENT, scope: s.key, granted: false }, { onConflict: 'business_id,agent_key,scope', ignoreDuplicates: true })
}

async function audit(biz: string, actor: string, action: string, entityId: string | null, detail: any) {
  await db.from('tax_audit_log').insert({ business_id: biz, entity_id: entityId, actor, action, detail })
}

export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  if (!c.isAdmin) return bad('Tax and Compliance is for admins only.', 403)
  await ensureSeeded(c.businessId)
  const [ents, obs, log, perms, appr, banks, xfers] = await Promise.all([
    db.from('legal_entities').select('*').eq('business_id', c.businessId).order('created_at'),
    db.from('tax_obligations').select('*').eq('business_id', c.businessId).order('created_at'),
    db.from('tax_audit_log').select('*').eq('business_id', c.businessId).order('created_at', { ascending: false }).limit(40),
    db.from('ai_agent_permissions').select('*').eq('business_id', c.businessId).eq('agent_key', AGENT),
    db.from('approvals').select('id,title,status,requested_by,created_at').eq('business_id', c.businessId).like('title', 'Tax:%').eq('status', 'pending'),
    db.from('entity_bank_accounts').select('*').eq('business_id', c.businessId).order('created_at'),
    db.from('intercompany_transfers').select('*').eq('business_id', c.businessId).order('transfer_date', { ascending: false }).limit(200),
  ])
  return NextResponse.json({
    entities: (ents.data ?? []).map((e: any) => ({ ...e, obligations: (obs.data ?? []).filter((o: any) => o.entity_id === e.id), banks: (banks.data ?? []).filter((b: any) => b.entity_id === e.id) })),
    transfers: xfers.data ?? [],
    audit: log.data ?? [],
    agent: { key: AGENT, name: 'Remick Vincent', role: 'Finance and Tax Director', scopes: SCOPES.map(s => ({ ...s, granted: !!(perms.data ?? []).find((p: any) => p.scope === s.key)?.granted })) },
    approvals: appr.data ?? [],
    xeroStatuses: XERO,
  })
}

export async function POST(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  if (!c.isAdmin) return bad('Tax and Compliance is for admins only.', 403)
  const biz = c.businessId
  const b = await req.json().catch(() => ({}))
  const actor = c.name || c.email

  if (b.action === 'obligation-save') {
    const { data: o } = await db.from('tax_obligations').select('*').eq('id', String(b.id || '')).eq('business_id', biz).maybeSingle()
    if (!o) return bad('Obligation not found', 404)
    const status = ['placeholder', 'verified', 'complete'].includes(b.status) ? b.status : o.status
    const sourceRef = String(b.source_ref ?? o.source_ref ?? '').trim() || null
    if (status !== 'placeholder' && !sourceRef) return bad('Add the official source and date before marking this verified or complete.')
    const patch = { status, due_date: b.due_date || null, payment_due_date: b.payment_due_date || null, frequency: String(b.frequency ?? o.frequency ?? '').slice(0, 100) || null, source_ref: sourceRef, notes: String(b.notes ?? o.notes ?? '').slice(0, 1000) || null, verified_by: status === 'placeholder' ? null : actor, verified_at: status === 'placeholder' ? null : new Date().toISOString() }
    const { error } = await db.from('tax_obligations').update(patch).eq('id', o.id)
    if (error) return bad(error.message, 500)
    await audit(biz, actor, 'obligation ' + status, o.entity_id, { tax_type: o.tax_type, due_date: patch.due_date, payment_due_date: patch.payment_due_date, source_ref: sourceRef })
    return NextResponse.json({ ok: true })
  }

  if (b.action === 'xero-save') {
    const status = String(b.xero_status || '')
    if (!XERO.includes(status)) return bad('Xero can only be set to not connected or pending authorisation here. A live connection is recorded only after authorisation.')
    const { data: e } = await db.from('legal_entities').select('id,name').eq('id', String(b.entity_id || '')).eq('business_id', biz).maybeSingle()
    if (!e) return bad('Company not found', 404)
    await db.from('legal_entities').update({ xero_status: status }).eq('id', e.id)
    await audit(biz, actor, 'xero status set to ' + status, e.id, { company: e.name })
    return NextResponse.json({ ok: true })
  }

  if (b.action === 'agent-grant') {
    const scope = SCOPES.find(s => s.key === b.scope)
    if (!scope) return bad('That permission is not available to this agent. Banking and payments are never granted here.')
    const granted = !!b.granted
    await db.from('ai_agent_permissions').upsert({ business_id: biz, agent_key: AGENT, scope: scope.key, granted, granted_by: granted ? actor : null, granted_at: granted ? new Date().toISOString() : null }, { onConflict: 'business_id,agent_key,scope' })
    await audit(biz, actor, (granted ? 'granted ' : 'revoked ') + scope.key, null, { agent: 'Remick Vincent' })
    return NextResponse.json({ ok: true })
  }

  if (b.action === 'request-approval') {
    const { data: e } = await db.from('legal_entities').select('id,name').eq('id', String(b.entity_id || '')).eq('business_id', biz).maybeSingle()
    if (!e) return bad('Company not found', 404)
    const title = `Tax: ${String(b.title || '').trim().slice(0, 150)}`
    if (title.length <= 5) return bad('Say what needs approval.')
    const { data, error } = await db.from('approvals').insert({ business_id: biz, kind: 'other', title, details: `${e.name}: ${String(b.details || '').slice(0, 1500)}`, module: 'company', requested_by: actor, requested_email: c.email, status: 'pending' }).select('id').single()
    if (error) return bad(error.message, 500)
    await audit(biz, actor, 'approval requested', e.id, { title })
    return NextResponse.json({ ok: true, id: data?.id })
  }

  if (b.action === 'registration-save') {
    const { data: e } = await db.from('legal_entities').select('id,name').eq('id', String(b.entity_id || '')).eq('business_id', biz).maybeSingle()
    if (!e) return bad('Company not found', 404)
    const status = REG.includes(b.registration_status) ? b.registration_status : null
    if (!status) return bad('Choose a registration status.')
    const patch = { registration_status: status, company_number: String(b.company_number || '').trim().slice(0, 50) || null, tax_registration_note: String(b.tax_registration_note || '').trim().slice(0, 300) || null }
    const { error } = await db.from('legal_entities').update(patch).eq('id', e.id)
    if (error) return bad(error.message, 500)
    await audit(biz, actor, 'registration set to ' + status, e.id, { company: e.name, company_number: patch.company_number })
    return NextResponse.json({ ok: true })
  }

  if (b.action === 'bank-add') {
    const { data: e } = await db.from('legal_entities').select('id,name').eq('id', String(b.entity_id || '')).eq('business_id', biz).maybeSingle()
    if (!e) return bad('Company not found', 404)
    const label = String(b.account_label || '').trim().slice(0, 100)
    if (!label) return bad('Name the account, for example "Operating account".')
    const currency = ['GBP', 'JMD', 'USD'].includes(b.currency) ? b.currency : null
    if (!currency) return bad('Choose a currency.')
    await db.from('entity_bank_accounts').insert({ business_id: biz, entity_id: e.id, bank_name: String(b.bank_name || '').trim().slice(0, 100) || null, account_label: label, currency, feed_status: 'not_connected' })
    await audit(biz, actor, 'bank account added', e.id, { company: e.name, account: label, currency })
    return NextResponse.json({ ok: true })
  }

  if (b.action === 'transfer-add') {
    const ids = [String(b.from_entity_id || ''), String(b.to_entity_id || '')]
    if (ids[0] === ids[1]) return bad('Choose two different companies.')
    const { data: es } = await db.from('legal_entities').select('id,name').eq('business_id', biz).in('id', ids)
    if ((es ?? []).length !== 2) return bad('Company not found', 404)
    const amount = Number(b.amount)
    if (!(amount > 0)) return bad('Enter an amount above zero.')
    if (!KINDS.includes(b.kind)) return bad('Choose the type of transfer.')
    const currency = ['GBP', 'JMD', 'USD'].includes(b.currency) ? b.currency : null
    if (!currency) return bad('Choose a currency.')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(b.transfer_date || ''))) return bad('Choose a date.')
    const { error } = await db.from('intercompany_transfers').insert({ business_id: biz, from_entity_id: ids[0], to_entity_id: ids[1], kind: b.kind, amount, currency, transfer_date: b.transfer_date, description: String(b.description || '').trim().slice(0, 300) || null, status: 'recorded' })
    if (error) return bad(error.message, 500)
    const names = Object.fromEntries((es ?? []).map((e: any) => [e.id, e.name]))
    await audit(biz, actor, 'intercompany ' + b.kind + ' recorded', ids[0], { from: names[ids[0]], to: names[ids[1]], amount, currency, date: b.transfer_date })
    return NextResponse.json({ ok: true })
  }

  if (b.action === 'transfer-review') {
    const { data: t } = await db.from('intercompany_transfers').select('id,from_entity_id,kind,amount,currency').eq('id', String(b.id || '')).eq('business_id', biz).maybeSingle()
    if (!t) return bad('Transfer not found', 404)
    await db.from('intercompany_transfers').update({ status: 'reviewed', reviewed_by: actor }).eq('id', t.id)
    await audit(biz, actor, 'intercompany transfer reviewed', t.from_entity_id, { kind: t.kind, amount: t.amount, currency: t.currency })
    return NextResponse.json({ ok: true })
  }

  return bad('Unknown action')
}
