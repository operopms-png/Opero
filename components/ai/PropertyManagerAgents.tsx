'use client'
// AI Property Manager agents (guest replies, maintenance, cleaning, revenue,
// owner reports, lead qualification). Shown as a tab inside the AI page
// (Staff Centre → AI Receptionist); /ai-manager redirects there.
import { useEffect, useState } from 'react'
import { supabase, getAccountId } from '../../lib/supabase'
import { staffApi } from '../../lib/staff-api'
import { C, Stat, Pill, Group, Row, Empty, btn, input as inp, label as lbl } from '../crm/Page'
const ACCENT = C.goldDark

const ICON = <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2F6DB5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>

const AGENTS = [
  {
    key: 'guest',
    module: 'Vacation rentals',
    name: 'AI Guest Agent',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2F6DB5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>,
    desc: 'Answers guest questions 24/7, sends check-in/check-out instructions, Wi-Fi details, house rules, and handles common complaints.',
    capabilities: ['Answer guest questions 24/7','Send check-in/check-out instructions','Provide Wi-Fi details and house rules','Handle common complaints and requests','Respond to Airbnb, Booking.com & Vrbo enquiries','Sync calendars across platforms'],
  },
  {
    key: 'maintenance',
    module: 'Vacation rentals',
    name: 'AI Maintenance Coordinator',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2F6DB5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>,
    desc: 'Logs maintenance issues, assigns jobs to contractors, tracks repairs and follows up until work is completed.',
    capabilities: ['Log maintenance issues automatically','Assign jobs to contractors','Track repair progress','Follow up until work is completed','Notify owners of urgent issues'],
  },
  {
    key: 'cleaning',
    module: 'Vacation rentals',
    name: 'AI Cleaning Coordinator',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2F6DB5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l18 18M9 9l-6 6a2 2 0 002.83 2.83L12 11.8M14 4l6 6-3.5 3.5L10 7l4-3z"/></svg>,
    desc: 'Automatically schedules cleaners after bookings, notifies them of turnovers, tracks completion and generates reports.',
    capabilities: ['Automatically schedule cleaners after bookings','Notify cleaners of turnovers','Track cleaning completion','Generate cleaning reports','Flag missed or late cleans'],
  },
  {
    key: 'revenue',
    module: 'Vacation rentals',
    name: 'AI Revenue Manager',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2F6DB5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
    desc: 'Adjusts nightly rates automatically, monitors competitor pricing, increases rates during high demand and fills calendar gaps.',
    capabilities: ['Adjust nightly rates automatically','Monitor competitor pricing','Increase rates during high demand periods','Fill calendar gaps with discounts','Suggest minimum stay rules'],
  },
  {
    key: 'owner',
    module: 'Vacation rentals',
    name: 'AI Owner Relations Manager',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2F6DB5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
    desc: 'Generates monthly income reports, occupancy reports, expense tracking and profit & loss statements for owners.',
    capabilities: ['Monthly income reports','Occupancy reports','Expense tracking','Profit and loss statements','Proactive owner updates'],
  },
  {
    key: 'leads',
    module: 'Vacation rentals',
    name: 'AI Lead Qualification Agent',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2F6DB5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
    desc: 'Finds landlord leads, qualifies property owners, books appointments automatically and follows up with prospects.',
    capabilities: ['Find landlord leads','Qualify property owners','Book appointments automatically','Follow up with prospects','Score lead quality'],
  },
  {
    key: 'pm_compliance',
    module: 'Property management',
    name: 'AI Compliance Chaser',
    icon: ICON,
    desc: 'Watches the Compliance tab and drafts a reminder to the landlord when a certificate has expired or is due within 30 days.',
    capabilities: ['Spot expired and expiring certificates','Draft the reminder to the landlord','Chase again after three weeks if still out of date','Wait for your approval before anything is sent'],
  },
  {
    key: 'pm_renewals',
    module: 'Property management',
    name: 'AI Renewals Agent',
    icon: ICON,
    desc: 'Finds tenancies ending within 60 days with no renewal decision and drafts an email asking the tenant their plans.',
    capabilities: ['Find tenancies ending within 60 days','Skip tenancies already renewed or ended','Draft the email to the tenant','Wait for your approval before anything is sent'],
  },
  {
    key: 'pm_arrears',
    module: 'Property management',
    name: 'AI Arrears Escalation',
    icon: ICON,
    desc: 'Drafts a firmer email to tenants whose rent is more than 14 days overdue. The earlier text reminders stay on Finance, Reminders.',
    capabilities: ['Find rent more than 14 days overdue','Draft a firm payment request to the tenant','Ask the tenant to report any payment already made','Wait for your approval before anything is sent'],
  },
  {
    key: 'ea_viewings',
    module: 'Estate agency',
    name: 'AI Viewings Assistant',
    icon: ICON,
    desc: 'Drafts a reminder to the prospect the day before a viewing and a follow-up after it, from the Viewings tab.',
    capabilities: ['Draft viewing reminders','Draft follow-ups after the viewing','Skip cancelled viewings and no-shows','Wait for your approval before anything is sent'],
  },
  {
    key: 'ea_listings',
    module: 'Estate agency',
    name: 'AI Listing Writer',
    icon: ICON,
    desc: 'Writes a first-draft website description for listings that have none, using only the details on the property record.',
    capabilities: ['Find listings with no description','Write from the record only, with nothing invented','Save the description once you approve it'],
  },
  {
    key: 'dev_investors',
    module: 'Developments',
    name: 'AI Investor Updates',
    icon: ICON,
    desc: 'Drafts a monthly progress update to each investor from the project status, budget and open snagging items.',
    capabilities: ['Draft one update per investor each month','Use only the figures on the project record','No forecasts or promises of returns','Wait for your approval before anything is sent'],
  },
  {
    key: 'doc_reader',
    module: 'Property management',
    name: 'AI Document Reader',
    icon: ICON,
    desc: 'Reads uploaded tenancy agreements and compares the rent, deposit and dates with the lease record. If they differ, it proposes correcting the record.',
    capabilities: ['Read PDF or photo agreements on leases and tenancies','Compare rent, deposit, start and end dates with the record','Show you each difference before anything changes','Update the record only after you approve','Read up to 5 documents per day, and each only once'],
  },
  {
    key: 'pm_deposits',
    module: 'Property management',
    name: 'AI Deposit Protection Watch',
    icon: ICON,
    desc: 'Watches lease records for UK deposits with no protected date and warns you before the 30-day deadline and every day after it. It never contacts the tenant or landlord.',
    capabilities: ['Find deposits not yet protected','Alert you and create a task before the deadline','Keep reminding you daily once it is overdue','Skip Jamaica properties and ended leases'],
  },
  {
    key: 'pm_insurance',
    module: 'Property management',
    name: 'AI Insurance Renewals',
    icon: ICON,
    desc: 'Drafts a reminder to the landlord when a policy on the Insurance tab renews within 30 days or has passed its date.',
    capabilities: ['Find policies renewing within 30 days','Draft the reminder to the landlord','Create a task if the landlord has no email','Wait for your approval before anything is sent'],
  },
  {
    key: 'pm_inspections',
    module: 'Property management',
    name: 'AI Inspection Scheduler',
    icon: ICON,
    desc: 'Creates a task to book an inspection for any property with none done or booked in the last six months.',
    capabilities: ['Find properties not inspected in six months','Create a task for your team','Skip sold, closed and vacated properties'],
  },
  {
    key: 'pm_statements',
    module: 'Property management',
    name: 'AI Landlord Statement Reminders',
    icon: ICON,
    desc: 'From the 2nd to the 10th of each month, lists landlords who received rent last month but have no statement yet. The statement figures are still built on Reports, Landlord Reports.',
    capabilities: ['Find landlords with rent received last month and no statement','Create a task and alert listing them','Stop reminding once the statements are saved'],
  },
  {
    key: 'maint_followup',
    module: 'Property management',
    name: 'AI Maintenance Follow-up',
    icon: ICON,
    desc: 'Chases jobs still open after 3 days. Vacation-rental tickets get a drafted status request to the assigned person; Property Management jobs become a task.',
    capabilities: ['Find jobs open more than 3 days','Draft a status request to the assigned person','Create a task when nobody is assigned','Wait for your approval before anything is sent'],
  },
  {
    key: 'maint_predict',
    module: 'Property management',
    name: 'AI Predictive Maintenance',
    icon: ICON,
    desc: 'Every Monday, looks for properties with repeat repair problems of the same kind in the last 12 months and drafts a note to the landlord recommending a preventive check.',
    capabilities: ['Spot repeat boiler, leak, electrical, roof, appliance and air conditioning jobs','Draft a preventive-check note to the landlord','Wait for your approval before anything is sent'],
  },
  {
    key: 'market_forecast',
    module: 'Investment & Portfolio',
    name: 'AI Market and Rent Forecast',
    icon: ICON,
    desc: 'On the 1st of each month, compares your lettings rents with live market rates and drafts a short rent outlook to you, with a suggestion for each property.',
    capabilities: ['Check live market rents for each letting','Say whether rent is below, in line with or above the market','Email the outlook to you once you approve'],
  },
  {
    key: 'accounting_export',
    module: 'Finance',
    name: 'AI Accounting export',
    icon: ICON,
    desc: 'At the start of each month, totals last month\'s invoices and expenses, flags expenses with no category, and reminds you to send it to your accountant.',
    capabilities: ['Check the records every day','Leave one task for you','Change or send nothing by itself'],
  },
  {
    key: 'templates_review',
    module: 'Company',
    name: 'AI SOP and template review',
    icon: ICON,
    desc: 'On the 1st of each month, lists SOPs, policies and contract templates that have not been reviewed for a year.',
    capabilities: ['Check the records every day','Leave one task for you','Change or send nothing by itself'],
  },
  {
    key: 'meetings_prep',
    module: 'Team',
    name: 'AI Meeting prep',
    icon: ICON,
    desc: 'The day before, lists tomorrow\'s meetings with your open and overdue tasks so you walk in prepared.',
    capabilities: ['Check the records every day','Leave one task for you','Change or send nothing by itself'],
  },
  {
    key: 'onboarding_help',
    module: 'Whole business',
    name: 'AI Setup helper',
    icon: ICON,
    desc: 'For a new account\'s first three weeks, lists the setup steps still to do, such as properties, logo and contact details.',
    capabilities: ['Check the records every day','Leave one task for you','Change or send nothing by itself'],
  },
  {
    key: 'ops_intel',
    module: 'Whole business',
    name: 'AI Operations Review',
    icon: ICON,
    desc: 'Monthly: rent paid on time, repairs open too long, properties with repeat repairs and empty properties, with a recommendation for each.',
    capabilities: ['Read your records and spot patterns','Leave one task with the figures and a recommendation','Change or send nothing by itself'],
  },
  {
    key: 'tenant_insights',
    module: 'Property Management',
    name: 'AI Tenant Watch',
    icon: ICON,
    desc: 'Mondays: finds tenants whose messages sound like complaints, tenants reporting repeat repairs and tenants who keep paying late.',
    capabilities: ['Read your records and spot patterns','Leave one task with the figures and a recommendation','Change or send nothing by itself'],
  },
  {
    key: 'cashflow_forecast',
    module: 'Finance',
    name: 'AI Cash-flow Outlook',
    icon: ICON,
    desc: 'Monthly: a 12-month forecast of rent in, mortgage and running costs out, the weakest month, and tenancies that end and cut income.',
    capabilities: ['Read your records and spot patterns','Leave one task with the figures and a recommendation','Change or send nothing by itself'],
  },
  {
    key: 'dev_feasibility',
    module: 'Developments',
    name: 'AI Development Feasibility',
    icon: ICON,
    desc: 'Mondays: for each live project, compares progress, spend and unit sales to project the final cost and margin.',
    capabilities: ['Read your records and spot patterns','Leave one task with the figures and a recommendation','Change or send nothing by itself'],
  },
  {
    key: 'doc_intel',
    module: 'Property Management',
    name: 'AI Document Check',
    icon: ICON,
    desc: 'Mondays: finds certificates and insurance on file with no Compliance record, and active tenancies with no agreement uploaded.',
    capabilities: ['Read your records and spot patterns','Leave one task with the figures and a recommendation','Change or send nothing by itself'],
  },
  {
    key: 'goal_planner',
    module: 'Investment & Portfolio',
    name: 'AI Goal planner',
    icon: ICON,
    desc: 'Tracks your portfolio goals each Monday, keeps the deal search pointed at them, and tells you what to do this week to stay on pace.',
    capabilities: ['Measure progress against each goal','Keep a daily deal search running for the goal','Leave a weekly report and one next step'],
  },
  {
    key: 'deal_finder',
    module: 'Investment & Portfolio',
    name: 'AI Deal finder',
    icon: ICON,
    desc: 'Searches for real listings that match what you asked for, every day, and learns from the ones you like or pass on.',
    capabilities: ['Search the web for real listings that fit your brief','Learn your taste from your likes and passes','Leave one task when new matches arrive'],
  },
  {
    key: 'deal_screening',
    module: 'Investment & Portfolio',
    name: 'AI Deal screening',
    icon: ICON,
    desc: 'Screens every new deal in Saved Deals against your rules and tells you which to go for, review or reject.',
    capabilities: ['Run your deal rules on each new deal','Mark screened deals and list a go, review or no-go for each','Leave the decision to move or reject a deal with you'],
  },
  {
    key: 'keys_check',
    module: 'Property management',
    name: 'AI Key checks',
    icon: ICON,
    desc: 'Finds key sets not checked in 6 months and lists them as one task.',
    capabilities: ['Check the records every day','Leave one task or draft for you','Wait for your approval before anything is sent'],
  },
  {
    key: 'head_lease_watch',
    module: 'Property management',
    name: 'AI Head lease watch',
    icon: ICON,
    desc: 'Warns 90 days before a head lease expires or reaches a break date.',
    capabilities: ['Check the records every day','Leave one task or draft for you','Wait for your approval before anything is sent'],
  },
  {
    key: 'risk_alerts',
    module: 'Property management',
    name: 'AI Sublet risk alerts',
    icon: ICON,
    desc: 'Flags sublet properties where tenant income is below the head rent you pay.',
    capabilities: ['Check the records every day','Leave one task or draft for you','Wait for your approval before anything is sent'],
  },
  {
    key: 'hmo_licence',
    module: 'Property management',
    name: 'AI HMO licences',
    icon: ICON,
    desc: 'Warns 60 days before an HMO licence expires.',
    capabilities: ['Check the records every day','Leave one task or draft for you','Wait for your approval before anything is sent'],
  },
  {
    key: 'utilities_watch',
    module: 'Property management',
    name: 'AI Utility bills',
    icon: ICON,
    desc: 'Lists utility bills due in the next 7 days.',
    capabilities: ['Check the records every day','Leave one task or draft for you','Wait for your approval before anything is sent'],
  },
  {
    key: 'mortgage_watch',
    module: 'Property management',
    name: 'AI Mortgage watch',
    icon: ICON,
    desc: 'Warns 120 days before a mortgage or loan ends so you can look at refinancing.',
    capabilities: ['Check the records every day','Leave one task or draft for you','Wait for your approval before anything is sent'],
  },
  {
    key: 'tenant_checks',
    module: 'Property management',
    name: 'AI Tenant checks',
    icon: ICON,
    desc: 'Finds tenants with no ID on file so referencing and ID checks get finished.',
    capabilities: ['Check the records every day','Leave one task or draft for you','Wait for your approval before anything is sent'],
  },
  {
    key: 'expense_sorter',
    module: 'Property management',
    name: 'AI Expense sorter',
    icon: ICON,
    desc: 'Finds recent expenses with no category so the books stay clean.',
    capabilities: ['Check the records every day','Leave one task or draft for you','Wait for your approval before anything is sent'],
  },
  {
    key: 'invoice_chase',
    module: 'Whole business',
    name: 'AI Invoice chase',
    icon: ICON,
    desc: 'Drafts a polite reminder for invoices more than 3 days overdue. Sent once you approve.',
    capabilities: ['Check the records every day','Leave one task or draft for you','Wait for your approval before anything is sent'],
  },
  {
    key: 'tax_watch',
    module: 'Whole business',
    name: 'AI Tax deadlines',
    icon: ICON,
    desc: 'Lists tax filings due within 30 days.',
    capabilities: ['Check the records every day','Leave one task or draft for you','Wait for your approval before anything is sent'],
  },
  {
    key: 'partner_payouts',
    module: 'Whole business',
    name: 'AI Partner payouts',
    icon: ICON,
    desc: 'Lists partner and investor payouts that are due.',
    capabilities: ['Check the records every day','Leave one task or draft for you','Wait for your approval before anything is sent'],
  },
  {
    key: 'smart_watch',
    module: 'Whole business',
    name: 'AI Smart home watch',
    icon: ICON,
    desc: 'Lists smart devices that are offline or low on battery.',
    capabilities: ['Check the records every day','Leave one task or draft for you','Wait for your approval before anything is sent'],
  },
  {
    key: 'review_replies',
    module: 'Vacation rentals',
    name: 'AI Review replies',
    icon: ICON,
    desc: 'Drafts a reply to each unanswered guest review and leaves it as a task to post.',
    capabilities: ['Check the records every day','Leave one task or draft for you','Wait for your approval before anything is sent'],
  },
  {
    key: 'dev_milestones',
    module: 'Developments',
    name: 'AI Milestone chaser',
    icon: ICON,
    desc: 'Lists development milestones past their due date.',
    capabilities: ['Check the records every day','Leave one task or draft for you','Wait for your approval before anything is sent'],
  },
  {
    key: 'dev_budget',
    module: 'Developments',
    name: 'AI Budget watch',
    icon: ICON,
    desc: 'Lists development budget lines that have gone over budget.',
    capabilities: ['Check the records every day','Leave one task or draft for you','Wait for your approval before anything is sent'],
  },
  {
    key: 'dev_snags',
    module: 'Developments',
    name: 'AI Snag chaser',
    icon: ICON,
    desc: 'Lists snags with nobody assigned or open more than 2 weeks.',
    capabilities: ['Check the records every day','Leave one task or draft for you','Wait for your approval before anything is sent'],
  },
  {
    key: 'dev_compliance',
    module: 'Developments',
    name: 'AI Development approvals',
    icon: ICON,
    desc: 'Warns 60 days before planning, building control and safety approvals expire.',
    capabilities: ['Check the records every day','Leave one task or draft for you','Wait for your approval before anything is sent'],
  },
  {
    key: 'dev_safety',
    module: 'Developments',
    name: 'AI Site safety watch',
    icon: ICON,
    desc: 'Lists live sites with no health and safety record in 14 days.',
    capabilities: ['Check the records every day','Leave one task or draft for you','Wait for your approval before anything is sent'],
  },
  {
    key: 'hr_watch',
    module: 'Team',
    name: 'AI People and HR',
    icon: ICON,
    desc: 'Training expiries, waiting staff requests, overdue onboarding and reviews not done in 12 months.',
    capabilities: ['Check the records every day','Leave one task or draft for you','Wait for your approval before anything is sent'],
  },
  {
    key: 'applications_watch',
    module: 'Team',
    name: 'AI Applications watch',
    icon: ICON,
    desc: 'Lists interviews coming up and applications waiting over 7 days.',
    capabilities: ['Check the records every day','Leave one task or draft for you','Wait for your approval before anything is sent'],
  },
  {
    key: 'team_weekly',
    module: 'Team',
    name: 'AI Team summary',
    icon: ICON,
    desc: 'Drafts a weekly summary of tasks, requests and applications to email to you.',
    capabilities: ['Check the records every day','Leave one task or draft for you','Wait for your approval before anything is sent'],
  },
  {
    key: 'weekly_report',
    module: 'Property management',
    name: 'AI Weekly Management Report',
    icon: ICON,
    desc: 'Every Monday, drafts an email to you with the week in counts: AI work, rent, maintenance, tenancies ending and expired certificates. The AI writes the summary and the figures come straight from your records.',
    capabilities: ['Count the week from your records','Write a short plain-English summary','Email it to you once you approve'],
  },
  {
    key: 'chief',
    module: 'Whole business',
    name: 'AI Chief of Staff',
    icon: ICON,
    desc: 'Reads the whole business each morning and writes a ranked plan for the day, as tasks on the Task board. You can also type an instruction in plain English and it sets up the work. Emails wait in Approvals.',
    capabilities: ['Plan the day from your records','Turn plain-English instructions into tasks','Draft emails to addresses you give it','Nothing is sent until you approve'],
  },
  {
    key: 'portfolio',
    module: 'Investment & Portfolio',
    name: 'AI Portfolio Intelligence',
    icon: ICON,
    desc: 'Used across Property Management and Developments. Totals rent, costs, mortgages and cash flow, estimates property values from public listings, and drafts a monthly portfolio review for you. The Portfolio page shows it all with a forecast.',
    capabilities: ['Portfolio valuation (estimated from public listings)','Asset performance and cash flow per property','Rental yields','Return and equity from your loan records','Investment forecasting with your own assumptions','Portfolio growth from rent actually received','Monthly review emailed to you once you approve'],
  },
  {
    key: 'rent_match',
    module: 'Property management',
    name: 'AI Rent Matcher',
    icon: ICON,
    desc: 'Matches money received on the Banking tab to unpaid rent and proposes marking it paid. Only exact matches are proposed.',
    capabilities: ['Match on the same amount, a date near the due date and the tenant name','Propose only when exactly one bank line fits','Leave unclear ones for you','Mark paid only after you approve'],
  },
]

