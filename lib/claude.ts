export async function callClaude(system: string, userMessage: string, maxTokens = 500): Promise<{ text?: string; error?: string }> {
  if (!process.env.ANTHROPIC_API_KEY) return { error: 'ANTHROPIC_API_KEY is not configured on the server' }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    return { error: `Claude API error: ${errText}` }
  }

  const data = await res.json()
  const text = data.content?.find((c: any) => c.type === 'text')?.text ?? ''
  return { text }
}

// Same as callClaude, but with Anthropic's web_search tool enabled so the
// model can pull real, current listings rather than guessing from training
// data. Used for market rent estimates — the response should always be
// treated as a starting point to verify, not a guaranteed figure, since it
// reflects whatever the model found searching, not a licensed data feed.
export async function callClaudeWithSearch(system: string, userMessage: string, maxTokens = 1200): Promise<{ text?: string; error?: string }> {
  if (!process.env.ANTHROPIC_API_KEY) return { error: 'ANTHROPIC_API_KEY is not configured on the server' }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userMessage }],
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    return { error: `Claude API error: ${errText}` }
  }

  const data = await res.json()
  // Response can interleave text blocks with tool_use/tool_result blocks —
  // concatenate every text block in order to get the full final answer.
  const text = (data.content ?? [])
    .filter((c: any) => c.type === 'text')
    .map((c: any) => c.text)
    .join('\n')
  return { text }
}
