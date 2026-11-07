// Records what every AI call costs, so the platform owner can see cost per client
// (Platform Owner → AI Usage and Costs). Server-only. Logging never breaks the AI call:
// a failed insert is ignored. Calls made without a known client are stored with no
// business_id and show as "Not attributed to a client".
import { serviceClient } from '@/lib/admin-auth'

// USD per million tokens (input, output). Update when the provider's prices change.
const PRICES: Record<string, [number, number]> = {
  'claude-sonnet-4-6': [3, 15],
  'claude-haiku-4-5-20251001': [1, 5],
}
const FALLBACK: [number, number] = [3, 15]
const WEB_SEARCH_USD = 0.01 // per search

export function costUsd(model: string | undefined, usage: any) {
  const [pin, pout] = PRICES[model ?? ''] ?? FALLBACK
  const i = Number(usage?.input_tokens) || 0
  const o = Number(usage?.output_tokens) || 0
  const s = Number(usage?.server_tool_use?.web_search_requests) || 0
  return (i * pin + o * pout) / 1_000_000 + s * WEB_SEARCH_USD
}

// data is the parsed response of an Anthropic /v1/messages call
export function logAiUsage(businessId: string | null | undefined, source: string, model: string | undefined, data: any) {
  try {
    const usage = data?.usage
    if (!usage) return
    void serviceClient.from('ai_usage_log').insert({
      business_id: businessId ?? null,
      source,
      model: model ?? null,
      input_tokens: Number(usage.input_tokens) || 0,
      output_tokens: Number(usage.output_tokens) || 0,
      cost_usd: costUsd(model, usage),
    }).then(() => {}, () => {})
  } catch { /* never block the AI call */ }
}
