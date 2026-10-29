'use client'
// Deal Analyser inside the AI Command Centre: same layout as Invest → Deal Analyser,
// but only the Deal Analyser itself (no Client Properties link-ins, Saved Deals or Watchlist).
import InvestPage from '../../../invest/page'

export default function AiCommandCentreDealAnalyser() {
  return <InvestPage deckOnly />
}
