// Runs at 08:00 UTC on the 1st of every month. See lib/ai-proposals.ts for the logic:
// the AI drafts monthly owner reports into the approvals queue; nothing is sent until
// a person approves it. For manual testing use app/api/cron/ai-proposals/route.ts.
import { schedule } from '@netlify/functions'
import { runAiProposals } from '../../lib/ai-proposals'

export const handler = schedule('0 8 1 * *', async () => {
  const result = await runAiProposals()
  if (!result.ok) {
    console.error('[ai-proposals] failed:', (result as any).error)
    return { statusCode: 500 }
  }
  console.log('[ai-proposals] done', JSON.stringify(result))
  return { statusCode: 200 }
})
