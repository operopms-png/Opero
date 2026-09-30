// Runs every 5 minutes: pulls new mail for every connected mailbox. See
// lib/mailbox.ts for the logic. The Email page also syncs on open, so this
// just keeps inboxes (and unread counts) fresh when nobody is looking.
import { schedule } from '@netlify/functions'
import { runMailboxSync } from '../../lib/mailbox'

export const handler = schedule('*/5 * * * *', async () => {
  const results = await runMailboxSync()
  const errors = results.filter((r: any) => r.error)
  if (errors.length) console.error('[sync-mailboxes] errors:', errors)
  console.log(`[sync-mailboxes] checked ${results.length} mailboxes, ${results.reduce((s: number, r: any) => s + (r.added || 0), 0)} new`)
  return { statusCode: 200 }
})
