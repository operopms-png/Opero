import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { serviceClient } from '@/lib/admin-auth'
import { alertTeam } from '@/lib/crm-lead'
import { LISTINGS_BUSINESS_ID } from '@/lib/listings'

// NOVOURQ mobile app API. Signed in with the app's Supabase session (Bearer token).
//   GET  ?role=guest|tenant|owner|partner|cohost|business|staff   -> { roles, role, name, email, home }
//        (role omitted = the person's main role)
//   POST {action:'message', role, text}          -> message to the team (tenant/owner chats, else team alert)
//   POST {action:'repair', title, description}   -> tenant repair request
//   POST {action:'messages', role}               -> chat history (tenant/owner)
//   POST {action:'delete-account'}               -> deletes this login (Apple requirement)
// One sign-in for everyone: what you see comes from the records linked to your email.

export const dynamic = 'force-dynamic'
type Role = 'business' | 'staff' | 'cohost' | 'owner' | 'partner' | 'tenant' | 'guest'
const ORDER: Role[] = ['staff', 'business', 'cohost', 'owner', 'partner', 'tenant', 'guest']
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' }
const json = (body: any, status = 200) => NextResponse.json(body, { status, headers: CORS })
const bad = (error: string, status = 400) => json({ error }, status)
const n = (v: any) => Number(v) || 0
const OWNER_SHARE = 0.6 // owner share of guest revenue, same as the Partners and Owner portals
const today = () => new Date().toISOString().slice(0, 10)
const addDays = (d: number) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10)

async function who(req: NextRequest) {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  if (!token) return null
  const asUser = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { global: { headers: { Authorization: `Bearer ${token}` } } })
  const { data: { user } } = await asUser.auth.getUser(token)
  if (!user) return null
  const email = (user.email ?? '').toLowerCase()
  const [tm, op, ll, tn, bk, ch, sub] = await Promise.all([
    email ? serviceClient.from('team_members').select('user_id,role,name,status').ilike('email', email).order('created_at', { ascending: false }).limit(1) : Promise.resolve({ data: [] } as any),
    serviceClient.from('owner_profiles').select('*').or(`user_id.eq.${user.id}${email ? `,email.ilike.${email}` : ''}`).limit(1),
    serviceClient.from('pm_landlords').select('*').or(`portal_user_id.eq.${user.id}${email ? `,email.ilike.${email}` : ''}`).limit(1),
    serviceClient.from('pm_tenants').select('*').or(`portal_user_id.eq.${user.id}${email ? `,email.ilike.${email}` : ''}`).order('created_at', { ascending: false }).limit(1),
    email ? serviceClient.from('bookings').select('id', { count: 'exact', head: true }).ilike('guest_email', email).neq('status', 'cancelled') : Promise.resolve({ count: 0 } as any),
    serviceClient.from('cohosts').select('*').eq('portal_user_id', user.id).limit(1),
    serviceClient.from('subscriptions').select('id').eq('user_id', user.id).limit(1),
  ])
  const team = tm.data?.[0]
  const ownerProfile = op.data?.[0] ?? null
  const landlord = ll.data?.[0] ?? null
  const tenant = tn.data?.[0] ?? null
  const cohost = ch.data?.[0] ?? null
  const ownsAccount = !!sub.data?.[0] // a client company's own account (it is never a team_members row)
  const isBusinessOwner = user.id === LISTINGS_BUSINESS_ID
  const activeTeam = !!(team && team.status !== 'inactive')
  const isAdminTeam = activeTeam && /^(admin|co founder)$/i.test(String(team.role || '').trim())
  const roles: Role[] = []
  if (isBusinessOwner || ownsAccount || activeTeam) roles.push('staff')
  if (isBusinessOwner || ownsAccount || isAdminTeam) roles.push('business')
  if (cohost) roles.push('cohost')
  if ((ownerProfile && (ownerProfile.property_ids ?? []).length) || landlord) roles.push('owner')
  if (ownerProfile && (n(ownerProfile.invested) > 0 || ownerProfile.partner_paid_at)) roles.push('partner')
  if (tenant) roles.push('tenant')
  if ((bk.count ?? 0) > 0 || !roles.length) roles.push('guest')
  const name = String(team?.name || cohost?.name || ownerProfile?.name || landlord?.name || tenant?.name || (user.user_metadata as any)?.name || '').trim()
  return { user, email, roles: ORDER.filter(r => roles.includes(r)), name, team, ownerProfile, landlord, tenant, businessId: team?.user_id || (ownsAccount ? user.id : cohost?.user_id) || LISTINGS_BUSINESS_ID, isBusinessOwner, cohost }
}
type Who = NonNullable<Awaited<ReturnType<typeof who>>>

