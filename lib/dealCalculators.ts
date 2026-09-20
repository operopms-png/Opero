// Extracted from app/invest/page.tsx so the Deal Decision Engine
// (lib/dealDecisionEngine.ts, app/api/deal-decision-engine/route.ts) can
// reuse the exact same calculation logic instead of duplicating it.
// page.tsx now imports these instead of defining them locally.

export function calcBTL(d: any) {
  const price = parseFloat(d.price)||0
  const deposit = parseFloat(d.deposit)||25
  const rent = parseFloat(d.rent)||0
  const mortgage = parseFloat(d.mortgageRate)||5
  const expenses = parseFloat(d.expenses)||20
  const refurb = parseFloat(d.refurb)||0
  const depositAmt = price * deposit / 100
  const loanAmt = price - depositAmt
  const monthlyMortgage = loanAmt * (mortgage/100/12) / (1 - Math.pow(1+mortgage/100/12, -300))
  const monthlyExpenses = rent * expenses / 100
  const monthlyCashflow = rent - monthlyMortgage - monthlyExpenses
  const annualCashflow = monthlyCashflow * 12
  const totalInvested = depositAmt + refurb
  const grossYield = price > 0 ? (rent*12/price*100) : 0
  const netYield = totalInvested > 0 ? (annualCashflow/totalInvested*100) : 0
  const roi = totalInvested > 0 ? (annualCashflow/totalInvested*100) : 0
  return { depositAmt, loanAmt, monthlyMortgage, monthlyExpenses, monthlyCashflow, annualCashflow, grossYield, netYield, roi, totalInvested }
}

export function calcHMO(d: any) {
  const price = parseFloat(d.price)||0
  const deposit = parseFloat(d.deposit)||25
  const rooms = parseInt(d.rooms)||4
  const rentPerRoom = parseFloat(d.rentPerRoom)||600
  const mortgage = parseFloat(d.mortgageRate)||5.5
  const expenses = parseFloat(d.expenses)||35
  const refurb = parseFloat(d.refurb)||0
  const totalRent = rooms * rentPerRoom
  const depositAmt = price * deposit / 100
  const loanAmt = price - depositAmt
  const monthlyMortgage = loanAmt * (mortgage/100/12) / (1 - Math.pow(1+mortgage/100/12, -300))
  const monthlyExpenses = totalRent * expenses / 100
  const monthlyCashflow = totalRent - monthlyMortgage - monthlyExpenses
  const annualCashflow = monthlyCashflow * 12
  const totalInvested = depositAmt + refurb
  const grossYield = price > 0 ? (totalRent*12/price*100) : 0
  const roi = totalInvested > 0 ? (annualCashflow/totalInvested*100) : 0
  return { depositAmt, loanAmt, monthlyMortgage, monthlyExpenses, monthlyCashflow, annualCashflow, grossYield, roi, totalInvested, totalRent }
}

export function calcR2R(d: any) {
  const landlordRent = parseFloat(d.rent)||0
  const units = parseInt(d.rooms)||1
  const residentRent = parseFloat(d.subletRent)||0
  const wifi = parseFloat(d.wifiCost)||0
  const utilities = parseFloat(d.utilitiesCost)||0
  const management = parseFloat(d.managementCost)||0
  const insurance = parseFloat(d.insuranceCost)||0
  const propertyTax = parseFloat(d.propertyTaxCost)||0
  const cleaning = parseFloat(d.cleaningCost)||0
  const maintenance = parseFloat(d.maintenanceCost)||0
  const marketing = parseFloat(d.marketingCost)||0
  const vacancy = parseFloat(d.vacancyCost)||0
  const furnitureCost = parseFloat(d.setupCost)||0
  const leaseMonths = parseInt(d.leaseMonths)||12

  const totalIncome = residentRent * units
  const fixedCosts = landlordRent + wifi + utilities + management + insurance + propertyTax + cleaning + maintenance + marketing + vacancy
  const monthlyCashflow = totalIncome - fixedCosts
  const annualCashflow = monthlyCashflow * 12
  const roi = furnitureCost > 0 ? (annualCashflow/furnitureCost*100) : 0
  const paybackMonths = monthlyCashflow > 0 ? furnitureCost / monthlyCashflow : null
  const withinLeaseTerm = paybackMonths !== null ? paybackMonths <= leaseMonths : null

  return {
    monthlyCashflow, annualCashflow, roi, totalIncome, monthlyExpenses: fixedCosts,
    furnitureCost, paybackMonths, leaseMonths, withinLeaseTerm,
    breakdown: { landlordRent, wifi, utilities, management, insurance, propertyTax, cleaning, maintenance, marketing, vacancy },
  }
}

