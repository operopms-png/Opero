// Does the actual AI proposals run. Background functions may run for up to 15 minutes, which the
// daily job needs once web searches and many Claude calls are involved (a scheduled function is
// cut off after 30 seconds). Started by netlify/functions/ai-proposals.mts, by Workflows ->
// Run all now, and by the manual cron route. The caller must send the CRON_SECRET.
import { runAiProposals } from '../../lib/ai-proposals'

export default async (req: Request) => {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('x-cron-secret') !== secret) return new Response('Forbidden', { status: 403 })
  const b: any = await req.json().catch(() => ({}))
  const r = await runAiProposals(!!b.force, typeof b.businessId === 'string' ? b.businessId : undefined)
  console.log('[ai-proposals-run]', JSON.stringify(r))
  return new Response('ok')
}
