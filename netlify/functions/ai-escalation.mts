// Runs every hour. Checks each business's escalation rules (AI Command Centre -> Escalation rules)
// and alerts the named person when AI work is waiting or has failed. See lib/ai-escalation.ts.
import { schedule } from '@netlify/functions'
import { runEscalations } from '../../lib/ai-escalation'

export const handler = schedule('0 * * * *', async () => {
  const r = await runEscalations()
  console.log('[ai-escalation]', JSON.stringify(r))
  return { statusCode: r.errors.length ? 500 : 200 }
})
