import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/admin-auth'
import { callClaudeWithDocument } from '@/lib/claude'

// Reads the actual uploaded bank statement (PDF or photo) and has Claude
// look at it directly -- rather than app/api/assess-affordability's
// approach of trusting a staff member's own manual checklist. Both routes
// stay in the app: this one is used automatically once a file has been
// uploaded, the older checklist-only one remains as a fallback when no
// file is attached yet.
export async function POST(req: NextRequest) {
  const userId = await requireUser(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { fileUrl, rent, declared_income, notes } = await req.json()
  if (!fileUrl) return NextResponse.json({ error: 'Upload a bank statement first.' }, { status: 400 })

  const fileRes = await fetch(fileUrl)
  if (!fileRes.ok) return NextResponse.json({ error: 'Could not read the uploaded file.' }, { status: 502 })
  const contentType = fileRes.headers.get('content-type') || ''
  const buffer = Buffer.from(await fileRes.arrayBuffer())
  const base64 = buffer.toString('base64')

  const isPdf = contentType.includes('pdf') || /\.pdf$/i.test(fileUrl)
  const isPng = contentType.includes('png') || /\.png$/i.test(fileUrl)
  const isJpg = contentType.includes('jpeg') || contentType.includes('jpg') || /\.(jpe?g)$/i.test(fileUrl)
  if (!isPdf && !isPng && !isJpg) {
    return NextResponse.json({ error: 'Unsupported file type -- upload a PDF, JPG or PNG bank statement.' }, { status: 400 })
  }
  const mediaType = isPdf ? 'application/pdf' : isPng ? 'image/png' : 'image/jpeg'

  const income = parseFloat(declared_income) || null
  const rentAmount = parseFloat(rent) || 0
  const ratio = income ? Math.round((rentAmount / income) * 100) : null

  const contextLine = `Monthly rent: £${rentAmount}
${income ? `Declared monthly income: £${income}\nRent-to-income ratio: ${ratio}%` : "No declared income figure was given -- work out the applicant's actual average monthly income yourself from the statement."}
${notes ? `Staff notes: ${notes}` : ''}

The attached document is the applicant's bank statement. Read it yourself and base every finding below on what you actually see in it -- do not assume anything not shown in the transactions.`

  const system = `You are an affordability assessment assistant inside a UK property management system. Letting agency staff have uploaded a tenant applicant's bank statement (PDF or a photo of one) and want you to read it directly and give a second opinion -- not rely on a manual checklist.

From the transactions you can actually see in the document, determine:
1. Regular income deposits -- do they look like a consistent salary/wage, and roughly what is the monthly average?
2. Any unauthorized overdraft usage or persistent negative balance
3. Any bounced payments / returned direct debits
4. Any excessive or concerning gambling transactions

Stick strictly to these four financial checks and the rent-to-income math. Never comment on anything else in the statement (lifestyle judgements, or anything that touches a protected characteristic) -- if you notice something outside these four checks, ignore it.

Respond in this exact structure, plain text, no markdown headers:
Income deposits regular and matching declared employer: [Yes / No / Unclear] -- [one short reason from what you saw]
No unauthorized overdraft usage: [Yes / No / Unclear] -- [one short reason]
No bounced payments / returned direct debits: [Yes / No / Unclear] -- [one short reason]
No excessive gambling transactions: [Yes / No / Unclear] -- [one short reason]
Risk level: [Low / Moderate / High]
[2-4 sentences of reasoning tied to what you found and the rent-to-income ratio (UK guideline is roughly max 35-40%)]
[One practical suggestion if risk is Moderate or High, e.g. guarantor or higher deposit -- omit this line entirely if risk is Low]

This is advisory only for staff to weigh alongside their own judgement -- do not phrase it as a final approval or rejection decision.`

  const result = await callClaudeWithDocument(system, contextLine, { base64, mediaType }, 700)
  if (result.error) return NextResponse.json({ error: result.error }, { status: 502 })

  const text = result.text || ''
  const flag = (label: string) => new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ':\\s*(Yes|No|Unclear)', 'i').exec(text)?.[1]?.toLowerCase() === 'yes'

  return NextResponse.json({
    assessment: text,
    generated_at: new Date().toISOString(),
    flags: {
      income_regular: flag('Income deposits regular and matching declared employer'),
      no_overdraft: flag('No unauthorized overdraft usage'),
      no_bounced_payments: flag('No bounced payments / returned direct debits'),
      no_gambling_flags: flag('No excessive gambling transactions'),
    },
  })
}
