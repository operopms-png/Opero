// HR templates any business can add to Documents → Templates ("Add HR templates").
// They use the Documents blanks, so each company's own logo, name and contact lines
// (Settings → Invoice settings) appear on the PDF and email automatically.

// Offer-of-employment letters, one per NOVOURQ role. Same terms for every role; only the duties differ.
// Send each by link from Documents: the new hire opens it, fills in the blanks marked for them and signs.
const offerLetter = (role: string, reportsTo: string, duties: string[]) => ({
  name: `Offer letter: ${role}`, category: 'HR', lock_mode: 'editable', needs_signature: true,
  email_subject: `Your offer of employment — {company_name}`,
  body: `<p>{company_name}<br>{company_address}</p>
<p>{today}</p>
<p>{employee_name}<br>{employee_address}</p>
<p>Dear {employee_name},</p>
<h3>Offer of Employment</h3>
<p>I am pleased to offer you {employment_type:full-time permanent|part-time permanent|fixed-term|casual} employment in the role of <b>${role}</b> with {company_name} (referred to as 'the Employer', 'us' or 'we' in the rest of this letter). You will report to ${reportsTo}.</p>
<p>This letter is to confirm the offer to you, summarise the main commercial terms on which we would like to employ you and explain the conditions of our offer.</p>
<h3>Summary of Employment Terms</h3>
<p>The main terms of your employment are:</p>
<ol><li>We will pay you a basic salary of {salary_annual} per year ({salary_monthly} per month), paid {pay_frequency};</li><li>Your normal place of work will be {work_location};</li><li>Your normal hours of work will be {working_hours};</li><li>You will be entitled to {holiday_days} days of holiday per year plus public holidays;</li><li>Your employment will start on {employment_start_date}, and the first {probation_period} will be a probation period;</li><li>You will be able to take part in the following benefits, subject to meeting any eligibility criteria and the terms of the relevant schemes: {benefits};</li><li>You or we can end your employment by giving written notice of at least {notice_period}. This does not limit the Employer's right to end employment without notice for serious misconduct.</li></ol>
<p>Your main responsibilities will include:</p>
<ul>${duties.map(d => `<li>${d}</li>`).join('')}<li>Any other reasonable duties linked to the role that we ask of you.</li></ul>
<p>The above is intended as a high-level summary only and does not explain in full either the terms of your employment or the arrangements applicable to each of the items listed. The items covered in this letter and your employment are subject to the terms set out in the contract of employment, which takes precedence over this letter if there is any inconsistency.</p>
<h3>Conditions of Offer</h3>
<p>This offer is conditional on:</p>
<ol><li>Satisfactory references;</li><li>Proof of your right to work where you will be based;</li><li>Any other checks the role needs, such as ID and background checks;</li><li>You keeping all information about the Employer, its clients, guests, owners and staff confidential, during and after your employment.</li></ol>
<p>We may withdraw this offer if any condition is not met. Please confirm you accept by signing and returning this letter by {offer_expiry_date}. We look forward to welcoming you.</p>
<p>Yours sincerely,</p>
<p><br></p>
<p>{staff_name}<br>{staff_role}<br>{company_name}</p>
<h3>Acceptance</h3>
<p>I, {employee_name}, accept this offer of employment on the terms above.</p>
<p><br></p>
<p>Employee signature: ____________________ Date: ____________</p>`,
})