export default function PropertyManagerAgents() {
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [style, setStyle] = useState({ tone: '', country_rules: '', signoff: '' })
  const [styleMsg, setStyleMsg] = useState('')
  const [section, setSection] = useState<'Agents'|'Activity log'|'Settings'>('Agents')
  const [activeAgents, setActiveAgents] = useState<Record<string,boolean>>({guest:false,maintenance:false,cleaning:false,revenue:false,owner:false,leads:false,pm_compliance:false,pm_renewals:false,pm_arrears:false,ea_viewings:false,ea_listings:false,dev_investors:false,rent_match:false,doc_reader:false,pm_deposits:false,pm_insurance:false,pm_inspections:false,pm_statements:false,maint_followup:false,maint_predict:false,market_forecast:false,accounting_export:false,templates_review:false,meetings_prep:false,onboarding_help:false,ops_intel:false,tenant_insights:false,cashflow_forecast:false,dev_feasibility:false,doc_intel:false,goal_planner:false,deal_finder:false,deal_screening:false,keys_check:false,head_lease_watch:false,risk_alerts:false,hmo_licence:false,utilities_watch:false,mortgage_watch:false,tenant_checks:false,expense_sorter:false,invoice_chase:false,tax_watch:false,partner_payouts:false,smart_watch:false,review_replies:false,dev_milestones:false,dev_budget:false,dev_snags:false,dev_compliance:false,dev_safety:false,hr_watch:false,applications_watch:false,team_weekly:false,weekly_report:false,portfolio:false,chief:false})
  const [activityLog, setActivityLog] = useState<any[]>([])
  const [showLogForm, setShowLogForm] = useState(false)
  const [logForm, setLogForm] = useState({agent:'guest',action:'',property:'',notes:''})
  const [selectedAgent, setSelectedAgent] = useState<string|null>(null)
  const [properties, setProperties] = useState<any[]>([])
  const [owners, setOwners] = useState<any[]>([])
  const [guestTest, setGuestTest] = useState({ property_id:'', guest_name:'', message:'' })
  const [guestReply, setGuestReply] = useState('')
  const [maintTest, setMaintTest] = useState({ property_id:'', title:'', description:'', priority:'medium' })
  const [maintReply, setMaintReply] = useState('')
  const [cleanTest, setCleanTest] = useState({ property_id:'', scheduled_date:'' })
  const [cleanReply, setCleanReply] = useState('')
  const [revTest, setRevTest] = useState({ property_id:'' })
  const [revReply, setRevReply] = useState<any>(null)
  const [ownerTest, setOwnerTest] = useState({ owner_id:'' })
  const [ownerReply, setOwnerReply] = useState<any>(null)
  const [leadTest, setLeadTest] = useState({ lead_name:'', source:'', inquiry:'' })
  const [leadReply, setLeadReply] = useState('')
  const [testing, setTesting] = useState(false)

  async function loadActivityLog(uid: string) {
    const { data } = await supabase.from('ai_activity_log').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(50)
    setActivityLog((data ?? []).map((l:any) => ({ id: l.id, agent: l.agent_key, action: l.action, property: l.property_name, notes: l.notes, createdAt: new Date(l.created_at).toLocaleString() })))
  }

  useEffect(()=>{
    supabase.auth.getUser().then(async ({data:{user}})=>{
      if(!user){window.location.href='/login';return}
      const accountId = await getAccountId(user)
      setUserId(accountId)
      const [agentsRes, propsRes, ownersRes] = await Promise.all([
        supabase.from('ai_agents').select('*').eq('user_id', accountId),
        supabase.from('properties').select('*').eq('user_id', accountId).order('created_at', { ascending: false }),
        supabase.from('owner_profiles').select('*').eq('business_id', accountId).order('created_at', { ascending: false }),
      ])
      if (agentsRes.data?.length) {
        const loaded: Record<string,boolean> = {guest:false,maintenance:false,cleaning:false,revenue:false,owner:false,leads:false}
        const autos: Record<string,boolean> = {}
        agentsRes.data.forEach((a:any) => { loaded[a.agent_key] = a.enabled; autos[a.agent_key] = a.auto_send !== false })
        setActiveAgents(loaded)
        setAutoSend(autos)
      }
      setProperties(propsRes.data ?? [])
      setOwners(ownersRes.data ?? [])
      await loadActivityLog(accountId)
      setLoading(false)
    })
  },[])
  useEffect(() => { staffApi('/api/ai-client-settings').then((d: any) => setStyle({ tone: d.tone, country_rules: d.country_rules, signoff: d.signoff })).catch(() => {}) }, [])
  if(loading) return <div style={{padding:40,color:C.faint,fontSize:14}}>Loading…</div>

  const [autoSend, setAutoSend] = useState<Record<string,boolean>>({})
  const toggleAuto = async (key:string) => {
    const next = !(autoSend[key] ?? true)
    setAutoSend({...autoSend,[key]:next})
    const who = (await supabase.auth.getUser()).data.user?.email ?? null
    const {error} = await supabase.from('ai_agents').upsert({ user_id: userId, agent_key: key, enabled: activeAgents[key] ?? false, auto_send: next, updated_at: new Date().toISOString(), changed_by: who, changed_at: new Date().toISOString() }, { onConflict: 'user_id,agent_key' })
    if (error) { setAutoSend({...autoSend,[key]:!next}) }
  }
  const toggleAgent = async (key:string) => {
    const next = !activeAgents[key]
    setActiveAgents({...activeAgents,[key]:next})
    if (userId) {
      const who = (await supabase.auth.getUser()).data.user?.email ?? null
      const {error} = await supabase.from('ai_agents').upsert({ user_id: userId, agent_key: key, enabled: next, updated_at: new Date().toISOString(), changed_by: who, changed_at: new Date().toISOString() }, { onConflict: 'user_id,agent_key' })
      if (error) { alert(error.message); setActiveAgents({...activeAgents,[key]:!next}); }
    }
  }
  const activeCount = Object.values(activeAgents).filter(Boolean).length

  async function authHeaders() {
    const { data: { session } } = await supabase.auth.getSession()
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` }
  }

  async function testGuestAgent() {
    if (!guestTest.property_id || !guestTest.message.trim() || !userId) return
    setTesting(true)
    setGuestReply('')
    const res = await fetch('/api/ai/guest-reply', {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(guestTest),
    })
    const result = await res.json()
    if (!res.ok) { alert(result.error || 'Could not get a reply'); setTesting(false); return }
    setGuestReply(result.reply)
    await loadActivityLog(userId)
    setTesting(false)
  }

  async function testMaintenanceAgent() {
    if (!maintTest.property_id || !maintTest.title.trim() || !userId) return
    setTesting(true); setMaintReply('')
    const res = await fetch('/api/ai/maintenance-reply', { method: 'POST', headers: await authHeaders(), body: JSON.stringify(maintTest) })
    const result = await res.json()
    if (!res.ok) { alert(result.error || 'Could not get a reply'); setTesting(false); return }
    setMaintReply(result.reply); await loadActivityLog(userId); setTesting(false)
  }

  async function testCleaningAgent() {
    if (!cleanTest.property_id || !cleanTest.scheduled_date || !userId) return
    setTesting(true); setCleanReply('')
    const res = await fetch('/api/ai/cleaning-reply', { method: 'POST', headers: await authHeaders(), body: JSON.stringify(cleanTest) })
    const result = await res.json()
    if (!res.ok) { alert(result.error || 'Could not get a reply'); setTesting(false); return }
    setCleanReply(result.reply); await loadActivityLog(userId); setTesting(false)
  }

  async function testRevenueAgent() {
    if (!revTest.property_id || !userId) return
    setTesting(true); setRevReply(null)
    const res = await fetch('/api/ai/revenue-suggest', { method: 'POST', headers: await authHeaders(), body: JSON.stringify(revTest) })
    const result = await res.json()
    if (!res.ok) { alert(result.error || 'Could not get a suggestion'); setTesting(false); return }
    setRevReply(result); await loadActivityLog(userId); setTesting(false)
  }

  async function testOwnerAgent() {
    if (!ownerTest.owner_id || !userId) return
    setTesting(true); setOwnerReply(null)
    const res = await fetch('/api/ai/owner-report', { method: 'POST', headers: await authHeaders(), body: JSON.stringify(ownerTest) })
    const result = await res.json()
    if (!res.ok) { alert(result.error || 'Could not draft a report'); setTesting(false); return }
    setOwnerReply(result); await loadActivityLog(userId); setTesting(false)
  }

  async function testLeadAgent() {
    if (!leadTest.inquiry.trim() || !userId) return
    setTesting(true); setLeadReply('')
    const res = await fetch('/api/ai/lead-qualify', { method: 'POST', headers: await authHeaders(), body: JSON.stringify(leadTest) })
    const result = await res.json()
    if (!res.ok) { alert(result.error || 'Could not qualify this lead'); setTesting(false); return }
    setLeadReply(result.reply); await loadActivityLog(userId); setTesting(false)
  }


  const toggle = (key: string) => (
    <span onClick={e => { e.stopPropagation(); toggleAgent(key) }} title={activeAgents[key] ? 'Switch off' : 'Switch on'} style={{ width: 36, height: 20, borderRadius: 10, background: activeAgents[key] ? C.green : C.border, position: 'relative', cursor: 'pointer', transition: 'background .2s', display: 'inline-block', flexShrink: 0 }}>
      <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: activeAgents[key] ? 18 : 2, transition: 'left .2s', boxShadow: '0 1px 2px rgba(0,0,0,.2)' }} />
    </span>
  )
  const current = AGENTS.find(a => a.key === selectedAgent)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12, marginBottom: 20 }}>
        <Stat label="Agents switched on" value={`${activeCount} of ${AGENTS.length}`} />
        <Stat label="Activities logged" value={activityLog.length} />
        <Stat label="Estimated time saved" value={activeCount * 8 + 'h/wk'} highlight />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        {(['Agents', 'Activity log', 'Settings'] as const).map(s => <button key={s} onClick={() => { setSection(s); setSelectedAgent(null) }} style={btn(section === s ? 'gold' : 'ghost', true)}>{s}</button>)}
        <div style={{ flex: 1 }} />
        {section === 'Activity log' && <button onClick={() => setShowLogForm(true)} style={btn('ghost', true)}>+ Log activity</button>}
      </div>

      {section === 'Settings' && (
        <div style={{ background: '#fff', borderRadius: 8, border: '1px solid ' + C.row, padding: 20, maxWidth: 720 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>How your AI agents write</div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 16, lineHeight: 1.5 }}>These apply to the drafts the agents write for you. Your team still approves every draft.</div>
          <label style={lbl}>Tone</label>
          <input style={{ ...inp, marginBottom: 12 }} value={style.tone} onChange={e => setStyle({ ...style, tone: e.target.value })} placeholder="e.g. warm and professional, short sentences" />
          <label style={lbl}>Country rules and wording</label>
          <textarea style={{ ...inp, minHeight: 100, resize: 'vertical', marginBottom: 12 }} value={style.country_rules} onChange={e => setStyle({ ...style, country_rules: e.target.value })} placeholder="e.g. UK lettings: refer to deposits as protected in a government scheme. Jamaica: amounts in J$, never mention UK legislation." />
          <label style={lbl}>Sign-off</label>
          <input style={{ ...inp, marginBottom: 14 }} value={style.signoff} onChange={e => setStyle({ ...style, signoff: e.target.value })} placeholder="Name used at the end of emails. Leave blank to use your company name." />
          <button style={btn('gold')} onClick={async () => { setStyleMsg(''); try { await staffApi('/api/ai-client-settings', style); setStyleMsg('Saved.') } catch (e: any) { setStyleMsg(e.message) } }}>Save</button>
          {styleMsg && <span style={{ marginLeft: 12, fontSize: 13, color: C.muted }}>{styleMsg}</span>}
        </div>
      )}

      {section === 'Agents' && !current && (
        <div>
        {Array.from(new Set(AGENTS.map(a => a.module))).map(mod => (
        <div key={mod} style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: C.muted, marginBottom: 10 }}>{mod}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
          {AGENTS.filter(a => a.module === mod).map(agent => (
            <div key={agent.key} onClick={() => setSelectedAgent(agent.key)} style={{ background: '#fff', borderRadius: 8, border: '1px solid ' + (activeAgents[agent.key] ? C.gold : C.row), padding: 18, cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>{agent.icon}{toggle(agent.key)}</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{agent.name}</div>
              <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>{agent.desc}</div>
              <div style={{ marginTop: 10 }}><Pill width={0} color={activeAgents[agent.key] ? C.green : C.grey}>{activeAgents[agent.key] ? 'On' : 'Off'}</Pill></div>
            </div>
          ))}
        </div>
        </div>
        ))}
        </div>
      )}

      {section === 'Agents' && current && [current].map(agent => (
        <div key={agent.key}>
          <button onClick={() => setSelectedAgent(null)} style={{ ...btn('ghost', true), marginBottom: 12 }}>← All agents</button>
          <div style={{ background: '#fff', borderRadius: 8, border: '1px solid ' + C.row, padding: 24, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 12 }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>{agent.icon}<div><div style={{ fontSize: 18, fontWeight: 600 }}>{agent.name}</div><div style={{ marginTop: 4 }}><Pill width={0} color={activeAgents[agent.key] ? C.green : C.grey}>{activeAgents[agent.key] ? 'On' : 'Off'}</Pill></div></div></div>
              <button onClick={() => toggleAgent(agent.key)} style={btn(activeAgents[agent.key] ? 'danger' : 'gold')}>{activeAgents[agent.key] ? 'Switch off' : 'Switch on'}</button>
            </div>
            <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, margin: '0 0 16px' }}>{agent.desc}</p>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, marginBottom: 16, cursor: 'pointer' }}>
              <input type="checkbox" checked={autoSend[agent.key] ?? true} onChange={() => toggleAuto(agent.key)} />
              <span><b>Send automatically.</b> Messages from this skill go out without waiting for approval (up to 40 a day). Untick to approve each one yourself.</span>
            </label>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>What it does</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 8 }}>
              {agent.capabilities.map(c => <div key={c} style={{ display: 'flex', gap: 8, fontSize: 13 }}><span style={{ color: C.green }}>✓</span>{c}</div>)}
            </div>
          </div>
          <div style={{ background: '#fff', borderRadius: 8, border: '1px solid ' + C.row, padding: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Recent activity</div>
            {activityLog.filter((l: any) => l.agent === agent.key).length === 0 ? <div style={{ color: C.faint, fontSize: 13, padding: '12px 0' }}>Nothing logged for this agent yet.</div> :
              activityLog.filter((l: any) => l.agent === agent.key).slice(0, 5).map((l: any) => (
                <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid ' + C.row, fontSize: 13 }}><span>{l.action}</span><span style={{ color: C.faint, fontSize: 12 }}>{l.createdAt}</span></div>
              ))}
          </div>
              {agent.key==='guest' && (
                <div style={{background:'#fff',borderRadius:8,border:'1px solid '+C.creamLine,padding:20,marginTop:20}}>
                  <div style={{fontSize:13,fontWeight:600,color:'#323338',marginBottom:4}}>Try it live</div>
                  <div style={{fontSize:12,color:'#676879',marginBottom:14}}>Simulates a guest message and gets a real AI-drafted reply using that property's WiFi, house rules, and check-in/out info (edit these under Vacation Rentals → Properties).</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                    <div><label style={lbl}>Property</label><select value={guestTest.property_id} onChange={e=>setGuestTest({...guestTest,property_id:e.target.value})} style={inp}><option value="">Select…</option>{properties.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                    <div><label style={lbl}>Guest Name</label><input value={guestTest.guest_name} onChange={e=>setGuestTest({...guestTest,guest_name:e.target.value})} placeholder="e.g. Sarah" style={inp}/></div>
                  </div>
                  <div style={{marginBottom:12}}><label style={lbl}>Guest Message</label><textarea value={guestTest.message} onChange={e=>setGuestTest({...guestTest,message:e.target.value})} rows={2} placeholder="e.g. What's the WiFi password?" style={{...inp,resize:'vertical' as const}}/></div>
                  <button onClick={testGuestAgent} disabled={testing||!guestTest.property_id||!guestTest.message.trim()} style={{...btn('gold'),fontSize:13,opacity:testing||!guestTest.property_id||!guestTest.message.trim()?0.6:1}}>{testing?'Thinking…':'Get AI Reply'}</button>
                  {guestReply && (
                    <div style={{marginTop:16,padding:16,borderRadius:6,background:'#FAFBFC',border:'1px solid #E6E9EF'}}>
                      <div style={{fontSize:11,fontWeight:600,color:'#676879',textTransform:'uppercase' as const,marginBottom:8}}>AI Draft Reply</div>
                      <div style={{fontSize:14,color:'#323338',whiteSpace:'pre-wrap' as const,lineHeight:1.6}}>{guestReply}</div>
                    </div>
                  )}
                </div>
              )}
              {agent.key==='maintenance' && (
                <div style={{background:'#fff',borderRadius:8,border:'1px solid '+C.creamLine,padding:20,marginTop:20}}>
                  <div style={{fontSize:13,fontWeight:600,color:'#323338',marginBottom:4}}>Try it live</div>
                  <div style={{fontSize:12,color:'#676879',marginBottom:14}}>Drafts a contractor assignment message, using your Team list to suggest who's best suited.</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                    <div><label style={lbl}>Property</label><select value={maintTest.property_id} onChange={e=>setMaintTest({...maintTest,property_id:e.target.value})} style={inp}><option value="">Select…</option>{properties.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                    <div><label style={lbl}>Priority</label><select value={maintTest.priority} onChange={e=>setMaintTest({...maintTest,priority:e.target.value})} style={inp}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
                  </div>
                  <div style={{marginBottom:12}}><label style={lbl}>Issue Title</label><input value={maintTest.title} onChange={e=>setMaintTest({...maintTest,title:e.target.value})} placeholder="e.g. AC not cooling" style={inp}/></div>
                  <div style={{marginBottom:12}}><label style={lbl}>Description</label><textarea value={maintTest.description} onChange={e=>setMaintTest({...maintTest,description:e.target.value})} rows={2} placeholder="Extra detail (optional)" style={{...inp,resize:'vertical' as const}}/></div>
                  <button onClick={testMaintenanceAgent} disabled={testing||!maintTest.property_id||!maintTest.title.trim()} style={{...btn('gold'),fontSize:13,opacity:testing||!maintTest.property_id||!maintTest.title.trim()?0.6:1}}>{testing?'Thinking…':'Get AI Reply'}</button>
                  {maintReply && (<div style={{marginTop:16,padding:16,borderRadius:6,background:'#FAFBFC',border:'1px solid #E6E9EF'}}><div style={{fontSize:11,fontWeight:600,color:'#676879',textTransform:'uppercase' as const,marginBottom:8}}>AI Draft</div><div style={{fontSize:14,color:'#323338',whiteSpace:'pre-wrap' as const,lineHeight:1.6}}>{maintReply}</div></div>)}
                </div>
              )}
              {agent.key==='cleaning' && (
                <div style={{background:'#fff',borderRadius:8,border:'1px solid '+C.creamLine,padding:20,marginTop:20}}>
                  <div style={{fontSize:13,fontWeight:600,color:'#323338',marginBottom:4}}>Try it live</div>
                  <div style={{fontSize:12,color:'#676879',marginBottom:14}}>Drafts a turnover-cleaning checklist for the cleaner, based on the property's house rules and guest capacity.</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                    <div><label style={lbl}>Property</label><select value={cleanTest.property_id} onChange={e=>setCleanTest({...cleanTest,property_id:e.target.value})} style={inp}><option value="">Select…</option>{properties.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                    <div><label style={lbl}>Turnover Date</label><input type="date" value={cleanTest.scheduled_date} onChange={e=>setCleanTest({...cleanTest,scheduled_date:e.target.value})} style={inp}/></div>
                  </div>
                  <button onClick={testCleaningAgent} disabled={testing||!cleanTest.property_id||!cleanTest.scheduled_date} style={{...btn('gold'),fontSize:13,opacity:testing||!cleanTest.property_id||!cleanTest.scheduled_date?0.6:1}}>{testing?'Thinking…':'Get AI Reply'}</button>
                  {cleanReply && (<div style={{marginTop:16,padding:16,borderRadius:6,background:'#FAFBFC',border:'1px solid #E6E9EF'}}><div style={{fontSize:11,fontWeight:600,color:'#676879',textTransform:'uppercase' as const,marginBottom:8}}>AI Draft</div><div style={{fontSize:14,color:'#323338',whiteSpace:'pre-wrap' as const,lineHeight:1.6}}>{cleanReply}</div></div>)}
                </div>
              )}
              {agent.key==='revenue' && (
                <div style={{background:'#fff',borderRadius:8,border:'1px solid '+C.creamLine,padding:20,marginTop:20}}>
                  <div style={{fontSize:13,fontWeight:600,color:'#323338',marginBottom:4}}>Try it live</div>
                  <div style={{fontSize:12,color:'#676879',marginBottom:14}}>Reasons from the property's own last-90-day occupancy and realized rates (no external competitor data source is connected yet) to suggest a rate change.</div>
                  <div style={{marginBottom:12}}><label style={lbl}>Property</label><select value={revTest.property_id} onChange={e=>setRevTest({...revTest,property_id:e.target.value})} style={inp}><option value="">Select…</option>{properties.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                  <button onClick={testRevenueAgent} disabled={testing||!revTest.property_id} style={{...btn('gold'),fontSize:13,opacity:testing||!revTest.property_id?0.6:1}}>{testing?'Thinking…':'Get AI Reply'}</button>
                  {revReply && (<div style={{marginTop:16,padding:16,borderRadius:6,background:'#FAFBFC',border:'1px solid #E6E9EF'}}><div style={{fontSize:11,fontWeight:600,color:'#676879',textTransform:'uppercase' as const,marginBottom:8}}>Occupancy {revReply.occupancyPct}% · Avg realized rate £{revReply.avgNightly}</div><div style={{fontSize:14,color:'#323338',whiteSpace:'pre-wrap' as const,lineHeight:1.6}}>{revReply.reply}</div></div>)}
                </div>
              )}
              {agent.key==='owner' && (
                <div style={{background:'#fff',borderRadius:8,border:'1px solid '+C.creamLine,padding:20,marginTop:20}}>
                  <div style={{fontSize:13,fontWeight:600,color:'#323338',marginBottom:4}}>Try it live</div>
                  <div style={{fontSize:12,color:'#676879',marginBottom:14}}>Drafts a monthly report email using this owner's real last-30-day bookings and their split percentage.</div>
                  <div style={{marginBottom:12}}><label style={lbl}>Owner</label><select value={ownerTest.owner_id} onChange={e=>setOwnerTest({...ownerTest,owner_id:e.target.value})} style={inp}><option value="">Select…</option>{owners.map((o:any)=><option key={o.id} value={o.id}>{o.name}</option>)}</select></div>
                  <button onClick={testOwnerAgent} disabled={testing||!ownerTest.owner_id} style={{...btn('gold'),fontSize:13,opacity:testing||!ownerTest.owner_id?0.6:1}}>{testing?'Thinking…':'Get AI Reply'}</button>
                  {ownerReply && (<div style={{marginTop:16,padding:16,borderRadius:6,background:'#FAFBFC',border:'1px solid #E6E9EF'}}><div style={{fontSize:11,fontWeight:600,color:'#676879',textTransform:'uppercase' as const,marginBottom:8}}>Revenue £{ownerReply.revenue?.toLocaleString()} · Owner Share £{ownerReply.ownerShare?.toLocaleString(undefined,{maximumFractionDigits:0})}</div><div style={{fontSize:14,color:'#323338',whiteSpace:'pre-wrap' as const,lineHeight:1.6}}>{ownerReply.reply}</div></div>)}
                </div>
              )}
              {agent.key==='leads' && (
                <div style={{background:'#fff',borderRadius:8,border:'1px solid '+C.creamLine,padding:20,marginTop:20}}>
                  <div style={{fontSize:13,fontWeight:600,color:'#323338',marginBottom:4}}>Try it live</div>
                  <div style={{fontSize:12,color:'#676879',marginBottom:14}}>Scores a landlord/owner inquiry and drafts a qualifying reply. Saves the lead to CRM Contacts if a name is given.</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                    <div><label style={lbl}>Lead Name</label><input value={leadTest.lead_name} onChange={e=>setLeadTest({...leadTest,lead_name:e.target.value})} placeholder="e.g. Michael Chen" style={inp}/></div>
                    <div><label style={lbl}>Source</label><input value={leadTest.source} onChange={e=>setLeadTest({...leadTest,source:e.target.value})} placeholder="e.g. Instagram DM" style={inp}/></div>
                  </div>
                  <div style={{marginBottom:12}}><label style={lbl}>Inquiry</label><textarea value={leadTest.inquiry} onChange={e=>setLeadTest({...leadTest,inquiry:e.target.value})} rows={3} placeholder="Paste the lead's message…" style={{...inp,resize:'vertical' as const}}/></div>
                  <button onClick={testLeadAgent} disabled={testing||!leadTest.inquiry.trim()} style={{...btn('gold'),fontSize:13,opacity:testing||!leadTest.inquiry.trim()?0.6:1}}>{testing?'Thinking…':'Get AI Reply'}</button>
                  {leadReply && (<div style={{marginTop:16,padding:16,borderRadius:6,background:'#FAFBFC',border:'1px solid #E6E9EF'}}><div style={{fontSize:11,fontWeight:600,color:'#676879',textTransform:'uppercase' as const,marginBottom:8}}>AI Analysis</div><div style={{fontSize:14,color:'#323338',whiteSpace:'pre-wrap' as const,lineHeight:1.6}}>{leadReply}</div></div>)}
                </div>
              )}
        </div>
      ))}

      {section === 'Activity log' && (
        <div>
          {showLogForm&&(<div style={{background:'#fff',borderRadius:8,border:'1px solid '+C.creamLine,padding:24,marginBottom:20}}>
            <h3 style={{fontSize:15,fontWeight:600,margin:'0 0 16px'}}>Log Activity</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              <div><label style={lbl}>Agent</label><select value={logForm.agent} onChange={e=>setLogForm({...logForm,agent:e.target.value})} style={inp}>{AGENTS.map(a=><option key={a.key} value={a.key}>{a.name}</option>)}</select></div>
              <div><label style={lbl}>Property</label><input value={logForm.property} onChange={e=>setLogForm({...logForm,property:e.target.value})} placeholder="Property name" style={inp}/></div>
              <div style={{gridColumn:'span 2' as const}}><label style={lbl}>Action *</label><input value={logForm.action} onChange={e=>setLogForm({...logForm,action:e.target.value})} placeholder="e.g. Sent check-in instructions to guest" style={inp}/></div>
              <div style={{gridColumn:'span 2' as const}}><label style={lbl}>Notes</label><textarea value={logForm.notes} onChange={e=>setLogForm({...logForm,notes:e.target.value})} rows={2} style={{...inp,resize:'vertical' as const}}/></div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={async ()=>{
                if(!logForm.action || !userId) return
                const {error} = await supabase.from('ai_activity_log').insert({ user_id: userId, agent_key: logForm.agent, action: logForm.action, property_name: logForm.property || null, notes: logForm.notes || null })
                if (error) { alert(error.message); return }
                await loadActivityLog(userId)
                setLogForm({agent:'guest',action:'',property:'',notes:''});setShowLogForm(false)
              }} style={{...btn('gold'),fontSize:13}}>Save</button>
              <button onClick={()=>setShowLogForm(false)} style={{...btn('ghost'),fontSize:13}}>Cancel</button>
            </div>
          </div>)}
          {activityLog.length === 0 ? <Empty>No activity logged yet. Switch an agent on and try it.</Empty> : (
            <Group title="Activity" color={C.gold} count={activityLog.length} cols={[{ k: 'a', l: 'Agent', w: 220 }, { k: 'x', l: 'What it did', w: 'minmax(240px,2fr)' }, { k: 'p', l: 'Property', w: 170 }, { k: 'd', l: 'When', w: 170 }, { k: 'z', l: '', w: 56 }]}>
              {activityLog.map((l: any) => {
                const agent = AGENTS.find(a => a.key === l.agent)
                return <Row key={l.id} cells={[
                  <span key="a" style={{ fontSize: 13, fontWeight: 500 }}>{agent?.name ?? l.agent}</span>,
                  <span key="x" style={{ fontSize: 13, width: '100%' }}>{l.action}</span>,
                  <span key="p" style={{ fontSize: 13, color: C.muted }}>{l.property || '—'}</span>,
                  <span key="d" style={{ fontSize: 12, color: C.muted }}>{l.createdAt}</span>,
                  <button key="z" title="Delete" onClick={async () => { const { error } = await supabase.from('ai_activity_log').delete().eq('id', l.id); if (error) { alert(error.message); return } setActivityLog(activityLog.filter((x: any) => x.id !== l.id)) }} style={{ ...btn('danger', true), padding: '4px 8px' }}>×</button>,
                ]} />
              })}
            </Group>
          )}
        </div>
      )}
    </div>
  )
}
