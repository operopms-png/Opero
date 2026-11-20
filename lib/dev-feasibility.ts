// Developments → Feasibility: what the same piece of land earns by four different routes.
// Plain arithmetic on the figures the user types in. No outside data, nothing is saved by this file.
// Every route is spread evenly over its months; interest is paid in cash and the loan is a share of each month's costs.

export type Way = 'land' | 'paper' | 'pads' | 'homes'
export type Case = 'downside' | 'base' | 'upside'

export type Inputs = {
  acres: number
  lots: number
  landPrice: number            // what you pay for the land
  purchaseCostsPct: number     // legal, stamp duty and so on, % of land price
  // sell the land as it is
  landAsIsPrice: number        // what you could sell it for today
  landAsIsMonths: number       // months you hold it
  holdCostPerMonth: number     // taxes, insurance, upkeep
  // paper lots (approvals only)
  approvalsCost: number
  approvalsMonths: number
  paperLotPrice: number        // sale price of an approved, unbuilt lot
  // finished pads (roads and services in)
  sitework: number             // total infrastructure cost, before earthworks
  earthworks: number           // from the terrain tab, 0 if unused
  siteworkMonths: number
  padLotPrice: number
  // homes built and sold
  buildCostPerHome: number
  buildMonths: number
  homePrice: number
  salesMonths: number          // months over which lots / homes sell, after they are ready
  // selling and carrying costs, % of sale price unless stated
  commissionPct: number
  closingPct: number
  marketingPct: number
  warrantyPct: number          // homes only
  adminPct: number             // company overhead, % of sale price
  hoaPerLotMonth: number       // developer subsidy while lots are unsold
  loanPct: number              // share of each month's spending that is borrowed
  interestPct: number          // yearly
  contingencyPct: number       // on building and site works
  cityFeesPerLot: number       // permits, impact fees, plan checks, per lot
}

export const DEFAULTS: Inputs = {
  acres: 24.3, lots: 45, landPrice: 730000, purchaseCostsPct: 3,
  landAsIsPrice: 830000, landAsIsMonths: 12, holdCostPerMonth: 1500,
  approvalsCost: 120000, approvalsMonths: 6, paperLotPrice: 24000,
  sitework: 1350000, earthworks: 0, siteworkMonths: 8, padLotPrice: 88000,
  buildCostPerHome: 285000, buildMonths: 8, homePrice: 468000, salesMonths: 20,
  commissionPct: 2.5, closingPct: 2, marketingPct: 0.75, warrantyPct: 0.5, adminPct: 3, hoaPerLotMonth: 15,
  loanPct: 70, interestPct: 8.5, contingencyPct: 8, cityFeesPerLot: 9500,
}

/** How each case moves the figures. Downside: prices lower, costs higher, everything slower. */
export type CaseShift = { price: number; cost: number; months: number }
export const DEFAULT_SHIFT: Record<Case, CaseShift> = {
  downside: { price: -8, cost: 8, months: 25 },
  base: { price: 0, cost: 0, months: 0 },
  upside: { price: 6, cost: -4, months: -10 },
}

export type Result = {
  way: Way; label: string; sub: string
  sales: number; costs: number; profit: number
  marginOnCost: number           // profit / total costs, %
  peakCash: number               // most money out of pocket at once (before the loan)
  loanAtPeak: number
  peakEquity: number             // your own money at the worst point
  returnPerYear: number          // profit / peak equity, spread over the months, %
  equityMultiple: number
  perLot: number
  months: number
  timeline: { month: number; cumulative: number }[]   // cumulative net cash, for a chart
  uses: { label: string; total: number; note: string }[]   // where the money goes, for the sources and uses table
  phases: { approvals: number; works: number; buildStart: number; build: number; sellStart: number; sell: number }   // months, for the build timeline
}

type Flow = { spend: number[]; sales: number[] }

const spread = (arr: number[], from: number, months: number, total: number) => {
  const n = Math.max(1, Math.round(months))
  for (let i = 0; i < n; i++) arr[from + i] = (arr[from + i] || 0) + total / n
}

