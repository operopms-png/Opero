// HR templates any business can add to Documents → Templates ("Add HR templates").
// They use the Documents blanks, so each company's own logo, name and contact lines
// (Settings → Invoice settings) appear on the PDF and email automatically.
export const HR_LETTER_TEMPLATES = [
  {
    name: 'Proof of employment letter', category: 'HR', lock_mode: 'editable', needs_signature: false,
    email_subject: 'Proof of employment — {company_name}',
    body: "<h1>Proof of Employment</h1>\n<p>Date: {today}</p>\n<p>To Whom It May Concern,</p>\n<p>This letter is to confirm that {employee_name} (Date of Birth: {date_of_birth}) is employed by {company_name} as a {employment_type:full-time permanent|part-time permanent|fixed-term|casual} {job_title}.</p>\n<p>{employee_name} commenced employment with the company on {employment_start_date} and {employment_status}.</p>\n<p>Their current gross salary is {salary_annual} per annum ({salary_monthly} per month).</p>\n<p>Should you require any further information, please do not hesitate to contact us.</p>\n<p>Yours faithfully,</p>\n<p><br></p>\n<p>{staff_name}<br>{staff_role}<br>{company_name}</p>",
  },
  {
    name: 'Payslip', category: 'HR', lock_mode: 'editable', needs_signature: false,
    email_subject: 'Your payslip — {company_name}',
    body: "<h1>Payslip</h1>\n<p><b>{employee_name}</b><br>{employee_address}</p>\n<p>Payroll date: {payroll_date}<br>Payment period: {payment_period}<br>NI / tax ID number: {tax_id_number}<br>Tax code: {tax_code}</p>\n<h3>Payments</h3>\n<p>Basic pay: {basic_pay}<br>{other_payment_1_label}: {other_payment_1}<br>{other_payment_2_label}: {other_payment_2}<br><b>Total payments: {total_payments}</b></p>\n<h3>Deductions</h3>\n<p>Tax deducted: {tax_deducted}<br>Employee contribution (NI or statutory): {statutory_contribution}<br>{other_deduction_label}: {other_deduction}<br><b>Total deductions: {total_deductions}</b></p>\n<h3>Year to date</h3>\n<p>Gross pay: {ytd_gross}<br>Tax paid: {ytd_tax}<br>Contributions: {ytd_contributions}</p>\n<p><b>Net pay: {net_pay}</b></p>\n<p>{company_name}</p>",
  },
]