export const HR_LETTER_TEMPLATES = [
  {
    name: 'Proof of employment letter', category: 'HR', lock_mode: 'editable', needs_signature: false,
    email_subject: 'Proof of employment — {company_name}',
    body: "<h1>Proof of Employment</h1>\n<p>Date: {today}</p>\n<p>To Whom It May Concern,</p>\n<p>This letter is to confirm that {employee_name} (Date of Birth: {date_of_birth}) is employed by {company_name} as a {employment_type:full-time permanent|part-time permanent|fixed-term|casual} {job_title}.</p>\n<p>{employee_name} commenced employment with the company on {employment_start_date} and {employment_status}.</p>\n<p>Their current gross salary is {salary_annual} per annum ({salary_monthly} per month).</p>\n<p>Should you require any further information, please do not hesitate to contact us.</p>\n<p>Yours faithfully,</p>\n<p><br></p>\n<p>{staff_name}<br>{staff_role}<br>{company_name}</p>",
  },
  {
    name: 'Staff notice: Work Hours recording', category: 'HR', lock_mode: 'editable', needs_signature: true,
    email_subject: 'Staff notice: Work Hours — {company_name}',
    body: "<h1>Staff Notice: Work Hours Recording</h1>\n<p>Date: {today}</p>\n<p>To: {employee_name}</p>\n<p>{company_name} uses a Work Hours feature in its company portal. This notice explains what is recorded, why, and who can see it.</p>\n<h3>What is recorded</h3>\n<ul><li>The time you sign in to and sign out of the portal.</li><li>The time you press Clock in and Clock out, and whether you were late for your shift start time.</li><li>How long you spend on the portal, and how much of that time you are active.</li><li>Which pages of the portal you open.</li></ul>\n<p>It does not record your screen, keystrokes, other programs or websites, or anything you do away from the portal.</p>\n<h3>Why it is recorded</h3>\n<p>To record attendance and hours worked, to prepare pay, and to help keep the company's data secure.</p>\n<h3>Who can see it</h3>\n<p>The account owner, and any staff member the account owner has specifically authorised.</p>\n<h3>How long it is kept</h3>\n<p>For as long as it is needed for pay and employment records, and then it is deleted.</p>\n<h3>Your rights</h3>\n<p>You can ask to see the information held about you, and ask for mistakes to be corrected, in line with the data protection law that applies where you work. Please speak to {staff_name} if you have any questions.</p>\n<p>Please sign below to confirm you have read this notice.</p>\n<p><br></p>\n<p>Employee signature: ____________________ Date: ____________</p>\n<p>{staff_name}<br>{staff_role}<br>{company_name}</p>",
  },
  {
    name: 'Payslip', category: 'HR', lock_mode: 'editable', needs_signature: false,
    email_subject: 'Your payslip — {company_name}',
    body: "<h1>Payslip</h1>\n<p><b>{employee_name}</b><br>{employee_address}</p>\n<p>Payroll date: {payroll_date}<br>Payment period: {payment_period}<br>NI / tax ID number: {tax_id_number}<br>Tax code: {tax_code}</p>\n<h3>Payments</h3>\n<p>Basic pay: {basic_pay}<br>{other_payment_1_label}: {other_payment_1}<br>{other_payment_2_label}: {other_payment_2}<br><b>Total payments: {total_payments}</b></p>\n<h3>Deductions</h3>\n<p>Tax deducted: {tax_deducted}<br>Employee contribution (NI or statutory): {statutory_contribution}<br>{other_deduction_label}: {other_deduction}<br><b>Total deductions: {total_deductions}</b></p>\n<h3>Year to date</h3>\n<p>Gross pay: {ytd_gross}<br>Tax paid: {ytd_tax}<br>Contributions: {ytd_contributions}</p>\n<p><b>Net pay: {net_pay}</b></p>\n<p>{company_name}</p>",
  },
  offerLetter('Receptionist', 'the Chief Operating Officer (COO)', ['Greeting and assisting clients, guests, owners and visitors, in person, by phone, email and chat', 'Answering enquiries, booking appointments and viewings, and passing messages to the right person', 'Keeping the diary, records and inbox organised and up to date', 'Supporting the team with admin, documents and data entry', 'Following company procedures on privacy, confidentiality and customer care']),
  offerLetter('CEO', 'the Board / company owner', ['Setting the company vision, strategy and annual goals, and leading the executive team to deliver them', 'Being accountable for overall company performance, growth, culture and reputation', 'Approving budgets, major contracts, partnerships and hiring decisions', 'Representing the company to clients, investors, partners and the public', 'Reporting regularly to the Board / owner on results and risks']),
  offerLetter('CFO', 'the Chief Executive Officer (CEO)', ['Leading finance, budgeting, forecasting, cash flow and financial reporting', 'Overseeing bookkeeping, payroll, tax and statutory filings, and relationships with accountants, banks and auditors', 'Setting financial controls, approval limits and risk management', 'Advising the CEO on pricing, investment and funding decisions', 'Preparing management accounts and financial reports for the Board / owner']),
  offerLetter('COO', 'the Chief Executive Officer (CEO)', ['Running day-to-day operations across property management, guest services and client delivery', 'Setting and improving procedures, service standards and staff schedules', 'Managing team performance, onboarding and training', 'Managing suppliers, contractors and operational costs', 'Reporting on operational performance and resolving issues that arise']),
  offerLetter('CTO', 'the Chief Executive Officer (CEO)', ['Leading the technology strategy, including the company portal, AI services and integrations', 'Overseeing software development, hosting, security, backups and data protection', 'Managing technology vendors, tools, costs and any technical staff or contractors', 'Making sure systems are reliable, documented and safe for clients and staff', 'Advising the CEO on new technology and how it supports the business']),
  offerLetter('CPMO', 'the Chief Executive Officer (CEO)', ['Leading the property management function: onboarding properties, owners and co-hosts', 'Making sure each property is managed to company standards: listings, cleaning, maintenance, inspections and guest experience', 'Overseeing owner and co-host statements, payouts and reporting', 'Keeping agreements, compliance records and licences up to date for each property', 'Working with the COO and CFO on pricing, occupancy and property performance']),
]
