// What the AI can say about messages: the latest from every company channel, in one list, for admins only.
// Email, WhatsApp, text messages, calls, guest messages and website chat. Staff direct messages are NOT included.
import { serviceClient } from '@/lib/admin-auth'

const cut = (s: any, n: number) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t }
const when = (d: any) => { try { return new Date(d).toISOString().slice(0, 16).replace('T', ' ') } catch { return '' } }

export async function recentMessagesContext(biz: string, days = 7): Promise<string> {
  const since = new Date(Date.now() - days * 864e5).toISOString()
  const q = (p: PromiseLike<any>) => Promise.resolve(p).then(r => r.data ?? []).catch(() => [])
  const [mail, wa, sms, calls, guest, chats] = await Promise.all([
    q(serviceClient.from('mailbox_messages').select('folder,from_name,from_email,to_list,subject,snippet,date').eq('user_id', biz).gte('date', since).order('date', { ascending: false }).limit(60)),
    q(serviceClient.from('whatsapp_messages').select('contact_name,contact_phone,sender,body,created_at').eq('business_id', biz).gte('created_at', since).order('created_at', { ascending: false }).limit(60)),
    q(serviceClient.from('sms_messages').select('contact_name,contact_phone,sender,body,created_at').eq('business_id', biz).gte('created_at', since).order('created_at', { ascending: false }).limit(40)),
    q(serviceClient.from('call_logs').select('direction,contact_name,contact_phone,staff_name,status,duration_seconds,summary,created_at').eq('user_id', biz).gte('created_at', since).order('created_at', { ascending: false }).limit(30)),
    q(serviceClient.from('str_guest_messages').select('sender,subject,message,created_at,booking_id').eq('user_id', biz).gte('created_at', since).order('created_at', { ascending: false }).limit(60)),
    q(serviceClient.from('website_chats').select('id,name,email,interest,summary,message_count,last_message_at').eq('business_id', biz).gte('last_message_at', since).order('last_message_at', { ascending: false }).limit(20)),
  ])
  const out: string[] = []
  const line = (a: string[]) => '- ' + a.filter(Boolean).join(' · ')
  if (mail.length) out.push(`### Email (${mail.length} latest, newest first)\n` + mail.map((m: any) => line([when(m.date), m.folder, `${m.from_name || m.from_email || '?'}`, cut(m.subject, 80), cut(m.snippet, 140)])).join('\n'))
  if (wa.length) out.push(`### WhatsApp (${wa.length} latest)\n` + wa.map((m: any) => line([when(m.created_at), `${m.sender === 'staff' || m.sender === 'us' ? 'We sent to' : 'From'} ${m.contact_name || m.contact_phone || '?'}`, cut(m.body, 160)])).join('\n'))
  if (sms.length) out.push(`### Text messages (${sms.length} latest)\n` + sms.map((m: any) => line([when(m.created_at), `${m.sender || ''} ${m.contact_name || m.contact_phone || '?'}`, cut(m.body, 160)])).join('\n'))
  if (calls.length) out.push(`### Calls (${calls.length} latest)\n` + calls.map((c: any) => line([when(c.created_at), c.direction, c.contact_name || c.contact_phone, c.staff_name ? `with ${c.staff_name}` : '', c.status, c.duration_seconds ? `${Math.round(c.duration_seconds / 60)} min` : '', cut(c.summary, 160)])).join('\n'))
  if (guest.length) out.push(`### Guest messages, short stays (${guest.length} latest)\n` + guest.map((m: any) => line([when(m.created_at), m.sender, cut(m.subject, 60), cut(m.message, 160)])).join('\n'))
  if (chats.length) {
    const ids = chats.map((c: any) => c.id)
    const msgs = await q(serviceClient.from('website_chat_messages').select('chat_id,role,content,created_at').in('chat_id', ids).order('created_at', { ascending: false }).limit(80))
    const by = new Map<string, any[]>(); for (const m of msgs) by.set(m.chat_id, [...(by.get(m.chat_id) ?? []), m])
    out.push(`### Website chat (${chats.length} conversations)\n` + chats.map((c: any) => line([when(c.last_message_at), c.name || c.email || 'Visitor', c.interest, cut(c.summary, 140), (by.get(c.id) ?? []).slice(0, 2).reverse().map((m: any) => `${m.role}: ${cut(m.content, 120)}`).join(' | ')])).join('\n'))
  }
  if (!out.length) return ''
  return `## Recent messages across the company's channels (last ${days} days; admins only)\nUse this to answer what has happened, who wrote, what was said and what needs a reply. Staff direct messages in team chat are not included. Say plainly if a channel has nothing or isn't connected.\n\n` + out.join('\n\n')
}
