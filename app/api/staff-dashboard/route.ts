import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'

// Staff Centre → Dashboard ("Operations"). One call returns everything the
// page shows for the chosen range (today | week | month), in Jamaica time:
//   hero      check-ins, check-outs, viewings, tasks due, new messages
//   modules   Vacation Rentals / Property Management / Estate Agency cards
//   schedule  bookings in/out, viewings, meetings and tasks in the range
//   attention things waiting on someone, oldest first
//   activity  latest events across the portal
// GET ?range=today|week|month

export const maxDuration = 30
const TZ = 'America/Jamaica'
const CLOSED = ['resolved', 'completed', 'complete', 'closed', 'done', 'cancelled', 'canceled', 'fixed']
const open = (s: any) => !CLOSED.includes(String(s || '').toLowerCase())
const day = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d) // YYYY-MM-DD
const addDays = (ymd: string, n: number) => { const d = new Date(ymd + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const nights = (a: string, b: string) => Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 864e5))

export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const biz = c.businessId
  const range = ['week', 'month'].includes(req.nextUrl.searchParams.get('range') || '') ? req.nextUrl.searchParams.get('range')! : 'today'

  const today = day(new Date())
  const dow = (new Date(today + 'T12:00:00Z').getUTCDay() + 6) % 7 // Mon=0
  const from = range === 'today' ? today : range === 'week' ? addDays(today, -dow) : today.slice(0, 8) + '01'
  const to = range === 'today' ? today : range === 'week' ? addDays(from, 6) : addDays(addDays(from, 32).slice(0, 8) + '01', -1)
  const monthStart = today.slice(0, 8) + '01'
  const monthEnd = addDays(addDays(monthStart, 32).slice(0, 8) + '01', -1)
  const weekStart = addDays(today, -dow)
  const since24 = new Date(Date.now() - 864e5).toISOString()
  const in30 = addDays(today, 30)

  const q = (p: PromiseLike<{ data: any }>) => Promise.resolve(p).then(r => r.data ?? []).catch(() => [])
  const [vrProps, pmProps, pmUnits, pmTenants, pmRent, pmMaint, eaProps, eaUnits, eaTenants, eaMaint, viewings, meetings, tasks,
    strComp, pmComp, eaComp, chats, signups, clientProps, eaRentSched, devProjects, devMilestones] = await Promise.all([
    q(db.from('properties').select('id,name').eq('user_id', biz)),
    q(db.from('pm_properties').select('id,name,status').eq('user_id', biz)),
    q(db.from('pm_units').select('id,status').eq('user_id', biz)),
    q(db.from('pm_tenants').select('id,name,created_at').eq('user_id', biz)),
    q(db.from('pm_rent_payments').select('id,amount,due_date,paid_date,status,created_at,property_id').eq('user_id', biz)),
    q(db.from('pm_maintenance').select('id,title,status,created_at,property_id').eq('user_id', biz)),
    q(db.from('estate_properties').select('id,name,address,status').eq('user_id', biz)),
    q(db.from('estate_units').select('id,status').eq('user_id', biz)),
    q(db.from('estate_tenants').select('id,created_at').eq('user_id', biz)),
    q(db.from('estate_maintenance').select('id,title,status,created_at,property_id').eq('user_id', biz)),
    q(db.from('estate_viewings').select('id,property_id,prospect_name,scheduled_at,status,created_at').eq('user_id', biz)),
    q(db.from('meetings').select('id,title,attendee_name,scheduled_at,status,topic').eq('user_id', biz)),
    q(db.from('staff_tasks').select('id,title,status,due_date').eq('user_id', biz)),
    q(db.from('str_compliance').select('id,type,expiry_date,property_id').eq('user_id', biz)),
    q(db.from('pm_compliance').select('id,type,expiry_date,property_id').eq('user_id', biz)),
    q(db.from('estate_compliance').select('id,type,expiry_date,property_id').eq('user_id', biz)),
    q(db.from('website_chats').select('id,name,staff_read,message_count,created_at').eq('business_id', biz).order('created_at', { ascending: false }).limit(200)),
    q(db.from('partner_signups').select('id,name,status,payment_method,marked_sent_at,created_at,paid_at').eq('business_id', biz)),
    q(db.from('client_properties').select('id,address,subarea,owner_name,stage,created_at,updated_at').eq('business_id', biz)),
    q(db.from('estate_rent_schedules').select('id,status').eq('user_id', biz)),
    q(db.from('dev_projects').select('id,name,status,total_budget,spent').eq('user_id', biz)),
    q(db.from('dev_milestones').select('id,name,status,due_date,project_id').eq('user_id', biz)),
  ])
  const vrIds = vrProps.map((p: any) => p.id)
  const [bookings, vrMaint, guestMsgs] = vrIds.length ? await Promise.all([
    q(db.from('bookings').select('id,property_id,guest_name,check_in,check_out,status,total_amount,platform,created_at').in('property_id', vrIds)),
    q(db.from('maintenance_tickets').select('id,title,description,status,created_at,property_id').in('property_id', vrIds)),
    q(db.from('str_guest_messages').select('id,created_at,sender').eq('user_id', biz).gte('created_at', since24)),
  ]) : [[], [], []]

  const vrName = Object.fromEntries(vrProps.map((p: any) => [p.id, p.name]))
  const eaName = Object.fromEntries(eaProps.map((p: any) => [p.id, p.name || p.address]))
  const pmName = Object.fromEntries(pmProps.map((p: any) => [p.id, p.name]))
  const live = bookings.filter((b: any) => String(b.status || '').toLowerCase() !== 'cancelled')
  const inRange = (d: string | null) => !!d && d >= from && d <= to

  // ── hero ──
  const checkIns = live.filter((b: any) => inRange(b.check_in))
  const checkOuts = live.filter((b: any) => inRange(b.check_out))
  const viewingsIn = viewings.filter((v: any) => v.scheduled_at && inRange(day(new Date(v.scheduled_at))) && open(v.status))
  const openTasks = tasks.filter((t: any) => open(t.status))
  const tasksDue = openTasks.filter((t: any) => t.due_date && t.due_date <= to)
  const overdueTasks = openTasks.filter((t: any) => t.due_date && t.due_date < today)
  const unreadChats = chats.filter((w: any) => !w.staff_read && (w.message_count || 0) > 0)
  const guestNew = guestMsgs.filter((m: any) => String(m.sender || '').toLowerCase() === 'guest')

  // ── modules ──
  const daysInMonth = Number(monthEnd.slice(8))
  let bookedNights = 0
  for (const b of live) {
    const s = b.check_in > monthStart ? b.check_in : monthStart, e = b.check_out < addDays(monthEnd, 1) ? b.check_out : addDays(monthEnd, 1)
    if (s < e) bookedNights += nights(s, e)
  }
  const vrOcc = vrProps.length ? Math.round(bookedNights / (vrProps.length * daysInMonth) * 100) : 0
  const vrMonthBookings = live.filter((b: any) => b.check_in >= monthStart && b.check_in <= monthEnd)
  const vrRevenue = vrMonthBookings.reduce((a: number, b: any) => a + (Number(b.total_amount) || 0), 0)
  const vrWeek = live.filter((b: any) => b.created_at && day(new Date(b.created_at)) >= weekStart).length

  const pmLet = pmUnits.length ? pmUnits.filter((u: any) => String(u.status).toLowerCase() === 'occupied').length : pmProps.filter((p: any) => /rent|let|occupied/i.test(p.status || '')).length
  const pmTotal = pmUnits.length || pmProps.length
  const pmDue = pmRent.filter((r: any) => r.due_date >= monthStart && r.due_date <= monthEnd)
  const pmPaid = pmDue.filter((r: any) => String(r.status).toLowerCase() === 'paid').length
  const pmArrears = pmRent.filter((r: any) => String(r.status).toLowerCase() !== 'paid' && r.due_date < today).length

  const eaLetUnits = eaUnits.filter((u: any) => String(u.status).toLowerCase() !== 'vacant').length + eaProps.filter((p: any) => String(p.status).toLowerCase() === 'rented').length
  const eaTotal = eaUnits.length + eaProps.length
  const eaVacant = eaUnits.filter((u: any) => String(u.status).toLowerCase() === 'vacant').length + eaProps.filter((p: any) => String(p.status).toLowerCase() === 'available').length
  const pmVacant = pmUnits.filter((u: any) => String(u.status).toLowerCase() === 'vacant').length

  const pct = (a: number, b: number) => b ? Math.round(a / b * 100) : 0
  const modules = [
    { key: 'vr', name: 'Vacation Rentals', href: '/str', occ: Math.min(100, vrOcc), note: `${vrWeek} new booking${vrWeek === 1 ? '' : 's'} this week`,
      stats: [{ l: 'Booked (month)', v: vrRevenue ? '$' + Math.round(vrRevenue).toLocaleString('en-GB') : '—' }, { l: 'Properties', v: vrProps.length }, { l: 'Open jobs', v: vrMaint.filter((m: any) => open(m.status)).length }] },
    { key: 'pm', name: 'Property Management', href: '/pm', occ: pct(pmLet, pmTotal), note: `${pmLet} of ${pmTotal} let${pmArrears ? ` · ${pmArrears} in arrears` : ''}`,
      stats: [{ l: 'Rent paid', v: pmDue.length ? `${pmPaid} of ${pmDue.length}` : '—' }, { l: 'Tenants', v: pmTenants.length }, { l: 'Open jobs', v: pmMaint.filter((m: any) => open(m.status)).length }] },
    { key: 'ea', name: 'Estate Agency', href: '/estate', occ: pct(eaLetUnits, eaTotal), note: `${eaVacant} vacant · ${eaTenants.filter((t: any) => day(new Date(t.created_at)) >= weekStart).length} new tenants this week`,
      stats: [{ l: 'Let', v: `${eaLetUnits} of ${eaTotal}` }, { l: 'Tenants', v: eaTenants.length }, { l: 'Open jobs', v: eaMaint.filter((m: any) => open(m.status)).length }] },
    (() => {
      // Developments: ring = budget spent; note = next milestone
      const budget = devProjects.reduce((a: number, p: any) => a + (Number(p.total_budget) || 0), 0), spent = devProjects.reduce((a: number, p: any) => a + (Number(p.spent) || 0), 0)
      const openMs = devMilestones.filter((m: any) => open(m.status))
      const late = openMs.filter((m: any) => m.due_date && m.due_date < today).length
      const next = openMs.filter((m: any) => m.due_date && m.due_date >= today).sort((a: any, b: any) => a.due_date.localeCompare(b.due_date))[0]
      const short = (n: number) => n >= 1e6 ? '£' + (n / 1e6).toFixed(1) + 'm' : n >= 1e3 ? '£' + Math.round(n / 1e3) + 'k' : '£' + Math.round(n)
      return { key: 'dev', name: 'Developments', href: '/dev', occ: budget ? Math.min(100, Math.round(spent / budget * 100)) : 0, ringLabel: 'of budget spent',
        note: next ? `Next: ${next.name} · ${new Date(next.due_date + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : `${devProjects.length} project${devProjects.length === 1 ? '' : 's'}`,
        stats: [{ l: 'Spent', v: budget ? `${short(spent)} of ${short(budget)}` : short(spent) }, { l: 'Projects', v: devProjects.filter((p: any) => !/complete|done|closed/i.test(p.status || '')).length }, { l: 'Late', v: late }] }
    })(),
  ]

  // ── schedule ──
  type Ev = { date: string; time: string | null; kind: string; title: string; sub: string; module: string; href: string }
  const hm = (iso: string) => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
  const schedule: Ev[] = [
    ...checkIns.map((b: any) => ({ date: b.check_in, time: null, kind: 'in', title: `Check-in · ${vrName[b.property_id] || 'Property'}`, sub: `${b.guest_name || 'Guest'} · ${nights(b.check_in, b.check_out)} night${nights(b.check_in, b.check_out) === 1 ? '' : 's'}${b.platform ? ' · ' + b.platform : ''}`, module: 'vr', href: '/str' })),
    ...checkOuts.map((b: any) => ({ date: b.check_out, time: null, kind: 'out', title: `Check-out · ${vrName[b.property_id] || 'Property'}`, sub: `${b.guest_name || 'Guest'} · clean the same day`, module: 'vr', href: '/str' })),
    ...viewingsIn.map((v: any) => ({ date: day(new Date(v.scheduled_at)), time: hm(v.scheduled_at), kind: 'viewing', title: `Viewing · ${eaName[v.property_id] || 'Property'}`, sub: v.prospect_name || 'Prospect', module: 'ea', href: '/staff-centre/listings' })),
    ...meetings.filter((m: any) => m.scheduled_at && inRange(day(new Date(m.scheduled_at))) && open(m.status)).map((m: any) => ({ date: day(new Date(m.scheduled_at)), time: hm(m.scheduled_at), kind: 'meeting', title: `Meeting · ${m.title || m.topic || m.attendee_name || 'Meeting'}`, sub: m.attendee_name || '', module: 'staff', href: '/staff-centre/meetings' })),
    ...tasksDue.filter((t: any) => t.due_date >= from).map((t: any) => ({ date: t.due_date, time: null, kind: 'task', title: `Task due · ${t.title}`, sub: t.status || '', module: 'staff', href: '/staff-centre/tasks' })),
  ].sort((a, b) => (a.date + (a.time || '99')).localeCompare(b.date + (b.time || '99')))

  // ── needs attention ──
  type At = { tone: 'red' | 'amber' | 'blue'; icon: string; title: string; sub: string; action: string; href: string; age: number }
  const ageDays = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 864e5)
  const attention: At[] = []
  const oldJobs = [
    ...vrMaint.map((m: any) => ({ ...m, where: vrName[m.property_id], href: '/staff-centre/maintenance' })),
    ...pmMaint.map((m: any) => ({ ...m, where: pmName[m.property_id], href: '/staff-centre/maintenance' })),
    ...eaMaint.map((m: any) => ({ ...m, where: eaName[m.property_id], href: '/staff-centre/maintenance' })),
  ].filter(m => open(m.status) && ageDays(m.created_at) >= 7).sort((a, b) => a.created_at.localeCompare(b.created_at))
  for (const m of oldJobs.slice(0, 2)) attention.push({ tone: 'red', icon: 'wrench', title: `Maintenance open ${ageDays(m.created_at)} days`, sub: [m.where, m.title || m.description].filter(Boolean).join(' · ').slice(0, 80), action: 'Assign', href: m.href, age: ageDays(m.created_at) })
  if (oldJobs.length > 2) attention.push({ tone: 'red', icon: 'wrench', title: `${oldJobs.length - 2} more maintenance jobs open 7+ days`, sub: 'All businesses', action: 'View', href: '/staff-centre/maintenance', age: 7 })
  if (overdueTasks.length) attention.push({ tone: 'red', icon: 'check', title: `${overdueTasks.length} overdue task${overdueTasks.length === 1 ? '' : 's'}`, sub: overdueTasks.slice(0, 2).map((t: any) => t.title).join(' · ').slice(0, 80), action: 'Open', href: '/staff-centre/tasks', age: 6 })
  const compAll = [...strComp, ...pmComp, ...eaComp].filter((x: any) => x.expiry_date)
  const compOver = compAll.filter((x: any) => x.expiry_date < today), compSoon = compAll.filter((x: any) => x.expiry_date >= today && x.expiry_date <= in30)
  if (compOver.length) attention.push({ tone: 'red', icon: 'file', title: `${compOver.length} certificate${compOver.length === 1 ? '' : 's'} expired`, sub: compOver.slice(0, 2).map((x: any) => x.type).join(' · '), action: 'Renew', href: '/pm', age: 8 })
  if (compSoon.length) attention.push({ tone: 'amber', icon: 'file', title: `${compSoon.length} certificate${compSoon.length === 1 ? '' : 's'} due in 30 days`, sub: compSoon.slice(0, 2).map((x: any) => `${x.type} · ${x.expiry_date}`).join(' · '), action: 'Book', href: '/pm', age: 3 })
  if (pmArrears) attention.push({ tone: 'red', icon: 'pound', title: `${pmArrears} rent payment${pmArrears === 1 ? '' : 's'} overdue`, sub: 'Property Management', action: 'Chase', href: '/pm', age: 5 })
  const eaOverdue = eaRentSched.filter((r: any) => String(r.status).toLowerCase() === 'overdue').length
  if (eaOverdue) attention.push({ tone: 'red', icon: 'pound', title: `${eaOverdue} tenant${eaOverdue === 1 ? '' : 's'} overdue on rent`, sub: 'Estate Agency', action: 'Chase', href: '/estate', age: 5 })
  const vacant = pmVacant + eaVacant
  if (vacant) attention.push({ tone: 'amber', icon: 'key', title: `${vacant} vacant propert${vacant === 1 ? 'y' : 'ies'}`, sub: 'Property Management & Estate Agency', action: 'View', href: '/staff-centre/listings', age: 2 })
  if (unreadChats.length) attention.push({ tone: 'blue', icon: 'msg', title: `${unreadChats.length} unread website chat${unreadChats.length === 1 ? '' : 's'}`, sub: unreadChats.slice(0, 2).map((w: any) => w.name || 'Visitor').join(' · '), action: 'Reply', href: '/staff-centre/website-chats', age: 1 })
  if (guestNew.length) attention.push({ tone: 'blue', icon: 'msg', title: `${guestNew.length} guest message${guestNew.length === 1 ? '' : 's'} in the last 24 hours`, sub: 'Airbnb / Booking.com', action: 'Reply', href: '/staff-centre/inbox', age: 1 })
  const bankWaiting = signups.filter((s: any) => s.status === 'pending' && s.payment_method === 'bank' && s.marked_sent_at)
  if (bankWaiting.length) attention.push({ tone: 'amber', icon: 'users', title: `${bankWaiting.length} partner bank payment${bankWaiting.length === 1 ? '' : 's'} to confirm`, sub: bankWaiting.map((s: any) => s.name).join(' · ').slice(0, 80), action: 'Confirm', href: '/staff-centre/partners', age: 2 })
  const staleClients = clientProps.filter((p: any) => p.stage === 'new' && ageDays(p.updated_at || p.created_at) >= 3)
  if (staleClients.length) attention.push({ tone: 'amber', icon: 'home', title: `${staleClients.length} client propert${staleClients.length === 1 ? 'y' : 'ies'} not followed up`, sub: staleClients.slice(0, 2).map((p: any) => p.address).join(' · '), action: 'Open', href: '/staff-centre/client-properties', age: 3 })
  const toneRank = { red: 0, amber: 1, blue: 2 }
  attention.sort((a, b) => toneRank[a.tone] - toneRank[b.tone] || b.age - a.age)

  // ── activity ──
  type Act = { at: string; text: string; where: string; module: string; href: string }
  const act: Act[] = [
    ...clientProps.map((p: any) => ({ at: p.created_at, text: `Client property added — ${p.address}${p.owner_name ? ` (${p.owner_name})` : ''}`, where: 'Client Properties', module: 'staff', href: `/staff-centre/client-properties?id=${p.id}` })),
    ...signups.filter((s: any) => ['paid', 'confirmed'].includes(s.status) || s.paid_at).map((s: any) => ({ at: s.paid_at || s.created_at, text: `Partner joined — ${s.name}`, where: 'Partners', module: 'staff', href: '/staff-centre/partners' })),
    ...live.map((b: any) => ({ at: b.created_at, text: `Booking — ${vrName[b.property_id] || 'Property'}, ${nights(b.check_in, b.check_out)} nights from ${new Date(b.check_in + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`, where: 'Vacation Rentals', module: 'vr', href: '/str' })),
    ...pmRent.filter((r: any) => String(r.status).toLowerCase() === 'paid').map((r: any) => ({ at: r.paid_date ? r.paid_date + 'T12:00:00Z' : r.created_at, text: `Rent received — ${pmName[r.property_id] || 'Property'}`, where: 'Property Management', module: 'pm', href: '/pm' })),
    ...[...vrMaint, ...pmMaint, ...eaMaint].map((m: any) => ({ at: m.created_at, text: `Maintenance job opened — ${(m.title || m.description || 'job').slice(0, 60)}`, where: 'Maintenance', module: 'staff', href: '/staff-centre/maintenance' })),
    ...chats.filter((w: any) => (w.message_count || 0) > 0).slice(0, 20).map((w: any) => ({ at: w.created_at, text: `Website chat — ${w.name || 'Visitor'}`, where: 'Website Chats', module: 'staff', href: '/staff-centre/website-chats' })),
    ...viewings.map((v: any) => ({ at: v.created_at, text: `Viewing booked — ${eaName[v.property_id] || 'Property'}${v.prospect_name ? ' · ' + v.prospect_name : ''}`, where: 'Estate Agency', module: 'ea', href: '/staff-centre/listings' })),
  ].filter(a => a.at).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8)

  return NextResponse.json({
    range, from, to, today, now: new Date().toISOString(),
    hero: {
      checkIns: { n: checkIns.length, sub: checkIns.slice(0, 2).map((b: any) => vrName[b.property_id]).filter(Boolean).join(' · ') },
      checkOuts: { n: checkOuts.length, sub: checkOuts.slice(0, 2).map((b: any) => vrName[b.property_id]).filter(Boolean).join(' · ') },
      viewings: { n: viewingsIn.length, sub: viewingsIn.slice(0, 2).map((v: any) => eaName[v.property_id]).filter(Boolean).join(' · ') },
      tasks: { n: tasksDue.length, sub: overdueTasks.length ? `${overdueTasks.length} overdue` : tasksDue.length ? 'none overdue' : '' },
      messages: { n: unreadChats.length + guestNew.length, sub: [guestNew.length && `${guestNew.length} guest`, unreadChats.length && `${unreadChats.length} website`].filter(Boolean).join(' · ') },
    },
    modules, schedule: schedule.slice(0, 40), attention: attention.slice(0, 6), activity: act,
  })
}
