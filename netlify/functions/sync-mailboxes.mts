// Runs every 5 minutes: pulls new mail for every connected mailbox. See
// lib/mailbox.ts for the logic. The Email page also syncs on open, so this
// just keeps inboxes (and unread counts) fresh when nobody is looking.
import { schedule } from '@netlify/functions'
import { runMailboxSync } from '../../lib/mailbox'
import { processNewEmails, sweepPortalMessages } from '../../lib/receptionist'
import { serviceClient } from '../../lib/admin-auth'
import { sweepCalls } from '../../lib/voice-receptionist'

export const handler = schedule('*/5 * * * *', async () => {
  const results = await runMailboxSync()
  // AI Receptionist: draft/auto-reply new emails, and catch any tenant or
  // landlord portal messages the live trigger missed.
  const { data: ai } = await serviceClient.from('mailboxes').select('*').eq('status', 'connected').neq('ai_mode', 'off')
  for (const mb of ai ?? []) { try { await processNewEmails(mb, 4) } catch (e) { console.error('[ai-email]', mb.email, e) } }
  try { await sweepCalls() } catch (e) { console.error('[ai-phone]', e) }
  try { const n = await sweepPortalMessages(); if (n) console.log(`[ai-portal] answered ${n}`) } catch (e) { console.error('[ai-portal]', e) }
  const errors = results.filter((r: any) => r.error)
  if (errors.length) console.error('[sync-mailboxes] errors:', errors)
  console.log(`[sync-mailboxes] checked ${results.length} mailboxes, ${results.reduce((s: number, r: any) => s + (r.added || 0), 0)} new`)
  return { statusCode: 200 }
})
