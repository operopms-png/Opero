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

  const { location, propertyType, bedrooms, bathrooms, furnished, termType, currency } = await req.json()
  const S = currency === 'JMD' ? 'J$' : currency === 'USD' ? '$' : '£'
  const CUR = currency === 'JMD' ? 'Jamaican dollars (J$)' : currency === 'USD' ? 'US dollars ($)' : 'GBP (£)'
  if (!location?.trim()) return NextResponse.json({ error: 'location is required' }, { status: 400 })

  const isAirbnb = termType === 'airbnb'

  const systemPrompt = isAirbnb
    ? `You are a short-term rental market research assistant for a property arbitrage business (the user leases a property from a landlord, furnishes it, then lists it on Airbnb/short-let platforms for a profit).

Search the web for real, current comparable Airbnb/short-let listings for the property described (Airbnb, Booking.com, VRBO, etc.), then respond in this exact format and nothing else:

NIGHTLY RANGE: ${S}X - ${S}Y per night
TYPICAL NIGHTLY RATE: ${S}Z per night
TYPICAL OCCUPANCY: N% (state your assumption if you can't find a local figure, e.g. "60% is a common conservative assumption for this type of area")
ESTIMATED MONTHLY REVENUE: ${S}[typical nightly rate × occupancy% × 30], calculated and shown
CONFIDENCE: High / Medium / Low
REASONING: 2-3 sentences on what you found and why you landed on these figures.
SOURCES:
- [Source name]: [what it showed]
- [Source name]: [what it showed]

Give all figures in ${CUR}, converting from the listing's currency if needed. If you can't find good comparable data for this specific location, say so plainly in REASONING and set CONFIDENCE to Low rather than guessing. Never fabricate a source you didn't actually find. Always show your monthly revenue calculation explicitly (rate × occupancy × 30) so the user can see how you got there.`
    : `You are a rental market research assistant for a property arbitrage business (the user leases a property from a landlord, furnishes it, then sublets it to residents for a profit, either long-term or short-term/serviced-accommodation style).

Search the web for real, current comparable listings for the property described, then respond in this exact format and nothing else:

RANGE: ${S}X - ${S}Y per month
TYPICAL: ${S}Z per month
CONFIDENCE: High / Medium / Low
REASONING: 2-3 sentences on what you found and why you landed on this range.
SOURCES:
- [Source name]: [what it showed]
- [Source name]: [what it showed]

Give all figures in ${CUR}, converting from the listing's currency if needed. If you can't find good comparable data for this specific location, say so plainly in REASONING and set CONFIDENCE to Low rather than guessing. Never fabricate a source you didn't actually find.`

  const userMessage = `Location: ${location}
Property type: ${propertyType || 'Apartment'}
Bedrooms: ${bedrooms || 'Not specified'}
Bathrooms: ${bathrooms || 'Not specified'}
Furnished: ${furnished === false ? 'Unfurnished' : 'Fully furnished'}
Letting type: ${isAirbnb ? 'Airbnb / short-let (nightly bookings)' : termType === 'short' ? 'Short-term / serviced accommodation (nightly or monthly, furnished, professionals/relocators)' : 'Long-term residential rental'}

${isAirbnb ? 'Find comparable current Airbnb/short-let listings and estimate realistic nightly rates, typical occupancy, and resulting monthly revenue for this property.' : 'Find comparable current listings and estimate a realistic achievable monthly rent for this property.'}`

  const { text, error } = await callClaudeWithSearch(systemPrompt, userMessage, 1200)
  if (error) return NextResponse.json({ error }, { status: 500 })

  return NextResponse.json({ estimate: text })
}
