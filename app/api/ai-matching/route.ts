import { NextRequest, NextResponse } from 'next/server'
import { getCaller } from '@/lib/mailbox'
import { readCriteria, findMatches, draftReply, queueMatchReply } from '@/lib/ai-matching'

export const maxDuration = 60

// POST {enquiry, name?, email?, queue?}: find the listed properties that fit an enquiry.
// With queue:true and an email, the drafted reply goes to AI Approvals. Nothing is sent from here.
export async function POST(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await req.json().catch(() => ({}))
  const enquiry = String(b.enquiry ?? '').trim()
  if (enquiry.length < 8) return NextResponse.json({ error: 'Paste or type what the person is looking for.' }, { status: 400 })
  const name = typeof b.name === 'string' && b.name.trim() ? b.name.trim().slice(0, 120) : null
  const email = typeof b.email === 'string' ? b.email.trim() : ''

  const criteria = await readCriteria(enquiry)
  if ('error' in criteria) return NextResponse.json({ error: criteria.error }, { status: 502 })
  const matches = await findMatches(c.businessId, criteria)
  if (!matches.length) return NextResponse.json({ criteria, matches: [], reply: null, note: 'No listed property fits this yet.' })

  const reply = await draftReply(c.businessId, name, enquiry, matches)
  let queued = false
  if (b.queue === true && reply && /^\S+@\S+\.\S+$/.test(email)) {
    const q: any = await queueMatchReply(c.businessId, { name, email, enquiry, matches, body: reply })
    queued = !!q?.queued
  }
  return NextResponse.json({ criteria, matches, reply, queued })
}