function simulate(flow: Flow, loanPct: number, interestPct: number) {
  const len = Math.max(flow.spend.length, flow.sales.length)
  let debt = 0, equityCum = 0, outlayCum = 0, minEquity = 0, peakOutlay = 0, maxDebt = 0, interestTotal = 0
  const timeline: { month: number; cumulative: number }[] = []
  let netCum = 0
  for (let m = 0; m < len; m++) {
    const spend = flow.spend[m] || 0, sale = flow.sales[m] || 0
    const interest = debt * (interestPct / 100) / 12
    interestTotal += interest
    const draw = spend * (loanPct / 100)
    debt += draw
    const repay = Math.min(debt, sale)
    debt -= repay
    equityCum += sale - repay - (spend - draw) - interest
    outlayCum += sale - spend - interest
    netCum += sale - spend - interest
    minEquity = Math.min(minEquity, equityCum)
    peakOutlay = Math.min(peakOutlay, outlayCum)
    maxDebt = Math.max(maxDebt, debt)
    timeline.push({ month: m + 1, cumulative: Math.round(netCum) })
  }
  return { peakEquity: -minEquity, peakCash: -peakOutlay, loanAtPeak: maxDebt, interestTotal, months: len, timeline }
}

const scale = (v: number, pct: number) => v * (1 + pct / 100)