// ---------- home screens ----------
async function guestHome(w: Who) {
  const { data: bookings } = await serviceClient.from('bookings').select('id,property_id,guest_name,check_in,check_out,status,total_amount').ilike('guest_email', w.email).neq('status', 'cancelled').order('check_in', { ascending: true })
  const list = bookings ?? []
  const upcoming = list.filter(b => b.check_out >= today())
  const past = list.filter(b => b.check_out < today()).reverse().slice(0, 5)
  const ids = [...new Set(list.map(b => b.property_id).filter(Boolean))]
  const { data: props } = ids.length ? await serviceClient.from('properties').select('id,name,address,city,country,image_url,wifi_name,wifi_password,house_rules,checkin_instructions,checkout_instructions,location').in('id', ids) : { data: [] as any[] }
  const P = (id: string) => (props ?? []).find(p => p.id === id) ?? null
  const stay = upcoming[0] ? { ...upcoming[0], property: P(upcoming[0].property_id) } : null
  return { stay, upcoming: upcoming.slice(1).map(b => ({ ...b, property: P(b.property_id) })), past: past.map(b => ({ ...b, property: P(b.property_id) })) }
}

async function tenantHome(w: Who) {
  const t = w.tenant
  if (!t) return { tenant: null }
  const [prop, unit, leases, rent, repairs, docs] = await Promise.all([
    t.property_id ? serviceClient.from('pm_properties').select('id,name,address,city,country,image_urls,wifi_ssid,wifi_password,bin_collection_notes,parking_notes,house_rules_url').eq('id', t.property_id).maybeSingle() : Promise.resolve({ data: null } as any),
    t.unit_id ? serviceClient.from('pm_units').select('unit_number,monthly_rent').eq('id', t.unit_id).maybeSingle() : Promise.resolve({ data: null } as any),
    serviceClient.from('pm_leases').select('id,start_date,end_date,monthly_rent,deposit,status,signed_document_url,document_url,renewal_status').eq('tenant_id', t.id).order('start_date', { ascending: false }).limit(1),
    serviceClient.from('pm_rent_payments').select('id,amount,due_date,paid_date,status').eq('tenant_id', t.id).order('due_date', { ascending: false }).limit(12),
    serviceClient.from('pm_maintenance').select('id,title,description,status,priority,created_at').eq('tenant_id', t.id).order('created_at', { ascending: false }).limit(10),
    serviceClient.from('pm_documents').select('id,name,url,file_url,category,created_at').eq('tenant_id', t.id).eq('visible_to_tenant', true).order('created_at', { ascending: false }).limit(20),
  ])
  const lease = leases.data?.[0] ?? null
  const payments = rent.data ?? []
  const unpaid = payments.filter(p => !p.paid_date && p.status !== 'paid').sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)))
  const lastPaid = payments.find(p => p.paid_date || p.status === 'paid') ?? null
  const monthly = n(lease?.monthly_rent) || n(unit.data?.monthly_rent)
  const nextDue = unpaid[0] ? { amount: n(unpaid[0].amount), due_date: unpaid[0].due_date, overdue: unpaid[0].due_date < today() } : monthly ? { amount: monthly, due_date: (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().slice(0, 10) })(), overdue: false } : null
  return { tenant: { id: t.id, name: t.name }, property: prop.data, unit: unit.data, lease, nextDue, lastPaid, payments, repairs: repairs.data ?? [], documents: docs.data ?? [] }
}

