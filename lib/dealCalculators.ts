// Extracted from app/invest/page.tsx so the Deal Decision Engine
// (lib/dealDecisionEngine.ts, app/api/deal-decision-engine/route.ts) can
// reuse the exact same calculation logic instead of duplicating it.
// page.tsx now imports these instead of defining them locally.

// How a purchase is funded (form.financeType):
//   'mortgage' (default) — deposit % + repayment mortgage (rate %, term in years)
//   'cash'               — bought outright, no finance payment
//   'option'             — purchase option agreement / lease option: pay the owner an
//                          option fee now and a monthly payment, buy later at an agreed price
// Blank fields fall back to defaults; a typed 0 stays 0 (0% rate, 0% deposit).
export function financeFor(d: any, price: number, defaultRate: number) {
  const num = (v: any, def: number) => { if (v === undefined || v === null || v === '') return def; const x = parseFloat(v); return Number.isFinite(x) ? x : def }
  const financeType = d.financeType === 'cash' || d.financeType === 'option' ? d.financeType : 'mortgage'
  if (financeType === 'cash') return { financeType, depositAmt: price, loanAmt: 0, monthlyMortgage: 0 }
  if (financeType === 'option') {
    const optionFee = num(d.optionFee, 0), optionMonthly = num(d.optionMonthly, 0), optionYears = num(d.optionYears, 5)
    const optionPrice = num(d.optionPrice, price), optionEndValue = num(d.optionEndValue, price)
    const credited = d.optionCredit === 'yes' ? optionFee + optionMonthly * 12 * optionYears : 0
    const optionToPayAtEnd = Math.max(0, optionPrice - credited)
    return { financeType, depositAmt: optionFee, loanAmt: 0, monthlyMortgage: optionMonthly, optionFee, optionMonthly, optionYears, optionPrice, optionEndValue, optionCredited: credited, optionToPayAtEnd, optionEquityAtEnd: optionEndValue - optionPrice }
  }
  const deposit = num(d.deposit, 25), rate = num(d.mortgageRate, defaultRate), years = num(d.mortgageTerm, 25)
  const depositAmt = price * deposit / 100
  const loanAmt = Math.max(0, price - depositAmt)
  const n = Math.max(1, Math.round(years * 12)), r = rate / 100 / 12
  const monthlyMortgage = loanAmt <= 0 ? 0 : r === 0 ? loanAmt / n : loanAmt * r / (1 - Math.pow(1 + r, -n))
  return { financeType, depositAmt, loanAmt, monthlyMortgage }
}

export function calcBTL(d: any) {
  const price = parseFloat(d.price)||0
  const rent = parseFloat(d.rent)||0
  const expenses = parseFloat(d.expenses)||20
  const refurb = parseFloat(d.refurb)||0
  const fin = financeFor(d, price, 5)
  const { depositAmt, loanAmt, monthlyMortgage } = fin
  const monthlyExpenses = rent * expenses / 100
  const monthlyCashflow = rent - monthlyMortgage - monthlyExpenses
  const annualCashflow = monthlyCashflow * 12
  const totalInvested = depositAmt + refurb
  const grossYield = price > 0 ? (rent*12/price*100) : 0
  const netYield = totalInvested > 0 ? (annualCashflow/totalInvested*100) : 0
  const roi = totalInvested > 0 ? (annualCashflow/totalInvested*100) : 0
  return { ...fin, depositAmt, loanAmt, monthlyMortgage, monthlyExpenses, monthlyCashflow, annualCashflow, grossYield, netYield, roi, totalInvested }
}

export function calcHMO(d: any) {
  const price = parseFloat(d.price)||0
  const rooms = parseInt(d.rooms)||4
  const rentPerRoom = parseFloat(d.rentPerRoom)||600
  const expenses = parseFloat(d.expenses)||35
  const refurb = parseFloat(d.refurb)||0
  const totalRent = rooms * rentPerRoom
  const fin = financeFor(d, price, 5.5)
  const { depositAmt, loanAmt, monthlyMortgage } = fin
  const monthlyExpenses = totalRent * expenses / 100
  const monthlyCashflow = totalRent - monthlyMortgage - monthlyExpenses
  const annualCashflow = monthlyCashflow * 12
  const totalInvested = depositAmt + refurb
  const grossYield = price > 0 ? (totalRent*12/price*100) : 0
  const roi = totalInvested > 0 ? (annualCashflow/totalInvested*100) : 0
  return { ...fin, depositAmt, loanAmt, monthlyMortgage, monthlyExpenses, monthlyCashflow, annualCashflow, grossYield, roi, totalInvested, totalRent }
}

