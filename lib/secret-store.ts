// Encrypts integration keys (Smoobu API key and secret) before they are saved. Server-only.
// Uses the same AES-256-GCM encryption as mailbox passwords. Values saved before this existed are plain text:
// open() returns them as they are, and sealIfPlain() re-saves them encrypted the next time they are read.
import { encrypt, decrypt } from '@/lib/mailbox'

const PREFIX = 'enc:'
export const isSealed = (v: unknown) => typeof v === 'string' && v.startsWith(PREFIX)
export const seal = (plain: string) => PREFIX + encrypt(plain)
export const open = (v: string | null | undefined) => (v == null ? null : isSealed(v) ? decrypt((v as string).slice(PREFIX.length)) : (v as string))

/** Re-save any plain-text Smoobu key or secret for this account as encrypted. Safe to call every time. */
export async function sealIfPlain(db: any, userId: string, row: { smoobu_api_key?: string | null; smoobu_api_secret?: string | null }) {
  const patch: Record<string, string> = {}
  if (row.smoobu_api_key && !isSealed(row.smoobu_api_key)) patch.smoobu_api_key = seal(row.smoobu_api_key)
  if (row.smoobu_api_secret && !isSealed(row.smoobu_api_secret)) patch.smoobu_api_secret = seal(row.smoobu_api_secret)
  if (Object.keys(patch).length) await db.from('integrations').update(patch).eq('user_id', userId)
}