async function ownerHome(w: Who) {
  const out: any = { str: null, pm: null }
  const op = w.ownerProfile
  if (op && (op.property_ids ?? []).length) {
    const ids: string[] = op.property_ids
    const since = addDays(-30)
    const [props, bookings, statements, tickets] = await Promise.all([
      serviceClient.from('properties').select('id,name,city,country,image_url').in('id', ids),
      serviceClient.from('bookings').select('property_id,check_in,check_out,total_amount,status,guest_name').in('property_id', ids).neq('status', 'cancelled').gte('check_out', since),
      serviceClient.from('owner_statements').select('id,property_name,period_start,period_end,gross_revenue,management_fee,expenses,owner_amount,status,created_at').eq('owner_id', op.id).order('period_end', { ascending: false }).limit(12),
      serviceClient.from('maintenance_tickets').select('id,property_id,title,description,status,priority,created_at').in('property_id', ids).not('status', 'in', '(completed,closed,resolved)').order('created_at', { ascending: false }).limit(10),
    ])
    const bk = bookings.data ?? []
    const nights = (a: string, b: string) => Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 864e5))
    const properties = (props.data ?? []).map(p => {
      const mine = bk.filter(b => b.property_id === p.id)
      const booked = mine.reduce((s, b) => { const a = b.check_in < since ? since : b.check_in; const e = b.check_out > today() ? today() : b.check_out; return s + (e > a ? nights(a, e) : 0) }, 0)
      const next = mine.filter(b => b.check_in >= today()).sort((a, b) => a.check_in.localeCompare(b.check_in))[0]
      const revenue = mine.filter(b => b.check_in >= since).reduce((s, b) => s + n(b.total_amount), 0)
      return { id: p.id, name: p.name, area: [p.city, p.country].filter(Boolean).join(', '), image: p.image_url, occupancy: Math.min(100, Math.round(booked / 30 * 100)), nextGuest: next?.check_in ?? null, revenue30: Math.round(revenue * OWNER_SHARE) }
    })
    out.str = { ownerId: op.id, properties, latest: statements.data?.[0] ?? null, statements: statements.data ?? [], maintenance: tickets.data ?? [] }
  }
  const ll = w.landlord
  if (ll) {
    const [props, pays] = await Promise.all([
      serviceClient.from('pm_properties').select('id,name,address,city,country,image_urls,monthly_income,status').eq('owner_id', ll.id).is('ended_at', null),
      serviceClient.from('pm_landlord_payments').select('id,category,amount,due_date,paid_date,notes,property_id').eq('landlord_id', ll.id).order('due_date', { ascending: false }).limit(12),
    ])
    out.pm = { landlordId: ll.id, properties: props.data ?? [], payments: pays.data ?? [] }
  }
  return out
}

async function partnerHome(w: Who) {
  const op = w.ownerProfile
  if (!op) return { partner: null }
  const [st, props, bc] = await Promise.all([
    serviceClient.from('owner_statements').select('owner_amount,status,period_end,property_name').eq('owner_id', op.id).order('period_end', { ascending: true }),
    (op.property_ids ?? []).length ? serviceClient.from('properties').select('id,name,city,country,image_url,staging_stage').in('id', op.property_ids) : Promise.resolve({ data: [] } as any),
    serviceClient.from('partner_broadcasts').select('id,author_name,body,image_urls,is_opportunity,created_at').eq('business_id', op.business_id || LISTINGS_BUSINESS_ID).order('created_at', { ascending: false }).limit(10),
  ])
  const statements = st.data ?? []
  const invested = n(op.invested)
  const returned = statements.filter(s => s.status === 'paid').reduce((s, x) => s + n(x.owner_amount), 0)
  const next = statements.filter(s => s.status === 'sent').reduce((s, x) => s + n(x.owner_amount), 0)
  // last 12 months of paid returns
  const months: { label: string; value: number }[] = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1), e = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    const v = statements.filter(s => s.status === 'paid' && s.period_end && new Date(s.period_end) >= d && new Date(s.period_end) < e).reduce((a, s) => a + n(s.owner_amount), 0)
    months.push({ label: d.toLocaleDateString('en-GB', { month: 'short' }), value: Math.round(v) })
  }
  return { partner: { invested, returned, outstanding: Math.max(0, invested - returned), repaidPct: invested ? Math.round(returned / invested * 100) : 0, nextPayout: next, months, properties: props.data ?? [], broadcasts: bc.data ?? [], memberSince: op.partner_paid_at || op.created_at } }
}

