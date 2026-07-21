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
