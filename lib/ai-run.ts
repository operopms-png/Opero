// Starts the AI proposals run in the Netlify background function and returns straight away.
export async function startBackgroundRun(opts: { force: boolean; businessId?: string }): Promise<{ ok: boolean; error?: string }> {
  const secret = process.env.CRON_SECRET
  const base = process.env.URL || process.env.DEPLOY_URL
  if (!secret) return { ok: false, error: 'CRON_SECRET is not set in Netlify env vars' }
  if (!base) return { ok: false, error: 'The site address is not available to start a background run' }
  try {
    const res = await fetch(`${base}/.netlify/functions/ai-proposals-run-background`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-cron-secret': secret }, body: JSON.stringify(opts),
    })
    return res.status === 202 || res.ok ? { ok: true } : { ok: false, error: `Background run refused (${res.status})` }
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) } }
}
