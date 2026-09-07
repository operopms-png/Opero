import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/admin-auth'
import { callClaude } from '@/lib/claude'

// Advisory affordability opinion, generated ONLY from the objective
// financial figures passed in (declared income, rent, which red flags
// staff ticked, their notes) -- never the tenant's name or any other
// identity/personal data, so the assessment stays purely financial.
// Stateless by design: works on whatever is currently in the form,
// even before it's saved -- the client attaches the result to the
// bank check record on the next Save Checks, rather than requiring a
// save-then-generate round trip.
export async function POST(req: NextRequest) {
  const userId = await requireUser(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { rent, declared_income, income_regular, no_overdraft, no_bounced_payments, no_gambling_flags, notes } = await req.json()

  const income = parseFloat(declared_income)
  if (!income) return NextResponse.json({ error: 'Add a declared income figure before generating an assessment.' }, { status: 400 })

  const rentAmount = parseFloat(rent) || 0
  const ratio = income > 0 ? Math.round((rentAmount / income) * 100) : null

  const flagLines = [
    `Income deposits regular and matching declared employer: ${income_regular ? 'Yes' : 'Not confirmed'}`,
    `No unauthorized overdraft usage: ${no_overdraft ? 'Yes' : 'Not confirmed'}`,
    `No bounced payments / returned direct debits: ${no_bounced_payments ? 'Yes' : 'Not confirmed'}`,
    `No excessive gambling transactions: ${no_gambling_flags ? 'Yes' : 'Not confirmed'}`,
  ].join('\n')

  const userMessage = `Monthly rent: £${rentAmount}
Declared monthly income: £${income}
Rent-to-income ratio: ${ratio}%

Staff review of bank statement:
${flagLines}

Staff notes: ${notes || '(none)'}`

  const system = `You are an affordability assessment assistant inside a UK property management system, giving letting agency staff a second opinion on a rental applicant's bank statement review. You will be given only objective financial figures and the staff's own checklist findings — never the applicant's name, background, or any other personal or protected characteristic. Base your assessment strictly on the financial data given: the rent-to-income ratio (UK guideline is roughly max 35-40%) and whatever red flags staff did or didn't confirm.

Respond in this exact structure, plain text, no markdown headers:
Risk level: [Low / Moderate / High]
[2-4 sentences of reasoning tied directly to the ratio and the specific flags above]
[One practical suggestion if risk is Moderate or High, e.g. guarantor or higher deposit — omit this line entirely if risk is Low]

This is advisory only for staff to weigh alongside their own judgement — do not phrase it as a final approval or rejection decision.`

  const result = await callClaude(system, userMessage, 400)
  if (result.error) return NextResponse.json({ error: result.error }, { status: 502 })

  return NextResponse.json({ assessment: result.text, generated_at: new Date().toISOString() })
}
