import { NextResponse } from 'next/server'

// Re-fetch at most once per hour -- keeps the dashboard fast while still
// giving genuinely current headlines instead of the old static array.
export const revalidate = 3600

const FEEDS = [
  { url: 'https://propertyindustryeye.com/feed/', tag: 'INDUSTRY' },
  { url: 'https://www.lettingagenttoday.co.uk/rss', tag: 'LETTINGS' },
]

const FALLBACK = [
  { title: 'New Tenant Verification Regulations for Landlords', tag: 'LEGISLATION', body: 'The Renters Rights Act has introduced restrictions on upfront rental payments, requiring landlords to adopt alternative affordability checks.', link: null as string | null },
  { title: 'Mortgage Market Reforms Proposed by FCA', tag: 'MORTGAGE', body: 'The Financial Conduct Authority is proposing significant changes to the mortgage market aimed at providing more flexibility for lenders.', link: null },
  { title: 'UK Housing Market Shows Signs of Stabilization', tag: 'RENTING', body: 'Data indicates that the property market may be stabilizing, with both buyers and sellers adjusting to the new landscape of higher borrowing costs.', link: null },
]

function decodeEntities(str: string) {
  return str
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&#8217;/g, '\u2019')
    .replace(/&#8216;/g, '\u2018').replace(/&#8211;/g, '\u2013').replace(/&#8212;/g, '\u2014')
}

function stripTags(str: string) {
  return decodeEntities(str.replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '').replace(/<[^>]+>/g, '').trim())
}

function extractTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'))
  return match ? match[1] : ''
}

async function parseFeed(feedUrl: string, tag: string, limit: number) {
  const res = await fetch(feedUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OperoBot/1.0)' },
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`Feed returned ${res.status}`)
  const xml = await res.text()
  const items = xml.match(/<item[\s\S]*?<\/item>/gi) ?? []
  return items.slice(0, limit).map(item => {
    const title = stripTags(extractTag(item, 'title'))
    const description = stripTags(extractTag(item, 'description')).slice(0, 160)
    const link = stripTags(extractTag(item, 'link'))
    return { title, tag, body: description, link: link || null }
  }).filter(n => n.title)
}

export async function GET() {
  try {
    const results = await Promise.allSettled(FEEDS.map(f => parseFeed(f.url, f.tag, 3)))
    const items = results
      .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof parseFeed>>> => r.status === 'fulfilled')
      .flatMap(r => r.value)
      .slice(0, 5)

    if (items.length === 0) {
      return NextResponse.json({ news: FALLBACK, live: false })
    }
    return NextResponse.json({ news: items, live: true })
  } catch {
    return NextResponse.json({ news: FALLBACK, live: false })
  }
}
