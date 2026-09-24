'use client'
import { useEffect, useState } from 'react'
import { supabase, getAccountId } from '../../../lib/supabase'

const ACCENT = '#3B4AFF'
const COLORS = { str: '#3B4AFF', pm: '#10B981', ea: '#F59E0B', dev: '#8B5CF6' }

function fmtMoney(n: number) {
  return '£' + Math.round(n).toLocaleString('en-GB')
}
function pct(n: number, d: number) {
  if (!d) return 0
  return Math.round((n / d) * 100)
}
function monthKey(d: Date) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') }
function monthLabel(d: Date) { return d.toLocaleDateString('en-GB', { month: 'short' }) }
const NOT_DONE = ['resolved', 'completed', 'done', 'closed']
function isOpen(status: string) { return !NOT_DONE.includes((status || '').toLowerCase()) }

export default function OversightPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    const accountId = await getAccountId(user)

    const [
      strProps, strMaint, strTx, strCompliance,
      pmProps, pmUnits, pmTenants, pmBuildings, pmMaint, pmTx, pmCompliance,
      eaProps, eaUnits, eaTenants, eaBuildings, eaMaint, eaTx, eaCompliance,
      devProjects, devUnits, devBudget, devMilestones, devCompliance,
      team,
      marketingEmails, crmActivities, salesLeads, companyDocuments,
    ] = await Promise.all([
      supabase.from('properties').select('id,status').eq('user_id', accountId),
      supabase.from('maintenance_tickets').select('id,status,created_at,property_id'),
      supabase.from('str_transactions').select('amount,type,date').eq('user_id', accountId),
      supabase.from('str_compliance').select('id,expiry_date').eq('user_id', accountId),
      supabase.from('pm_properties').select('id,status').eq('user_id', accountId),
      supabase.from('pm_units').select('id,status').eq('user_id', accountId),
      supabase.from('pm_tenants').select('id,created_at').eq('user_id', accountId),
      supabase.from('pm_buildings').select('id').eq('user_id', accountId),
      supabase.from('pm_maintenance').select('id,status,created_at').eq('user_id', accountId),
      supabase.from('pm_transactions').select('amount,type,date').eq('user_id', accountId),
      supabase.from('pm_compliance').select('id,expiry_date').eq('user_id', accountId),
      supabase.from('estate_properties').select('id,status').eq('user_id', accountId),
      supabase.from('estate_units').select('id,status').eq('user_id', accountId),
      supabase.from('estate_tenants').select('id,created_at').eq('user_id', accountId),
      supabase.from('estate_buildings').select('id').eq('user_id', accountId),
      supabase.from('estate_maintenance').select('id,status,created_at').eq('user_id', accountId),
      supabase.from('estate_transactions').select('amount,type,date').eq('user_id', accountId),
      supabase.from('estate_compliance').select('id,expiry_date').eq('user_id', accountId),
      supabase.from('dev_projects').select('id,name,status,total_budget,spent').eq('user_id', accountId),
      supabase.from('dev_units').select('id,status').eq('user_id', accountId),
      supabase.from('dev_budget_items').select('actual,created_at').eq('user_id', accountId),
      supabase.from('dev_milestones').select('id,status,due_date,created_at').eq('user_id', accountId),
      supabase.from('dev_compliance').select('id,expiry_date').eq('user_id', accountId),
      supabase.from('team_members').select('id,role,custom_modules').eq('user_id', accountId),
      supabase.from('marketing_emails').select('id,status,sent_at,created_at').eq('user_id', accountId),
      supabase.from('crm_activities').select('id,type,created_at').eq('user_id', accountId),
      supabase.from('sales_leads').select('id,created_at,status').eq('user_id', accountId),
      supabase.from('company_documents').select('id,created_at').eq('user_id', accountId),
    ])

    // Email opens/clicks live on marketing_email_events, keyed off the
    // sent email's id rather than the account directly, so fetch them
    // scoped to this account's own marketing_emails ids.
    const emailIds = (marketingEmails.data ?? []).map((e: any) => e.id)
    const { data: emailEventsData } = emailIds.length
      ? await supabase.from('marketing_email_events').select('id,marketing_email_id,type,created_at').in('marketing_email_id', emailIds)
      : { data: [] as any[] }

    // Bookings need the real property-id filter (properties table has no
    // account_id column of its own to join on directly here), so fetch
    // them scoped to this account's actual property ids.
    const strPropIds = (strProps.data ?? []).map((p: any) => p.id)
    const { data: bookingsData } = strPropIds.length
      ? await supabase.from('bookings').select('id,check_in,check_out,created_at,property_id').in('property_id', strPropIds)
      : { data: [] as any[] }

    setData({
      accountId,
      str: { props: strProps.data ?? [], bookings: bookingsData ?? [], maint: (strMaint.data ?? []).filter((m: any) => strPropIds.includes(m.property_id)), tx: strTx.data ?? [], compliance: strCompliance.data ?? [] },
      pm: { props: pmProps.data ?? [], units: pmUnits.data ?? [], tenants: pmTenants.data ?? [], buildings: pmBuildings.data ?? [], maint: pmMaint.data ?? [], tx: pmTx.data ?? [], compliance: pmCompliance.data ?? [] },
      ea: { props: eaProps.data ?? [], units: eaUnits.data ?? [], tenants: eaTenants.data ?? [], buildings: eaBuildings.data ?? [], maint: eaMaint.data ?? [], tx: eaTx.data ?? [], compliance: eaCompliance.data ?? [] },
      dev: { projects: devProjects.data ?? [], units: devUnits.data ?? [], budget: devBudget.data ?? [], milestones: devMilestones.data ?? [], compliance: devCompliance.data ?? [] },
      team: team.data ?? [],
      marketingEmails: marketingEmails.data ?? [],
      emailEvents: emailEventsData ?? [],
      crmActivities: crmActivities.data ?? [],
      salesLeads: salesLeads.data ?? [],
      companyDocuments: companyDocuments.data ?? [],
    })
    setLoading(false)
  }

  if (loading || !data) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#98A2B3' }}>Loading...</div>

  const now = new Date()
  const thisMonth = monthKey(now)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000)

  const sumTx = (tx: any[], type: string, monthOnly = true) =>
    tx.filter((t: any) => t.type === type && (!monthOnly || (t.date && t.date.slice(0, 7) === thisMonth)))
      .reduce((s: number, t: any) => s + (parseFloat(t.amount) || 0), 0)

  const strRevenue = sumTx(data.str.tx, 'Income')
  const pmRevenue = sumTx(data.pm.tx, 'Income')
  const eaRevenue = sumTx(data.ea.tx, 'Income')
  const strExpenses = sumTx(data.str.tx, 'Expense')
  const pmExpenses = sumTx(data.pm.tx, 'Expense')
  const eaExpenses = sumTx(data.ea.tx, 'Expense')
  const devSpent = data.dev.projects.reduce((s: number, p: any) => s + (parseFloat(p.spent) || 0), 0)
  const devBudgetTotal = data.dev.projects.reduce((s: number, p: any) => s + (parseFloat(p.total_budget) || 0), 0)

  const totalRevenue = strRevenue + pmRevenue + eaRevenue
  const totalExpenses = strExpenses + pmExpenses + eaExpenses

  const pmOccupied = data.pm.units.filter((u: any) => (u.status || '').toLowerCase() === 'occupied').length
  const pmOccPct = pct(pmOccupied, data.pm.units.length)
  const eaOccupied = data.ea.units.filter((u: any) => (u.status || '').toLowerCase() !== 'vacant').length + data.ea.props.filter((p: any) => (p.status || '').toLowerCase() === 'rented').length
  const eaTotalUnits = data.ea.units.length + data.ea.props.length
  const eaOccPct = pct(eaOccupied, eaTotalUnits)
  const strOccupiedToday = new Set(data.str.bookings.filter((b: any) => b.check_in <= now.toISOString().slice(0, 10) && b.check_out > now.toISOString().slice(0, 10)).map((b: any) => b.property_id)).size
  const strOccPct = pct(strOccupiedToday, data.str.props.length)
  const devPctBuilt = pct(devSpent, devBudgetTotal || 1)

  const avgOccupancy = Math.round(([strOccPct, pmOccPct, eaOccPct].reduce((a, b) => a + b, 0)) / 3) || 0

  const openTasks =
    data.str.maint.filter((m: any) => isOpen(m.status)).length +
    data.pm.maint.filter((m: any) => isOpen(m.status)).length +
    data.ea.maint.filter((m: any) => isOpen(m.status)).length +
    data.dev.milestones.filter((m: any) => isOpen(m.status)).length

  const totalProperties = data.str.props.length + data.pm.props.length + data.ea.props.length
  const totalTenants = data.pm.tenants.length + data.ea.tenants.length
  const totalBlocks = data.pm.buildings.length + data.ea.buildings.length
  const totalUnits = data.pm.units.length + data.ea.units.length
  const vacantProperties =
    data.pm.units.filter((u: any) => (u.status || '').toLowerCase() === 'vacant').length +
    data.ea.units.filter((u: any) => (u.status || '').toLowerCase() === 'vacant').length +
    data.ea.props.filter((p: any) => (p.status || '').toLowerCase() === 'available').length

  const complianceAll = [...data.str.compliance, ...data.pm.compliance, ...data.ea.compliance, ...data.dev.compliance]
  const todayStr = now.toISOString().slice(0, 10)
  const in30 = new Date(now.getTime() + 30 * 86400000).toISOString().slice(0, 10)
  const overdueCompliance = complianceAll.filter((c: any) => c.expiry_date && c.expiry_date < todayStr).length
  const dueSoonCompliance = complianceAll.filter((c: any) => c.expiry_date && c.expiry_date >= todayStr && c.expiry_date <= in30).length
  const okCompliance = complianceAll.length - overdueCompliance - dueSoonCompliance

  // Team headcount per module -- how many staff currently have each
  // module granted (custom_modules override, else every non-restricted
  // role counts toward the modules its ROLE_MODULES default includes;
  // kept simple here to what's directly on the row).
  const headcount = { str: 0, pm: 0, ea: 0, dev: 0 }
  for (const m of data.team) {
    const mods: string[] = m.custom_modules ?? []
    for (const k of Object.keys(headcount)) {
      if (mods.includes(k) || (m.custom_modules == null && ['Admin', 'Viewer'].includes(m.role))) (headcount as any)[k]++
    }
  }
  const maxHeadcount = Math.max(1, ...Object.values(headcount))

  const modules = [
    { key: 'str', name: 'Vacation Rentals', icon: '🏖️', revenue: strRevenue, expenses: strExpenses, occLabel: strOccPct + '% occ.', occPct: strOccPct, tasks: data.str.maint.filter((m: any) => isOpen(m.status)).length },
    { key: 'pm', name: 'Property Management', icon: '🏢', revenue: pmRevenue, expenses: pmExpenses, occLabel: pmOccPct + '% occ.', occPct: pmOccPct, tasks: data.pm.maint.filter((m: any) => isOpen(m.status)).length },
    { key: 'ea', name: 'Estate Agency', icon: '🏠', revenue: eaRevenue, expenses: eaExpenses, occLabel: eaOccPct + '% let', occPct: eaOccPct, tasks: data.ea.maint.filter((m: any) => isOpen(m.status)).length },
    { key: 'dev', name: 'Developments', icon: '🏗️', revenue: 0, expenses: devSpent, occLabel: devPctBuilt + '% spent', occPct: devPctBuilt, tasks: data.dev.milestones.filter((m: any) => isOpen(m.status)).length },
  ]

  const pipeline = [
    { label: 'New bookings this week (STR)', value: data.str.bookings.filter((b: any) => new Date(b.created_at) >= sevenDaysAgo).length, icon: '🛎️' },
    { label: 'New tenants this week (PM)', value: data.pm.tenants.filter((t: any) => new Date(t.created_at) >= sevenDaysAgo).length, icon: '🔑' },
    { label: 'New tenants this week (EA)', value: data.ea.tenants.filter((t: any) => new Date(t.created_at) >= sevenDaysAgo).length, icon: '🤝' },
    { label: 'Milestones completed (Dev)', value: data.dev.milestones.filter((m: any) => !isOpen(m.status) && new Date(m.created_at) >= sevenDaysAgo).length, icon: '🏗️' },
  ]

  const alerts: { icon: string; title: string; detail: string; bg: string }[] = []
  if (overdueCompliance > 0) alerts.push({ icon: '⚠️', title: `${overdueCompliance} compliance check${overdueCompliance === 1 ? '' : 's'} overdue`, detail: 'Across all modules', bg: '#FEF2F2' })
  if (dueSoonCompliance > 0) alerts.push({ icon: '📋', title: `${dueSoonCompliance} compliance check${dueSoonCompliance === 1 ? '' : 's'} due in 30 days`, detail: 'Across all modules', bg: '#FFFBEB' })
  const staleMaint = [...data.str.maint, ...data.pm.maint, ...data.ea.maint].filter((m: any) => isOpen(m.status) && new Date(m.created_at) < sevenDaysAgo).length
  if (staleMaint > 0) alerts.push({ icon: '🔧', title: `${staleMaint} maintenance ticket${staleMaint === 1 ? '' : 's'} open 7+ days`, detail: 'STR, PM & EA combined', bg: '#FEF2F2' })
  if (vacantProperties > 0) alerts.push({ icon: '🔑', title: `${vacantProperties} vacant propert${vacantProperties === 1 ? 'y' : 'ies'}`, detail: 'PM & EA combined', bg: '#FFFBEB' })
  const overdueMilestones = data.dev.milestones.filter((m: any) => isOpen(m.status) && m.due_date && m.due_date < todayStr).length
  if (overdueMilestones > 0) alerts.push({ icon: '📉', title: `${overdueMilestones} development milestone${overdueMilestones === 1 ? '' : 's'} overdue`, detail: 'Developments', bg: '#FFFBEB' })
  if (alerts.length === 0) alerts.push({ icon: '✅', title: 'Nothing needs attention', detail: 'All modules look clear right now', bg: '#ECFDF5' })

  // Business activity -- emails, engagement, meetings & leads, all scoped
  // to the last 7 days so this reads as "what's happening" rather than
  // an all-time total.
  const sentEmails = data.marketingEmails.filter((e: any) => new Date(e.created_at) >= sevenDaysAgo).length
  const emailOpens = data.emailEvents.filter((e: any) => e.type === 'email.opened' && new Date(e.created_at) >= sevenDaysAgo).length
  const emailClicks = data.emailEvents.filter((e: any) => e.type === 'email.clicked' && new Date(e.created_at) >= sevenDaysAgo).length
  const meetingsLogged = data.crmActivities.filter((a: any) => a.type === 'Meeting' && new Date(a.created_at) >= sevenDaysAgo).length
  const callsLogged = data.crmActivities.filter((a: any) => a.type === 'Call' && new Date(a.created_at) >= sevenDaysAgo).length
  const newLeads = data.salesLeads.filter((l: any) => new Date(l.created_at) >= sevenDaysAgo).length
  const documentsUploaded = data.companyDocuments.filter((d: any) => new Date(d.created_at) >= sevenDaysAgo).length

  const activityStats = [
    { label: 'Emails sent', value: String(sentEmails), icon: '📤' },
    { label: 'Emails opened', value: String(emailOpens), icon: '👀' },
    { label: 'Email clicks', value: String(emailClicks), icon: '🖱️' },
    { label: 'New leads', value: String(newLeads), icon: '📈' },
    { label: 'Meetings logged', value: String(meetingsLogged), icon: '🤝' },
    { label: 'Calls logged', value: String(callsLogged), icon: '📞' },
    { label: 'Documents uploaded', value: String(documentsUploaded), icon: '📄' },
  ]

  // Revenue by module, last 6 months (STR/PM/EA only — Developments has
  // no comparable recurring-revenue figure; it runs on project spend).
  const months: Date[] = []
  for (let i = 5; i >= 0; i--) months.push(new Date(now.getFullYear(), now.getMonth() - i, 1))
  const monthlyIncome = (tx: any[], k: string) =>
    tx.filter((t: any) => t.type === 'Income' && t.date && t.date.slice(0, 7) === k).reduce((s: number, t: any) => s + (parseFloat(t.amount) || 0), 0)
  const maxMonthRevenue = Math.max(1, ...months.map(d => {
    const k = monthKey(d)
    return [data.str.tx, data.pm.tx, data.ea.tx].reduce((s, tx) => s + monthlyIncome(tx, k), 0)
  }))
  const chartMonths = months.map(d => {
    const k = monthKey(d)
    return { label: monthLabel(d), str: pct(monthlyIncome(data.str.tx, k), maxMonthRevenue), pm: pct(monthlyIncome(data.pm.tx, k), maxMonthRevenue), ea: pct(monthlyIncome(data.ea.tx, k), maxMonthRevenue) }
  })

  const topStats = [
    { label: 'Total revenue this month', value: fmtMoney(totalRevenue) },
    { label: 'Properties managed', value: String(totalProperties) },
    { label: 'Open tasks', value: String(openTasks) },
    { label: 'Avg. occupancy (STR/PM/EA)', value: avgOccupancy + '%' },
  ]
  const portfolioStats = [
    { label: 'Total tenants', value: String(totalTenants), sub: 'PM & EA combined', icon: '🧑‍🤝‍🧑' },
    { label: 'Total properties', value: String(totalProperties), sub: 'STR, PM & EA combined', icon: '🏘️' },
    { label: 'Apartment blocks / units', value: `${totalBlocks} / ${totalUnits}`, sub: 'PM & EA combined', icon: '🏢' },
    { label: 'Vacant properties', value: String(vacantProperties), sub: totalUnits ? pct(vacantProperties, totalUnits) + '% of units' : '', icon: '🔑' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#F7F8FA', fontFamily: "'Inter',sans-serif", padding: '24px 28px' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#101828', margin: '0 0 4px' }}>Dashboard</h1>
        <div style={{ fontSize: 13, color: '#667085' }}>Everything happening across Vacation Rentals, Property Management, Estate Agency &amp; Developments — this month.</div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#101828', marginBottom: 12 }}>Business activity — last 7 days</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 10 }}>
          {activityStats.map(s => (
            <div key={s.label} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', padding: '14px 12px' }}>
              <div style={{ fontSize: 15, marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#101828' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#667085', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: '#98A2B3', marginTop: 8 }}>Document views aren't tracked yet — "Documents uploaded" counts new files added this week. Let me know if you want view-tracking built.</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
        {topStats.map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', padding: 20 }}>
            <div style={{ fontSize: 12, color: '#667085', fontWeight: 500, marginBottom: 10 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#101828' }}>{s.value}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        {portfolioStats.map(p => (
          <div key={p.label} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 15 }}>{p.icon}</span>
              <div style={{ fontSize: 12, color: '#667085', fontWeight: 500 }}>{p.label}</div>
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#101828' }}>{p.value}</div>
            {p.sub && <div style={{ fontSize: 11, color: '#98A2B3', marginTop: 2 }}>{p.sub}</div>}
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#101828', marginBottom: 12 }}>This week's pipeline</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          {pipeline.map(pl => (
            <div key={pl.label} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', padding: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: '#F2F4F7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{pl.icon}</div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#101828' }}>{pl.value}</div>
                <div style={{ fontSize: 11, color: '#667085' }}>{pl.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #F2F4F7', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#101828' }}>Module breakdown</div>
          <div style={{ fontSize: 12, color: '#98A2B3' }}>Revenue, costs &amp; workload by module</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 95px 95px 85px 150px 80px 40px', padding: '10px 20px', background: '#F9FAFB', borderBottom: '1px solid #E4E7EC', fontSize: 11, fontWeight: 600, color: '#667085', textTransform: 'uppercase', gap: 8 }}>
          <span>Module</span><span>Revenue</span><span>Expenses</span><span>Margin</span><span>Occupancy / progress</span><span>Tasks</span><span></span>
        </div>
        {modules.map(m => {
          const margin = m.revenue > 0 ? pct(m.revenue - m.expenses, m.revenue) : (m.key === 'dev' ? null : 0)
          const color = (COLORS as any)[m.key]
          return (
            <a key={m.key} href={`/${m.key === 'ea' ? 'estate' : m.key}`} style={{ display: 'grid', gridTemplateColumns: '1fr 95px 95px 85px 150px 80px 40px', padding: '14px 20px', borderBottom: '1px solid #F2F4F7', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'inherit' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{m.icon}</div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#101828' }}>{m.name}</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#101828' }}>{m.revenue ? fmtMoney(m.revenue) : '—'}</span>
              <span style={{ fontSize: 13, color: '#B42318' }}>{fmtMoney(m.expenses)}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: margin == null ? '#98A2B3' : '#10B981' }}>{margin == null ? '—' : margin + '%'}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 6, background: '#F2F4F7', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 4, background: color, width: Math.min(100, m.occPct) + '%' }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color, whiteSpace: 'nowrap' as const }}>{m.occLabel}</span>
              </div>
              <span style={{ fontSize: 13, color: '#344054' }}>{m.tasks}</span>
              <span style={{ fontSize: 12, color: ACCENT, fontWeight: 600 }}>→</span>
            </a>
          )
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.9fr 0.9fr', gap: 16 }}>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#101828', marginBottom: 4 }}>Revenue by module — last 6 months</div>
          <div style={{ fontSize: 11, color: '#98A2B3', marginBottom: 10 }}>Developments isn't shown here — it runs on project spend, not recurring revenue.</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 140, padding: '0 4px' }}>
            {chartMonths.map(mo => (
              <div key={mo.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: '100%' }}>
                  <div style={{ width: 9, borderRadius: '3px 3px 0 0', background: COLORS.str, height: mo.str + '%' }} />
                  <div style={{ width: 9, borderRadius: '3px 3px 0 0', background: COLORS.pm, height: mo.pm + '%' }} />
                  <div style={{ width: 9, borderRadius: '3px 3px 0 0', background: COLORS.ea, height: mo.ea + '%' }} />
                </div>
                <div style={{ fontSize: 11, color: '#98A2B3' }}>{mo.label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 14, paddingTop: 14, borderTop: '1px solid #F2F4F7' }}>
            {[{ l: 'Vacation Rentals', c: COLORS.str }, { l: 'Property Mgmt', c: COLORS.pm }, { l: 'Estate Agency', c: COLORS.ea }].map(l => (
              <div key={l.l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#344054' }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: l.c }} />{l.l}
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#101828' }}>Team &amp; compliance</div>
          <div>
            <div style={{ fontSize: 11, color: '#98A2B3', marginBottom: 8, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '.04em' }}>Team headcount by module</div>
            {(['str', 'pm', 'ea', 'dev'] as const).map(k => (
              <div key={k} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#344054', marginBottom: 4 }}>
                  <span>{k === 'str' ? 'Vacation Rentals' : k === 'pm' ? 'Property Management' : k === 'ea' ? 'Estate Agency' : 'Developments'}</span>
                  <span style={{ fontWeight: 600, color: (COLORS as any)[k] }}>{(headcount as any)[k]}</span>
                </div>
                <div style={{ height: 6, background: '#F2F4F7', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 4, background: (COLORS as any)[k], width: pct((headcount as any)[k], maxHeadcount) + '%' }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid #F2F4F7', paddingTop: 12 }}>
            <div style={{ fontSize: 11, color: '#98A2B3', marginBottom: 8, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '.04em' }}>Compliance</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, padding: 10, borderRadius: 8, background: '#FEF2F2', textAlign: 'center' as const }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#B42318' }}>{overdueCompliance}</div>
                <div style={{ fontSize: 10, color: '#B42318' }}>Overdue</div>
              </div>
              <div style={{ flex: 1, padding: 10, borderRadius: 8, background: '#FFFBEB', textAlign: 'center' as const }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#B54708' }}>{dueSoonCompliance}</div>
                <div style={{ fontSize: 10, color: '#B54708' }}>Due in 30 days</div>
              </div>
              <div style={{ flex: 1, padding: 10, borderRadius: 8, background: '#ECFDF5', textAlign: 'center' as const }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#10B981' }}>{Math.max(0, okCompliance)}</div>
                <div style={{ fontSize: 10, color: '#10B981' }}>Up to date</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#101828', marginBottom: 2 }}>Needs attention</div>
          {alerts.map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: 10, borderRadius: 8, background: a.bg }}>
              <span style={{ fontSize: 15, flexShrink: 0 }}>{a.icon}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#101828' }}>{a.title}</div>
                <div style={{ fontSize: 11, color: '#667085', marginTop: 2 }}>{a.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
