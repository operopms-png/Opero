// Runs daily at 07:30 UTC. See lib/ai-proposals.ts for the logic: the AI drafts cleaning
// instructions, maintenance requests and rent reminders every day, nightly rate reviews on
// Mondays and owner reports on the 1st of the month. All of it goes into the approvals queue;
// nothing is sent or changed until a person approves it. For manual testing use
// app/api/cron/ai-proposals/route.ts.
import { schedule } from '@netlify/functions'
import { runAiProposals } from '../../lib/ai-proposals'

export const handler = schedule('30 7 * * *', async () => {
  const result = await runAiProposals()
  if (!result.ok) {
    console.error('[ai-proposals] failed:', (result as any).error)
    return { statusCode: 500 }
  }
  console.log('[ai-proposals] done', JSON.stringify(result))
  return { statusCode: 200 }
})
