// Escalation rules: when AI work needs a person and nobody has dealt with it, tell the person
// the business chose. Each rule creates an in-app alert (Alerts) and emails the named person.
// Runs hourly. Nothing is sent to guests, tenants or owners from here.
import { svc, dayStr } from './ai-proposal-utils'
import { sendPush } from './push'
import { sendSms } from './send-sms'
import { normalizePhone } from './sms'

const esc = (t: string) => String(t ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!))

type Rule = { id: string; user_id: string; trigger: string; after_hours: number; notify_email: string; notify_name: string | null; notify_phone?: string | null }

async function findItems(rule: Rule): Promise<{ title: string; message: string; link: string } | null> {
  const db = svc(), biz = rule.user_id, today = dayStr()
  if (rule.trigger === 'draft_waiting') {
    const cutoff = new Date(Date.now() - rule.after_hours * 3600000).toISOString()
    const { data } = await db.from('ai_pending_actions').select('id').eq('user_id', biz).eq('status', 'pending').lt('created_at', cutoff)
    if (!data?.length) return null
    return { title: `${data.length} AI draft${data.length === 1 ? '' : 's'} waiting more than ${rule.after_hours} hours`, message: 'These need approving or rejecting.', link: '/staff-centre/ai-command-centre/approvals' }
  }
  if (rule.trigger === 'failed_action') {
    const { data } = await db.from('ai_pending_actions').select('id').eq('user_id', biz).eq('status', 'failed')
    if (!data?.length) return null
    return { title: `${data.length} approved AI action${data.length === 1 ? '' : 's'} failed`, message: 'They did not send. Open Approvals to see the reason and retry.', link: '/staff-centre/ai-command-centre/approvals' }
  }
  if (rule.trigger === 'expired_certificate') {
    let n = 0
    for (const t of ['pm_compliance', 'estate_compliance', 'dev_compliance']) {
      const { data } = await db.from(t).select('id').eq('user_id', biz).not('expiry_date', 'is', null).lt('expiry_date', today)
      n += data?.length ?? 0
    }
    return n ? { title: `${n} compliance certificate${n === 1 ? ' has' : 's have'} expired`, message: 'Open Compliance to renew them.', link: '/staff-centre/compliance' } : null
  }
  if (rule.trigger === 'arrears') {
    const { data } = await db.from('pm_rent_payments').select('id, status').eq('user_id', biz).lte('due_date', dayStr(-14))
    const n = (data ?? []).filter((r: any) => String(r.status).toLowerCase() !== 'paid').length
    return n ? { title: `${n} rent payment${n === 1 ? ' is' : 's are'} more than 14 days overdue`, message: 'Check Finance for the details.', link: '/pm' } : null
  }
  return null
}

export async function runEscalations() {
  const db = svc()
  const out = { rules: 0, fired: 0, emailed: 0, errors: [] as string[] }
  try {
    const { data: rules } = await db.from('ai_escalation_rules').select('*').eq('enabled', true)
    out.rules = rules?.length ?? 0
    const dayStart = `${dayStr()}T00:00:00Z`
    for (const rule of (rules ?? []) as Rule[]) {
      const hit = await findItems(rule)
      if (!hit) continue
      // One alert per rule per day, so an unresolved problem is not repeated every hour.
      const { data: already } = await db.from('notifications').select('id').eq('user_id', rule.user_id).eq('type', 'ai_alert').eq('title', hit.title).gte('created_at', dayStart).limit(1)
      if (already?.length) continue
      await db.from('notifications').insert({ user_id: rule.user_id, title: hit.title, message: hit.message, type: 'ai_alert', module: 'staffcentre', link: hit.link, read: false })
      out.fired++
      await sendPush(rule.user_id, { title: hit.title, body: hit.message, url: hit.link }).catch(() => {})
      if (rule.notify_phone) {
        const to = normalizePhone(rule.notify_phone)
        if (to) await sendSms(to, `${hit.title}. ${hit.message}`.slice(0, 300)).catch(() => {})
      }
      try {
        const { sendEmail } = await import('./send-email')
        const r: any = await sendEmail(rule.notify_email, `Needs attention: ${hit.title}`, `<p><b>${esc(hit.title)}</b></p><p>${esc(hit.message)}</p>`)
        if (!r?.skipped && !r?.error) out.emailed++
      } catch (e) { out.errors.push(e instanceof Error ? e.message : String(e)) }
    }
    await db.from('ai_run_log').insert({ user_id: null, workflow: 'escalation', ok: true, result: out })
  } catch (e) {
    out.errors.push(e instanceof Error ? e.message : String(e))
  }
  return out
}