export function runWay(way: Way, i: Inputs, shift: CaseShift): Result {
  const P = (v: number) => scale(v, shift.price)
  const C = (v: number) => scale(v, shift.cost)
  const M = (v: number) => Math.max(1, Math.round(scale(v, shift.months)))
  const purchase = i.landPrice * (1 + i.purchaseCostsPct / 100)
  const sellPct = (i.commissionPct + i.closingPct + i.marketingPct + i.adminPct) / 100
  const spend: number[] = [], sales: number[] = []
  spend[0] = purchase
  let label = '', sub = '', end = 0, grossSales = 0, extra = 0
  const parts = { soft: 0, hard: 0, city: 0, vertical: 0, hoaHold: 0 }
  const ph = { approvals: 0, works: 0, buildStart: 0, build: 0, sellStart: 0, sell: 0 }

  if (way === 'land') {
    label = 'Land as is'; sub = 'sell the land untouched'
    const hold = M(i.landAsIsMonths)
    spread(spend, 1, hold, C(i.holdCostPerMonth) * hold)
    parts.hoaHold = C(i.holdCostPerMonth) * hold
    grossSales = P(i.landAsIsPrice)
    sales[hold] = grossSales
    end = hold
    ph.sellStart = hold; ph.sell = 1
  } else if (way === 'paper') {
    label = 'Paper lots'; sub = 'approvals, sell unbuilt lots'
    const appr = M(i.approvalsMonths), sell = M(i.salesMonths)
    spread(spend, 1, appr, C(i.approvalsCost))
    grossSales = P(i.paperLotPrice) * i.lots
    spread(sales, appr, sell, grossSales)
    spread(spend, appr, sell, C(i.holdCostPerMonth) * sell)
    parts.soft = C(i.approvalsCost); parts.hoaHold = C(i.holdCostPerMonth) * sell
    end = appr + sell
    ph.approvals = appr; ph.sellStart = appr; ph.sell = sell
  } else if (way === 'pads') {
    label = 'Pads finished'; sub = 'roads and services, sell lots'
    const appr = M(i.approvalsMonths), works = M(i.siteworkMonths), sell = M(i.salesMonths)
    spread(spend, 1, appr, C(i.approvalsCost))
    const siteTotal = C(i.sitework + i.earthworks) * (1 + i.contingencyPct / 100)
    spread(spend, appr, works, siteTotal)
    grossSales = P(i.padLotPrice) * i.lots
    spread(sales, appr + works, sell, grossSales)
    spread(spend, appr + works, sell, i.hoaPerLotMonth * i.lots * sell * 0.5)
    const cityP = C(i.cityFeesPerLot) * i.lots
    spread(spend, appr, works, cityP)
    parts.soft = C(i.approvalsCost); parts.hard = siteTotal; parts.city = cityP; parts.hoaHold = i.hoaPerLotMonth * i.lots * sell * 0.5
    end = appr + works + sell
    ph.approvals = appr; ph.works = works; ph.sellStart = appr + works; ph.sell = sell
  } else {
    label = 'Homes built'; sub = 'build and sell finished homes'
    const appr = M(i.approvalsMonths), works = M(i.siteworkMonths), build = M(i.buildMonths), sell = M(i.salesMonths)
    spread(spend, 1, appr, C(i.approvalsCost))
    const siteTotal = C(i.sitework + i.earthworks) * (1 + i.contingencyPct / 100)
    spread(spend, appr, works, siteTotal)
    const buildTotal = C(i.buildCostPerHome) * i.lots * (1 + i.contingencyPct / 100)
    const buildStart = appr + Math.round(works / 2)   // building starts while the last site works finish
    spread(spend, buildStart, build + Math.round(sell / 2), buildTotal)
    grossSales = P(i.homePrice) * i.lots
    spread(sales, buildStart + build, sell, grossSales)
    extra = grossSales * (i.warrantyPct / 100)
    spread(spend, buildStart + build, sell, i.hoaPerLotMonth * i.lots * sell * 0.5)
    const cityH = C(i.cityFeesPerLot) * i.lots
    spread(spend, appr, works, cityH)
    parts.soft = C(i.approvalsCost); parts.hard = siteTotal; parts.city = cityH; parts.vertical = buildTotal; parts.hoaHold = i.hoaPerLotMonth * i.lots * sell * 0.5
    end = buildStart + build + sell
    ph.approvals = appr; ph.works = works; ph.buildStart = buildStart; ph.build = build; ph.sellStart = buildStart + build; ph.sell = sell
  }

  // selling costs come out as the sales come in
  const sellCosts = grossSales * sellPct + extra
  for (let m = 0; m < sales.length; m++) if (sales[m]) spend[m] = (spend[m] || 0) + (sales[m] / (grossSales || 1)) * sellCosts

  const sim = simulate({ spend, sales }, way === 'land' ? Math.min(i.loanPct, 0) : i.loanPct, i.interestPct)
  const totalSpend = spend.reduce((a, b) => a + (b || 0), 0) + sim.interestTotal
  const profit = grossSales - totalSpend
  const equity = Math.max(1, sim.peakEquity)
  const years = Math.max(1 / 12, sim.months / 12)
  return {
    way, label, sub, sales: grossSales, costs: totalSpend, profit,
    marginOnCost: totalSpend > 0 ? (profit / totalSpend) * 100 : 0,
    peakCash: sim.peakCash, loanAtPeak: sim.loanAtPeak, peakEquity: sim.peakEquity,
    returnPerYear: (profit / equity / years) * 100,
    equityMultiple: (equity + profit) / equity,
    perLot: i.lots > 0 ? profit / i.lots : 0,
    months: Math.max(end, sim.months), timeline: sim.timeline, phases: ph,
    uses: [
      { label: 'Land + closing', total: purchase, note: `Land ${short(i.landPrice)} + ${i.purchaseCostsPct}%` },
      { label: 'Approvals and soft costs', total: parts.soft, note: 'Engineering, survey, legal, approvals' },
      { label: 'Site works + contingency', total: parts.hard, note: `Roads and services, ${i.contingencyPct}% contingency` },
      { label: 'City fees + permits', total: parts.city, note: 'Per lot' },
      { label: 'Vertical build', total: parts.vertical, note: `${short(C(i.buildCostPerHome))} a home + ${i.contingencyPct}% contingency` },
      { label: 'Selling costs', total: grossSales * ((i.commissionPct + i.closingPct + i.marketingPct) / 100) + extra, note: 'Commission, closing, marketing, warranty' },
      { label: 'G&A', total: grossSales * (i.adminPct / 100), note: `${i.adminPct}% of sales` },
      { label: 'HOA + holding costs', total: parts.hoaHold, note: 'Subsidy and carrying costs while unsold' },
      { label: 'Interest', total: sim.interestTotal, note: `${i.interestPct}% a year on the loan` },
    ].filter(u => u.total > 0.5),
  }
}

export const WAYS: Way[] = ['land', 'paper', 'pads', 'homes']
export const runAll = (i: Inputs, shift: CaseShift) => WAYS.map(w => runWay(w, i, shift))

/** Compact money: 2.1M, 345K, 780. */
export function short(n: number, symbol = ''): string {
  const a = Math.abs(n), s = n < 0 ? '-' : ''
  if (a >= 1e6) return `${s}${symbol}${(a / 1e6).toFixed(2)}M`
  if (a >= 1e3) return `${s}${symbol}${Math.round(a / 1e3)}K`
  return `${s}${symbol}${Math.round(a)}`
}
