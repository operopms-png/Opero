// Lets Novourq Cloud AI (Ask AI) prepare a WhatsApp message through the company's linked number. It never sends by itself:
// the draft waits in Staff Centre → AI Approvals, where a person can edit the wording and press Approve & send.
// Admins and co-founders only. A recipient is a phone number with country code, or the name of someone who has already been in a chat.
// Writing {pack_link} in the message is replaced with that investor's live pack link (their pack must already be Sent).
import { serviceClient as db } from '@/lib/admin-auth'
import { queueAiAction } from '@/lib/ai-approvals'
import { SITE_URL } from '@/lib/brand'
import { canUseWhatsApp, findChat, getBridge } from '@/lib/whatsapp'

type Who = { businessId: string; name: string; email: string; isAdmin: boolean; role?: string }

export async function proposeWhatsApp(c: Who, input: { to: unknown; text: unknown; agentKey: string; via: string }): Promise<{ ok: true; summary: string } | { ok: false; error: string }> {
  if (!canUseWhatsApp(c)) return { ok: false, error: 'Only admins and co-founders can send WhatsApp messages.' }
  if (!(await getBridge(c.businessId))) return { ok: false, error: 'WhatsApp is not set up yet. Set it up in Staff Centre → Human Intelligence Hub → Clients and sales → WhatsApp.' }
  const to = String(input.to || '').trim().slice(0, 80)
  let text = String(input.text || '').trim().slice(0, 4000)
  if (!to || !text) return { ok: false, error: 'I need who to send it to and what to say.' }

  const digits = to.replace(/\D/g, '')
  let target: { jid?: string; phone?: string }, label: string
  if (digits.length >= 8 && !/[a-z]/i.test(to)) { target = { phone: digits }; label = '+' + digits }
  else {
    const chat = await findChat(c.businessId, to)
    if (!chat) return { ok: false, error: `I can't find a WhatsApp chat with ${to} yet. Give me their number with the country code, for example 447700900123.` }
    target = { jid: chat.jid }; label = chat.label
  }

  if (/\{pack_link\}/i.test(text)) {
    const n = to.replace(/[%_,()]/g, ' ').trim()
    const { data } = await db.from('invest_packs').select('name,token,stage,active').eq('business_id', c.businessId)
      .or(`prepared_for.ilike.%${n}%,name.ilike.%${n}%`).order('updated_at', { ascending: false }).limit(1)
    const p = data?.[0]
    if (!p) return { ok: false, error: `I can't find an investment pack for ${to}.` }
    if (p.stage === 'draft' || !p.active) return { ok: false, error: `"${p.name}" has no live link yet. Create the link first (ask me to create the link, then approve it), then I can send it.` }
    text = text.replace(/\{pack_link\}/gi, `${SITE_URL}/p/${p.token}`)
  }

  const q: any = await queueAiAction({
    userId: c.businessId, agentKey: input.agentKey, actionType: 'whatsapp_send', title: `WhatsApp to ${label}`.slice(0, 140), draftBody: text,
    payload: { ...target, dedupe: `${label}|${text.slice(0, 80)}` },
    reason: `${c.name || c.email} asked for this ${input.via}`,
    dedupe: { key: 'dedupe', value: `${label}|${text.slice(0, 80)}`, sinceIso: new Date(Date.now() - 3600000).toISOString() },
  })
  if (q?.error) return { ok: false, error: q.error }
  if (q?.skipped) return { ok: false, error: 'That exact message is already waiting in AI Approvals.' }
  return { ok: true, summary: `a WhatsApp message to ${label}` }
}
