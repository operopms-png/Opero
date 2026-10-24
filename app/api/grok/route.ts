import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireStaff } from '@/lib/admin-auth'

// Staff assistant for the Staff Centre dashboard. Read only: it answers questions
// from the records it is given and cannot change records or send messages.
// Requires XAI_API_KEY and XAI_MODEL in the Netlify environment variables.

export const maxDuration = 60

const RULES = `You cannot change any records, send messages, make payments or delete anything. Any draft you write is for a member of staff to read and send.
You do not give legal advice. For deposits, notice, eviction or Right to Rent questions, say that a member of staff must handle it.
Use only the records given to you. If the answer is not in them, say so. Keep answers short and plain.`

const ROLES: Record<string, { label: string; instructions: string }> = {
  general: {
    label: 'Assistant',
    instructions: `You are the operations assistant for The NOVOURQ Portal, the staff portal of Sangsters Group.\n${RULES}`,
  },
  property_manager: {
    label: 'Property Manager',
    instructions: `You are the Property Manager assistant for The NOVOURQ Portal. Each day you check every daily area in the records given: rent and arrears, leases ending, head leases, maintenance, cleaning, inspections, keys, compliance, HMO rooms, deadlines, insurance, utilities, right-to-rent rechecks, viewings and vacancies, today's short stay check-ins and check-outs, bookings, and reviews without a reply. Say what needs a person and why, most urgent first. Draft tenant replies and contractor requests for a person to approve, and never send them yourself.\n${RULES}`,
  },
}

const DAY = 86400000
const CLOSED = ['completed', 'closed', 'resolved', 'paid', 'done', 'cancelled', 'returned']

type Check = {
  label: string
  table: string
  // 'open': not closed yet. 'due': open and a date field is within 60 days (or past).
  // 'today': a date field is today. 'all': every row (small lists).
  mode: 'open' | 'due' | 'today' | 'all'
  dates?: string[]
  unreplied?: boolean
}

// The daily checks the Property Manager role runs. Columns the code does not know
// are simply ignored, so a missing column never breaks the snapshot.
const CHECKS: Check[] = [
  { label: 'late_rent', table: 'pm_rent_payments', mode: 'due', dates: ['due_date'] },
  { label: 'leases_ending', table: 'pm_leases', mode: 'due', dates: ['end_date'] },
  { label: 'head_leases', table: 'pm_head_leases', mode: 'due', dates: ['expiry_date', 'break_date'] },
  { label: 'maintenance', table: 'pm_maintenance', mode: 'open' },
  { label: 'maintenance_str', table: 'maintenance_tickets', mode: 'open' },
  { label: 'cleaning_pm', table: 'pm_cleaning_tasks', mode: 'open' },
  { label: 'cleaning_str', table: 'cleaning_tasks', mode: 'open' },
  { label: 'inspections', table: 'pm_inspections', mode: 'due', dates: ['inspection_date', 'due_date', 'scheduled_date'] },
  { label: 'keys', table: 'pm_keys', mode: 'all' },
  { label: 'compliance', table: 'pm_compliance', mode: 'due', dates: ['expiry_date'] },
  { label: 'compliance_str', table: 'str_compliance', mode: 'due', dates: ['expiry_date'] },
  { label: 'hmo_licences', table: 'pm_hmo_rooms', mode: 'due', dates: ['licence_expiry'] },
  { label: 'insurance', table: 'pm_insurance_policies', mode: 'due', dates: ['renewal_date'] },
  { label: 'utilities', table: 'pm_utilities', mode: 'due', dates: ['next_bill_date'] },
  { label: 'right_to_rent', table: 'pm_right_to_rent_checks', mode: 'due', dates: ['recheck_date', 'next_check_date', 'expiry_date'] },
  { label: 'viewings', table: 'pm_viewings', mode: 'today', dates: ['viewing_date', 'date', 'scheduled_at'] },
  { label: 'vacancies', table: 'pm_vacancies', mode: 'open' },
  { label: 'stays_today', table: 'bookings', mode: 'today', dates: ['check_in', 'check_out'] },
  { label: 'reviews_unanswered', table: 'str_reviews', mode: 'open', unreplied: true },
]

function isOpen(row: any) {
  return !CLOSED.includes(String(row.status ?? '').toLowerCase())
}

// Builds a read-only snapshot of the daily checks. Uses the signed-in member's own token,
// so the database's access rules decide what they can see.
async function propertyManagerSnapshot(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const db = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } })
  const today = new Date().toISOString().slice(0, 10)
  const in60 = new Date(Date.now() + 60 * DAY).toISOString().slice(0, 10)

  const fetchRows = async (table: string): Promise<any[]> => {
    try {
      const { data } = await db.from(table).select('*').limit(300)
      return data ?? []
    } catch {
      return []
    }
  }
  const results = await Promise.all(CHECKS.map(c => fetchRows(c.table)))

  const snapshot: Record<string, any> = { date: today }
  CHECKS.forEach((check, i) => {
    const rows = (results[i] as any[]).filter(row => {
      if (check.unreplied) return row.responded !== true
      if (check.mode === 'all') return true
      if (check.mode === 'open') return isOpen(row)
      const dates = (check.dates ?? []).map(f => row[f]).filter(Boolean).map(String)
      if (check.mode === 'due') return isOpen(row) && dates.some(d => d <= in60)
      if (check.mode === 'today') return dates.some(d => d.slice(0, 10) === today)
      return false
    })
    snapshot[check.label] = rows.slice(0, 50)
  })
  return snapshot
}

export async function POST(req: NextRequest) {
  const staffId = await requireStaff(req)
  if (!staffId) return NextResponse.json({ error: 'Sign in to use the assistant.' }, { status: 401 })

  const apiKey = process.env.XAI_API_KEY
  const model = process.env.XAI_MODEL
  if (!apiKey || !model) return NextResponse.json({ error: 'The assistant is not set up yet. Add XAI_API_KEY and XAI_MODEL in the site settings.' }, { status: 503 })

  const body = await req.json().catch(() => null)
  const message = String(body?.message ?? '').trim().slice(0, 4000)
  if (!message) return NextResponse.json({ error: 'Type a question first.' }, { status: 400 })
  const roleId = ROLES[body?.role] ? String(body.role) : 'general'
  const role = ROLES[roleId]

  let input = message
  if (roleId === 'property_manager') {
    const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
    const snapshot = await propertyManagerSnapshot(token)
    input = `${message}\n\nRecords as of today (JSON):\n${JSON.stringify(snapshot).slice(0, 60000)}`
  }

  const ctrl = new AbortController()
  const stop = setTimeout(() => ctrl.abort(), 50000)
  let res: Response
  try {
    res = await fetch('https://api.x.ai/v1/responses', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        instructions: role.instructions,
        input,
      }),
    })
  } catch {
    return NextResponse.json({ error: 'The assistant did not answer in time. Try again.' }, { status: 504 })
  } finally {
    clearTimeout(stop)
  }

  const data = await res.json().catch(() => null)
  if (!res.ok) return NextResponse.json({ error: data?.error?.message ?? 'The assistant could not answer.' }, { status: 502 })

  // Responses API: text is in output[] message items as output_text parts.
  const reply = typeof data?.output_text === 'string'
    ? data.output_text
    : (data?.output ?? [])
        .filter((item: any) => item?.type === 'message')
        .flatMap((item: any) => item?.content ?? [])
        .filter((part: any) => part?.type === 'output_text')
        .map((part: any) => part?.text ?? '')
        .join('')
  return NextResponse.json({ reply, role: role.label })
}