// Co-host: only the properties on their own record (same rules as the web co-host portal).
async function cohostHome(w: Who) {
  const rec = w.cohost
  if (!rec) return { cohost: null }
  const ids: string[] = rec.property_ids ?? []
  const [props, bookings, tickets, settings] = await Promise.all([
    ids.length ? serviceClient.from('properties').select('id,name,address,city,image_url').in('id', ids) : Promise.resolve({ data: [] } as any),
    ids.length ? serviceClient.from('bookings').select('id,property_id,guest_name,check_in,check_out,total_amount,status,platform').in('property_id', ids).order('check_in', { ascending: false }).limit(100) : Promise.resolve({ data: [] } as any),
    ids.length ? serviceClient.from('maintenance_tickets').select('id,property_id,title,description,priority,status,created_at').in('property_id', ids).order('created_at', { ascending: false }).limit(50) : Promise.resolve({ data: [] } as any),
    serviceClient.from('invoice_settings').select('company_name').eq('business_id', rec.user_id).maybeSingle(),
  ])
  const live = (bookings.data ?? []).filter((b: any) => !['cancelled', 'canceled'].includes(String(b.status || '').toLowerCase()))
  const gross = live.reduce((s: number, b: any) => s + n(b.total_amount), 0)
  const pct = rec.payment_model === 'commission' || rec.payment_model === 'percentage' ? n(rec.payment_value) : null
  const upcoming = live.filter((b: any) => b.check_out >= today()).sort((a: any, b: any) => String(a.check_in).localeCompare(String(b.check_in)))
  return {
    cohost: { id: rec.id, name: rec.name, currency: rec.currency || 'JMD', company: settings.data?.company_name || null, agreement_end: rec.agreement_end },
    properties: props.data ?? [], bookings: live.slice(0, 40), upcoming: upcoming.slice(0, 20), maintenance: tickets.data ?? [],
    totals: { gross: Math.round(gross), bookings: live.length, your_share: pct != null ? Math.round(gross * (100 - pct)) / 100 : null },
  }
}

// Business (Novourq Cloud AI): what the AI did for this company, and what is waiting for a person.
async function businessHome(w: Who) {
  const biz = w.businessId
  const since = new Date(Date.now() - 7 * 864e5).toISOString()
  const [acts, recs, pend, followN] = await Promise.all([
    serviceClient.from('ai_activity_log').select('id,agent_key,action,property_name,notes,created_at').eq('user_id', biz).order('created_at', { ascending: false }).limit(12),
    serviceClient.from('ai_receptionist_log').select('id,channel,contact_name,subject,summary,action,needs_staff,resolved,created_at').eq('business_id', biz).order('created_at', { ascending: false }).limit(12),
    serviceClient.from('ai_pending_actions').select('id,agent_key,action_type,title,property_name,draft_body,status,created_at').eq('user_id', biz).in('status', ['pending', 'failed']).order('created_at', { ascending: false }).limit(15),
    serviceClient.from('ai_receptionist_log').select('id', { count: 'exact', head: true }).eq('business_id', biz).eq('needs_staff', true).eq('resolved', false),
  ])
  const [actsN, recsN, pendN] = await Promise.all([
    serviceClient.from('ai_activity_log').select('id', { count: 'exact', head: true }).eq('user_id', biz).gte('created_at', since),
    serviceClient.from('ai_receptionist_log').select('id', { count: 'exact', head: true }).eq('business_id', biz).gte('created_at', since),
    serviceClient.from('ai_pending_actions').select('id', { count: 'exact', head: true }).eq('user_id', biz).eq('status', 'pending'),
  ])
  const activity = [
    ...(acts.data ?? []).map((a: any) => ({ id: 'a-' + a.id, title: String(a.action || 'Action'), sub: [a.property_name, a.notes].filter(Boolean).join(' · '), at: a.created_at, flag: false })),
    ...(recs.data ?? []).map((r: any) => ({ id: 'r-' + r.id, title: r.needs_staff && !r.resolved ? `Needs follow-up · ${r.contact_name || 'Customer'}` : `Handled ${r.channel || 'chat'} · ${r.contact_name || 'Customer'}`, sub: r.summary || r.subject || '', at: r.created_at, flag: !!(r.needs_staff && !r.resolved) })),
  ].sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 15)
  return { counts: { actions7: actsN.count ?? 0, chats7: recsN.count ?? 0, waiting: pendN.count ?? 0, followUp: followN.count ?? 0 }, activity, pending: pend.data ?? [] }
}

