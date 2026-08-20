// Shared logic for the daily reminders digest -- compliance expiries,
// tenancy renewals, and overdue rent for every Estate Agency account.
// Used by both netlify/functions/daily-reminders.mts (the real daily
// automatic run) and app/api/cron/daily-reminders/route.ts (a
// secret-protected route for manual testing, since Netlify blocks direct
// external invocation of scheduled functions).
import { createClient } from '@supabase/supabase-js'

const DAY_MS = 86400000
const COMPLIANCE_WINDOW_DAYS = 30
const TENANCY_WINDOW_DAYS = 30

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, serviceKey)
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.RESEND_API_KEY) return { skipped: true }
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({ from: 'Opero <notifications@helloopero.com>', to, subject, html }),
    })
    return { sent: true }
  } catch (err) {
    console.error('[daily-reminders] email send failed:', err)
    return { error: String(err) }
  }
}

async function scanEstateAgency(supabase: any, userId: string) {
  const now = Date.now()
  const [complianceRes, tenanciesRes, rentRes] = await Promise.all([
    supabase.from('estate_compliance').select('*,estate_properties(name)').eq('user_id', userId),
    supabase.from('estate_tenancies').select('*,estate_properties(name),estate_tenants(name)').eq('user_id', userId).eq('status', 'Active'),
    supabase.from('estate_rent_schedules').select('*,estate_tenancies(estate_properties(name),estate_tenants(name))').eq('user_id', userId).eq('status', 'Overdue'),
  ])

  const expiredCompliance = (complianceRes.data ?? []).filter((c: any) => c.expiry_date && new Date(c.expiry_date).getTime() < now)
  const expiringCompliance = (complianceRes.data ?? []).filter((c: any) => {
    if (!c.expiry_date) return false
    const days = (new Date(c.expiry_date).getTime() - now) / DAY_MS
    return days >= 0 && days <= COMPLIANCE_WINDOW_DAYS
  })
  const expiringTenancies = (tenanciesRes.data ?? []).filter((t: any) => {
    if (!t.end_date) return false
    const days = (new Date(t.end_date).getTime() - now) / DAY_MS
    return days >= 0 && days <= TENANCY_WINDOW_DAYS
  })
  const overdueRent = rentRes.data ?? []

  const totalIssues = expiredCompliance.length + expiringCompliance.length + expiringTenancies.length + overdueRent.length
  if (totalIssues === 0) return { userId, totalIssues: 0, notified: false }

  const parts: string[] = []
  if (expiredCompliance.length) parts.push(`${expiredCompliance.length} compliance item${expiredCompliance.length > 1 ? 's' : ''} expired`)
  if (expiringCompliance.length) parts.push(`${expiringCompliance.length} compliance item${expiringCompliance.length > 1 ? 's' : ''} expiring within ${COMPLIANCE_WINDOW_DAYS} days`)
  if (expiringTenancies.length) parts.push(`${expiringTenancies.length} tenanc${expiringTenancies.length > 1 ? 'ies' : 'y'} ending within ${TENANCY_WINDOW_DAYS} days`)
  if (overdueRent.length) parts.push(`${overdueRent.length} rent payment${overdueRent.length > 1 ? 's' : ''} overdue`)

  const title = `Estate Agency: ${parts.join(', ')}`

  const { error: insertError } = await supabase.from('notifications').insert({
    user_id: userId, module: 'estate', type: 'reminder_digest', title, link: '/estate',
  })
  if (insertError) console.error('[daily-reminders] notification insert failed for', userId, insertError.message)

  const { data: ownerData } = await supabase.auth.admin.getUserById(userId)
  const email = ownerData?.user?.email
  if (!email) return { userId, totalIssues, notified: true, emailed: false }

  const rows = [
    ...expiredCompliance.map((c: any) => `<li><strong>Expired:</strong> ${c.type} — ${c.estate_properties?.name ?? 'unknown property'} (expired ${c.expiry_date})</li>`),
    ...expiringCompliance.map((c: any) => `<li><strong>Expiring soon:</strong> ${c.type} — ${c.estate_properties?.name ?? 'unknown property'} (expires ${c.expiry_date})</li>`),
    ...expiringTenancies.map((t: any) => `<li><strong>Tenancy ending:</strong> ${t.estate_tenants?.name ?? 'tenant'} at ${t.estate_properties?.name ?? 'unknown property'} (ends ${t.end_date})</li>`),
    ...overdueRent.map((r: any) => `<li><strong>Overdue rent:</strong> £${r.amount} — ${r.estate_tenancies?.estate_tenants?.name ?? 'tenant'} at ${r.estate_tenancies?.estate_properties?.name ?? 'unknown property'}</li>`),
  ]
  const html = `<p>Your Estate Agency account has ${totalIssues} item${totalIssues > 1 ? 's' : ''} needing attention:</p><ul>${rows.join('')}</ul><p><a href="https://helloopero.com/estate">Review in Opero</a></p>`

  const emailResult = await sendEmail(email, title, html)
  return { userId, totalIssues, notified: true, emailed: !!(emailResult as any).sent }
}

export async function runDailyReminders() {
  const supabase = getServiceClient()
  const { data: properties, error } = await supabase.from('estate_properties').select('user_id')
  if (error) {
    return { ok: false, error: error.message }
  }

  const userIds = Array.from(new Set((properties ?? []).map((p: any) => p.user_id).filter(Boolean)))
  const results = []
  for (const userId of userIds) {
    try {
      results.push(await scanEstateAgency(supabase, userId as string))
    } catch (err) {
      console.error('[daily-reminders] scan failed for user', userId, err)
      results.push({ userId, error: String(err) })
    }
  }

  return {
    ok: true,
    accountsScanned: userIds.length,
    digestsSent: results.filter((r: any) => r.notified).length,
    results,
  }
}
