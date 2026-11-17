// HR templates any business can add to Documents → Templates ("Add HR templates").
// They use the Documents blanks, so each company's own logo, name and contact lines
// (Settings → Invoice settings) appear on the PDF and email automatically.

// Offer-of-employment letters, one per NOVOURQ role. Same terms for every role; only the duties differ.
// Send each by link from Documents: the new hire opens it, fills in the blanks marked for them and signs.
const offerLetter = (role: string, reportsTo: string, duties: string[]) => ({
  name: `Offer letter: ${role}`, category: 'HR', lock_mode: 'editable', needs_signature: true,
  email_subject: `Your offer of employment — {company_name}`,
  body: `<h1>Offer of Employment</h1>
<p>Date: {today}</p>
<p>Private and confidential</p>
<p>Dear {employee_name},</p>
<p>We are pleased to offer you the position of <b>${role}</b> with {company_name}. This letter sets out the main terms. Please read it carefully, and if you are happy to accept, sign at the bottom by {offer_expiry_date}.</p>
<h3>1. Your role</h3>
<p>Job title: {job_title}<br>Reports to: ${reportsTo}<br>Employment type: {employment_type:full-time permanent|part-time permanent|fixed-term|casual}<br>Start date: {employment_start_date}</p>
<p>Your main responsibilities will include:</p>
<ul>${duties.map(d => `<li>${d}</li>`).join('')}<li>Any other reasonable duties linked to the role that the company asks of you.</li></ul>
<h3>2. Place and hours of work</h3>
<p>Your normal place of work is {work_location}. Your normal hours are {hours_per_week} hours per week, {working_days}, and the company may agree flexible or remote working with you from time to time. Hours may need to flex to meet the needs of the business.</p>
<h3>3. Pay</h3>
<p>Your gross salary will be {salary_annual} per annum ({salary_monthly} per month), paid {pay_frequency} into the bank account you give us. Tax, national insurance or statutory contributions will be deducted as the law where you work requires. Your pay will be reviewed from time to time; a review does not guarantee an increase.</p>
<h3>4. Holiday</h3>
<p>You are entitled to {holiday_days} days of paid holiday per year, plus public holidays where you work. Holiday must be agreed with {staff_name} or your line manager in advance.</p>
<h3>5. Probation</h3>
<p>The first {probation_period} of employment is a probation period. We will review your performance during and at the end of it, and may extend it where appropriate. Either side may end the employment during probation with {probation_notice} notice.</p>
<h3>6. Notice</h3>
<p>After probation, either side must give {notice_period} written notice to end the employment. The company may pay in place of notice or ask you not to attend work during notice. Nothing here limits the company's right to end employment without notice in cases of serious misconduct.</p>
<h3>7. Confidentiality and company property</h3>
<p>You must keep confidential all information about the company, its clients, guests, owners and staff, both during and after your employment. All work you produce for the company, and everything you are given to do it (logins, devices, documents, client data), belongs to the company and must be returned when you leave. Please use company systems only as the company's policies allow.</p>
<h3>8. Conditions of this offer</h3>
<p>This offer depends on satisfactory references, proof of your right to work where you will be based, and any checks the role needs. The company may withdraw the offer if these are not satisfactory.</p>
<h3>9. Other terms</h3>
<p>Further policies and procedures, including the Staff notice on Work Hours recording, will be given to you when you start. If anything in this letter conflicts with the law where you work, the law applies. This letter, with any policies given to you, is the whole agreement about your employment unless we both agree changes in writing.</p>
<p>We are delighted to welcome you and look forward to working with you.</p>
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
