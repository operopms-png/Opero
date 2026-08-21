import { NextRequest, NextResponse } from 'next/server'
import { callClaudeWithSearch } from '@/lib/claude'
import { requireUser } from '@/lib/admin-auth'

// Estimates a realistic achievable rent for a given location by having
// Claude search the web for comparable listings (long-term rental sites,
// Airbnb/Booking monthly rates, property portals) rather than guessing
// from training data. This is a starting estimate to sanity-check your own
// numbers against — not a licensed rent-comps feed, so it should always be
// verified against live listings before being used to set a lease offer.
export async function POST(req: NextRequest) {
  const user_id = await requireUser(req)
  if (!user_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { location, propertyType, bedrooms, bathrooms, furnished, termType } = await req.json()
  if (!location?.trim()) return NextResponse.json({ error: 'location is required' }, { status: 400 })

  const systemPrompt = `You are a rental market research assistant for a property arbitrage business (the user leases a property from a landlord, furnishes it, then sublets it to residents for a profit, either long-term or short-term/serviced-accommodation style).

Search the web for real, current comparable listings for the property described, then respond in this exact format and nothing else:

RANGE: £X - £Y per month
TYPICAL: £Z per month
CONFIDENCE: High / Medium / Low
REASONING: 2-3 sentences on what you found and why you landed on this range.
SOURCES:
- [Source name]: [what it showed]
- [Source name]: [what it showed]

If you can't find good comparable data for this specific location, say so plainly in REASONING and set CONFIDENCE to Low rather than guessing. Never fabricate a source you didn't actually find.`

  const userMessage = `Location: ${location}
Property type: ${propertyType || 'Apartment'}
Bedrooms: ${bedrooms || 'Not specified'}
Bathrooms: ${bathrooms || 'Not specified'}
Furnished: ${furnished === false ? 'Unfurnished' : 'Fully furnished'}
Letting type: ${termType === 'short' ? 'Short-term / serviced accommodation (nightly or monthly, furnished, professionals/relocators)' : 'Long-term residential rental'}

Find comparable current listings and estimate a realistic achievable monthly rent for this property.`

  const { text, error } = await callClaudeWithSearch(systemPrompt, userMessage, 1200)
  if (error) return NextResponse.json({ error }, { status: 500 })

  return NextResponse.json({ estimate: text })
}
