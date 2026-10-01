import { ratesPerGBP } from '@/lib/currency'
// Units per £1 for GBP / USD / JMD (cached 12h)
export async function GET() {
  return Response.json({ rates: await ratesPerGBP() }, { headers: { 'Cache-Control': 'public, s-maxage=3600' } })
}