async function staffHome(w: Who) {
  const biz = w.businessId
  const { data: props } = await serviceClient.from('properties').select('id,name').eq('user_id', biz).is('ended_at', null)
  const ids = (props ?? []).map(p => p.id)
  const P = (id: string) => (props ?? []).find(p => p.id === id)?.name ?? 'Property'
  const t = today()
  const [ins, outs, cleans, tickets, leads] = await Promise.all([
    ids.length ? serviceClient.from('bookings').select('id,property_id,guest_name,check_in,check_out,status').in('property_id', ids).eq('check_in', t).neq('status', 'cancelled') : Promise.resolve({ data: [] } as any),
    ids.length ? serviceClient.from('bookings').select('id,property_id,guest_name,check_in,check_out,status').in('property_id', ids).eq('check_out', t).neq('status', 'cancelled') : Promise.resolve({ data: [] } as any),
    ids.length ? serviceClient.from('cleaning_tasks').select('id,property_id,scheduled_date,status,priority,notes,assigned_to').in('property_id', ids).gte('scheduled_date', addDays(-1)).lte('scheduled_date', addDays(1)).order('scheduled_date') : Promise.resolve({ data: [] } as any),
    ids.length ? serviceClient.from('maintenance_tickets').select('id,property_id,title,description,status,priority,created_at').in('property_id', ids).not('status', 'in', '(completed,closed,resolved)').order('created_at', { ascending: false }).limit(15) : Promise.resolve({ data: [] } as any),
    serviceClient.from('notifications').select('id,title,message,created_at,link,read').eq('user_id', biz).eq('type', 'lead').order('created_at', { ascending: false }).limit(10),
  ])
  const tasks = [
    ...(ins.data ?? []).map((b: any) => ({ id: 'in-' + b.id, kind: 'checkin', title: `Check-in · ${P(b.property_id)}`, sub: b.guest_name || 'Guest', status: 'today' })),
    ...(outs.data ?? []).map((b: any) => ({ id: 'out-' + b.id, kind: 'checkout', title: `Check-out · ${P(b.property_id)}`, sub: b.guest_name || 'Guest', status: 'today' })),
    ...(cleans.data ?? []).map((c: any) => ({ id: 'cl-' + c.id, kind: 'clean', title: `Clean · ${P(c.property_id)}`, sub: c.notes || (c.scheduled_date === t ? 'Today' : c.scheduled_date), status: c.status || 'pending' })),
    ...(tickets.data ?? []).map((m: any) => ({ id: 'mt-' + m.id, kind: 'repair', title: `Repair · ${P(m.property_id)}`, sub: m.title || m.description || 'Maintenance', status: m.status || 'open' })),
  ]
  const openTasks = (cleans.data ?? []).filter((c: any) => !['done', 'completed'].includes(String(c.status))).length + (tickets.data ?? []).length
  return { counts: { checkins: (ins.data ?? []).length, checkouts: (outs.data ?? []).length, open: openTasks }, tasks, enquiries: leads.data ?? [] }
}

export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }) }

export async function GET(req: NextRequest) {
  const w = await who(req)
  if (!w) return bad('Not signed in', 401)
  const want = String(req.nextUrl.searchParams.get('role') || '') as Role
  const role: Role = w.roles.includes(want) ? want : w.roles[0]
  const home = role === 'business' ? await businessHome(w) : role === 'cohost' ? await cohostHome(w) : role === 'staff' ? await staffHome(w) : role === 'owner' ? await ownerHome(w) : role === 'partner' ? await partnerHome(w) : role === 'tenant' ? await tenantHome(w) : await guestHome(w)
  return json({ roles: w.roles, role, name: w.name, email: w.email, home })
}