// Rent to Rent / Rent to HMO.
// For Rent to HMO you can rent an N-bed house and convert it into more
// lettable rooms: `rooms` is the rooms you let (after conversion),
// `currentRooms` the bedrooms as rented, `conversionCost` the building work
// and `conversionMonths` the time with no income while you still pay rent.
export function calcR2R(d: any) {
  const base = r2rCore(d, parseInt(d.rooms) || 1)
  const currentRooms = parseInt(d.currentRooms) || 0
  const conversionCost = parseFloat(d.conversionCost) || 0
  const conversionMonths = Math.max(0, parseFloat(d.conversionMonths) || 0)
  const leaseMonths = parseInt(d.leaseMonths) || 24
  const furnitureCost = parseFloat(d.setupCost) || 0
  const b = base.breakdown
  // While converting you still pay the landlord and the property's bills
  const holdingCost = conversionMonths * (b.landlordRent + b.utilities + b.propertyTax + b.insurance)
  // Paid to the landlord before you get the keys (default 1 month each)
  // £ amounts; left blank = one month's rent each
  const amt = (v: any) => v === undefined || v === null || v === '' ? b.landlordRent : Math.max(0, parseFloat(v) || 0)
  const landlordDeposit = amt(d.landlordDeposit)
  const advanceRent = amt(d.advanceRent)
  const sunkCost = furnitureCost + conversionCost + holdingCost          // spent, not coming back
  const totalUpfront = sunkCost + landlordDeposit + advanceRent          // cash needed on day one
  const paybackBase = sunkCost + landlordDeposit                         // advance rent is month 1's rent, already in costs
  const roi = totalUpfront > 0 ? (base.annualCashflow / totalUpfront * 100) : 0
  const paybackMonths = base.monthlyCashflow > 0 ? paybackBase / base.monthlyCashflow + conversionMonths : null
  const withinLeaseTerm = paybackMonths !== null ? paybackMonths <= leaseMonths : null
  const earningMonths = Math.max(0, leaseMonths - conversionMonths)
  const leaseProfit = base.monthlyCashflow * earningMonths - sunkCost   // deposit comes back at the end

  // Same house let as it is, with no conversion — for the side-by-side
  let asIs: any = null
  const units = parseInt(d.rooms) || 1
  if (currentRooms > 0 && currentRooms !== units) {
    const a = r2rCore(d, currentRooms)
    const aPayback = a.monthlyCashflow > 0 ? (furnitureCost + landlordDeposit) / a.monthlyCashflow : null
    const aUpfront = furnitureCost + landlordDeposit + advanceRent
    asIs = {
      rooms: currentRooms, totalIncome: a.totalIncome, monthlyCashflow: a.monthlyCashflow, annualCashflow: a.annualCashflow,
      upfront: aUpfront, roi: aUpfront > 0 ? a.annualCashflow / aUpfront * 100 : 0,
      paybackMonths: aPayback, leaseProfit: a.monthlyCashflow * leaseMonths - furnitureCost,
    }
  }
  const extraMonthly = asIs ? base.monthlyCashflow - asIs.monthlyCashflow : null
  const conversionPayback = asIs && extraMonthly && extraMonthly > 0 ? (conversionCost + holdingCost) / extraMonthly + conversionMonths : null

  return {
    ...base, roi, furnitureCost, conversionCost, conversionMonths, holdingCost, landlordDeposit, advanceRent, sunkCost, totalUpfront, paybackBase,
    paybackMonths, leaseMonths, withinLeaseTerm, earningMonths, leaseProfit,
    rooms: units, currentRooms: currentRooms || null, asIs, extraMonthly, conversionPayback,
  }
}

function r2rCore(d: any, units: number) {
  const landlordRent = parseFloat(d.rent)||0
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
  const totalIncome = residentRent * units
  const fixedCosts = landlordRent + wifi + utilities + management + insurance + propertyTax + cleaning + maintenance + marketing + vacancy
  const monthlyCashflow = totalIncome - fixedCosts
  return {
    monthlyCashflow, annualCashflow: monthlyCashflow * 12, totalIncome, monthlyExpenses: fixedCosts,
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
  if (strategy === 'r2hmo') strategy = 'r2r' // Rent to HMO uses the Rent to Rent maths
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
  if (strategy === 'r2hmo') strategy = 'r2r'
  const f = { ...form }
  if (scenario.ratePts && (!f.financeType || f.financeType === 'mortgage')) {
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