export function calcFlip(d: any) {
  const purchase = parseFloat(d.price)||0
  const refurb = parseFloat(d.refurb)||0
  const salePrice = parseFloat(d.salePrice)||0
  const purchaseCosts = purchase * 0.05
  const saleCosts = salePrice * 0.03
  const totalCost = purchase + refurb + purchaseCosts + saleCosts
  const profit = salePrice - totalCost
  const roi = totalCost > 0 ? (profit/totalCost*100) : 0
  return { totalCost, profit, roi, purchaseCosts, saleCosts }
}

export function calcLand(d: any) {
  const purchase = parseFloat(d.price)||0
  const planningCost = parseFloat(d.planningCost)||5000
  const gdv = parseFloat(d.gdv)||0
  const buildCost = parseFloat(d.buildCost)||0
  const totalCost = purchase + planningCost + buildCost
  const profit = gdv - totalCost
  const roi = totalCost > 0 ? (profit/totalCost*100) : 0
  return { totalCost, profit, roi }
}

// Stress test: re-runs the same calc function with interest rate and/or
// rent shocked, so an investor can see how cash flow and ROI hold up
// under adverse conditions before committing -- the kind of check a
// lender or serious investor does before funding a deal. Strategies
// without recurring rental cash flow (flip, land) are one-off profit
// plays, not "will this cash flow every month" plays, so they're
// intentionally excluded rather than stress-tested for cash flow.
export function getStressScenarios(strategy: string) {
  if (['btl','brrr','social','supported','hmo'].includes(strategy)) {
    return [
      { key:'base',  label:'Base Case',       ratePts:0, rentPct:0   },
      { key:'rate',  label:'Interest +2%',    ratePts:2, rentPct:0   },
      { key:'rent',  label:'Rent -10%',       ratePts:0, rentPct:-10 },
      { key:'worst', label:'Worst Case',      ratePts:2, rentPct:-10 },
    ]
  }
  if (strategy === 'r2r') {
    return [
      { key:'base',  label:'Base Case',        rentPct:0    },
      { key:'rent10',label:'Resident Rent -10%',rentPct:-10 },
      { key:'void',  label:'1 Month Void / Yr', rentPct:-8.3, note:'approximated as an equivalent income reduction' },
      { key:'worst', label:'Worst Case',        rentPct:-18 },
    ]
  }
  return null
}

export function applyStress(strategy: string, form: any, scenario: { ratePts?: number; rentPct?: number }) {
  const f = { ...form }
  if (scenario.ratePts) {
    const baseRate = parseFloat(f.mortgageRate) || (strategy==='hmo' ? 5.5 : 5)
    f.mortgageRate = String(baseRate + scenario.ratePts)
  }
  if (scenario.rentPct) {
    if (strategy === 'hmo') {
      f.rentPerRoom = String((parseFloat(f.rentPerRoom)||600) * (1 + scenario.rentPct/100))
    } else if (strategy === 'r2r') {
      f.subletRent = String((parseFloat(f.subletRent)||0) * (1 + scenario.rentPct/100))
    } else {
      f.rent = String((parseFloat(f.rent)||0) * (1 + scenario.rentPct/100))
    }
  }
  if (strategy==='btl'||strategy==='brrr') return calcBTL(f)
  if (strategy==='social'||strategy==='supported') return calcBTL({ ...f, expenses: f.expenses||'10' })
  if (strategy==='hmo') return calcHMO(f)
  if (strategy==='r2r') return calcR2R(f)
  return {}
}