export async function POST(req: NextRequest) {
  const w = await who(req)
  if (!w) return bad('Not signed in', 401)
  const b = await req.json().catch(() => ({}))
  const text = String(b.text ?? '').trim().slice(0, 3000)

  if (b.action === 'messages') {
    if (b.role === 'tenant' && w.tenant) {
      const { data } = await serviceClient.from('pm_tenant_messages').select('id,sender,message,created_at').eq('tenant_id', w.tenant.id).order('created_at', { ascending: true }).limit(200)
      return json({ messages: data ?? [] })
    }
    if ((b.role === 'owner' || b.role === 'partner') && w.ownerProfile) {
      const { data } = await serviceClient.from('owner_messages').select('id,sender,message,created_at').eq('owner_id', w.ownerProfile.id).order('created_at', { ascending: true }).limit(200)
      return json({ messages: data ?? [] })
    }
    return json({ messages: [] })
  }

  if (b.action === 'message') {
    if (!text) return bad('Please write a message.')
    if (b.role === 'tenant' && w.tenant) {
      await serviceClient.from('pm_tenant_messages').insert({ tenant_id: w.tenant.id, sender: 'tenant', message: text, created_at: new Date().toISOString() })
    } else if ((b.role === 'owner' || b.role === 'partner') && w.ownerProfile) {
      await serviceClient.from('owner_messages').insert({ owner_id: w.ownerProfile.id, sender: 'owner', message: text, created_at: new Date().toISOString() })
    }
    await alertTeam(w.businessId, `App message from ${w.name || w.email}`, `${w.name || ''} <${w.email}> (${b.role || 'guest'})\n${text}`, b.role === 'tenant' ? '/pm' : b.role === 'owner' || b.role === 'partner' ? '/owners' : b.role === 'cohost' ? '/staff-centre/cohosts' : '/staff-centre/crm', w.email).catch(() => {})
    return json({ ok: true })
  }

  if (b.action === 'repair') {
    if (!w.tenant) return bad('Only tenants can report repairs here.', 403)
    const title = String(b.title ?? '').trim().slice(0, 200)
    if (!title) return bad('Please say what needs fixing.')
    const { error } = await serviceClient.from('pm_maintenance').insert({ user_id: w.tenant.user_id, property_id: w.tenant.property_id, unit_id: w.tenant.unit_id, tenant_id: w.tenant.id, title, description: String(b.description ?? '').slice(0, 3000) || null, priority: ['low', 'medium', 'high', 'urgent'].includes(b.priority) ? b.priority : 'medium', status: 'open' })
    if (error) return bad('Could not send your request. Please try again.', 500)
    await alertTeam(w.tenant.user_id, `Repair reported: ${title}`, `${w.tenant.name} <${w.email}>\n${b.description ?? ''}`, '/pm', w.email).catch(() => {})
    return json({ ok: true })
  }

  if (b.action === 'delete-account') {
    if (w.isBusinessOwner) return bad('The main business account cannot be deleted from the app.', 403)
    // Unlink portal records from this login, then remove the login itself.
    await Promise.all([
      serviceClient.from('pm_tenants').update({ portal_user_id: null }).eq('portal_user_id', w.user.id),
      serviceClient.from('pm_landlords').update({ portal_user_id: null }).eq('portal_user_id', w.user.id),
      serviceClient.from('owner_profiles').update({ user_id: null }).eq('user_id', w.user.id),
      serviceClient.from('cohosts').update({ portal_user_id: null }).eq('portal_user_id', w.user.id),
    ])
    const { error } = await serviceClient.auth.admin.deleteUser(w.user.id)
    if (error) return bad('Could not delete your account. Please contact us.', 500)
    await alertTeam(w.businessId, `App account deleted: ${w.email}`, `${w.name || ''} <${w.email}> deleted their app login. Their records were kept.`, '/staff-centre', w.email).catch(() => {})
    return json({ ok: true })
  }

  return bad('Unknown action')
}
