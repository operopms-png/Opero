// Runs daily at 07:30 UTC. It only starts the real run in the background function
// (ai-proposals-run-background), because a scheduled function is cut off after 30 seconds.
// If CRON_SECRET is not set it runs the proposals itself, which only suits small accounts.
import { schedule } from '@netlify/functions'
import { runAiProposals } from '../../lib/ai-proposals'
import { startBackgroundRun } from '../../lib/ai-run'

export const handler = schedule('30 7 * * *', async () => {
  const started = await startBackgroundRun({ force: false })
  if (started.ok) { console.log('[ai-proposals] background run started'); return { statusCode: 200 } }
  console.error('[ai-proposals] could not start background run:', started.error, '- running inline')
  const result = await runAiProposals()
  if (!result.ok) { console.error('[ai-proposals] failed:', (result as any).error); return { statusCode: 500 } }
  return { statusCode: 200 }
})
