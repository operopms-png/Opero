// Landlord onboarding templates any business can add to Documents → Templates ("Add landlord templates").
// Wording and order follow the NOVOURQ agreement PDFs. They open for the landlord in the NOVOURQ form layout
// (logo artwork background, ruled fill-in lines, tick boxes) and the signed copy is the same look as a PDF.

const row = (...rows: string[]) => `<p>${rows.join('<br>')}</p>`
const li = (items: string[]) => `<ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>`

const landlordBlock = (n: number) => `<h2>Landlord ${n}</h2>
${row(
  `<b>Title:</b> {l${n}_title:Mr|Mrs|Miss|Ms|Dr|Other}`,
  `<b>First name:</b> {l${n}_first_name}`,
  `<b>Last name:</b> {l${n}_last_name}`,
  `<b>Email:</b> {l${n}_email}`,
  `<b>Mobile:</b> {l${n}_mobile}`,
  `<b>Current address:</b> {l${n}_address}`,
  `<b>Job title:</b> {l${n}_job_title}`,
  `<b>Company:</b> {l${n}_company}`,
  `<b>Employment status:</b> {l${n}_employment:Full time|Part-time|Contractor|Self-employed}`,
  `<b>Gross household salary:</b> {l${n}_salary}`,
  `<b>Nationality:</b> {l${n}_nationality}`,
)}`

export const LANDLORD_TEMPLATES = [
  {
    name: 'Shortlet Landlord Agreement', category: 'Agreements', lock_mode: 'approval', needs_signature: true,
    email_subject: 'Your shortlet landlord agreement — {company_name}',
    body: `<h1>Corporate Accommodation / Residential Occupancy Agreement</h1>
${row('<b>Agreement date:</b> {agreement_date}', '<b>Property address:</b> {property_address}')}
<p>This Agreement is made between:</p>
<h2>Service Provider / Corporate Accommodation Company</h2>
${row('<b>Company name:</b> {company_name}', '<b>Company address:</b> {company_address}', '<b>Contact:</b> {company_contact}')}
<p>and</p>
<h2>Occupant / Tenant</h2>
${row('<b>Full name:</b> {recipient_name}', '<b>ID / passport no:</b> {id_number}', '<b>Email:</b> {recipient_email}', '<b>Telephone:</b> {recipient_phone}')}
<p>The Service Provider is not the owner of the Property. The Service Provider provides corporate accommodation and has the appropriate arrangement with the property owner/landlord to provide the Property for residential occupation.</p>
<p>The Occupant acknowledges that the Service Provider is acting as a corporate accommodation provider and that this Agreement does not represent that the Service Provider owns the Property.</p>
<p>WHEREBY it is agreed as follows:</p>
<p>(a) The Service Provider agrees to provide the Occupant with use and occupation of:</p>
${row('<b>Property:</b> {property_name}', '<b>Unit / apartment:</b> {unit}', '<b>Number of bedrooms:</b> {bedrooms}', '<b>Furnished / unfurnished:</b> {furnished:Furnished|Unfurnished}')}
<p>The Property is to be used solely as a private residential accommodation unless otherwise agreed in writing.</p>
<h2>3. Services provided</h2>
<p>The Property Manager (NOVOURQ) shall provide professional property management services, including but not limited to:</p>
${li(['Guest communication', 'Booking management', 'Calendar management', 'Pricing and revenue optimisation', 'Check-in and check-out coordination', 'Cleaning coordination', 'Maintenance reporting', 'Inventory management', 'Key management', 'Property inspections', 'Monthly performance reporting', 'AI-powered operations: NOVOURQ’s AI technology runs day-to-day operations of the Property, including guest messaging, scheduling, pricing and reporting', 'Landlord dashboard: the Owner is given access to the NOVOURQ landlord dashboard to view bookings, income, maintenance and activity on the Property at any time'])}
<p>The Property Manager may, from time to time, provide such additional services as may be reasonably necessary for the efficient operation, maintenance, and profitability of the Property.</p>
<p>The services are provided in return for the management fee set out in this Agreement. The cost of all maintenance and repairs to the Property is the responsibility of the Owner. Once the Owner has paid for the maintenance or repair, the NOVOURQ in-house team shall handle all issues arising.</p>
<h2>4. Owner responsibilities</h2>
<p>The Owner shall:</p>
${li(['Provide accurate and complete information relating to the Property and promptly notify the Property Manager of any material changes.', 'Maintain adequate insurance coverage for the Property and its contents.', 'Ensure that the Property complies with all applicable laws, regulations, and licensing requirements.', 'Pay all agreed management fees, utility charges, and property-related expenses in a timely manner.', 'Provide the Property Manager with reasonable access to the Property as required for inspections, maintenance, housekeeping, and operational purposes.', 'Ensure that all fixtures, furnishings, appliances, and amenities provided within the Property are maintained in safe and working condition.', 'Cooperate with the Property Manager and provide all documents, information, and authorizations reasonably required for the efficient management and operation of the Property.'])}
<h2>5. Management fees</h2>
<p>In consideration for the services provided under this Agreement, the Owner shall pay the Property Manager the following management fees:</p>
<p><b>Option A:</b> A fixed management fee of £149 GBP per month (approximately J$31,500 JMD or US$200 USD per month).</p>
<p>OR</p>
<p><b>Option B:</b> A management fee equal to twenty percent (20%) of the gross booking revenue generated by the Property.</p>
<p>The applicable fee structure shall be selected by the Owner upon execution of this Agreement and shall remain in effect unless otherwise agreed in writing by both parties. Jamaican dollar (JMD) and US dollar (USD) amounts are approximate equivalents of the GBP fee based on exchange rates at the date of this Agreement, and may vary with the exchange rate.</p>
${row('<b>Fee option:</b> {fee_option:Option A - £149 GBP per month (approx. J$31,500 JMD / US$200 USD)|Option B - 20% of Gross Booking Revenue}')}
<h2>6. Cleaning fees</h2>
<p>Cleaning fees charged to guests shall be applied solely towards the cost of cleaning services, laundry, and property turnover expenses incurred in preparing the Property for subsequent guests. Such fees shall not form part of the Property Manager’s management fees unless otherwise agreed in writing by the parties.</p>
<h2>7. Maintenance</h2>
<p>The Property Manager shall have the authority to arrange routine maintenance, repairs, and other services necessary for the proper operation and upkeep of the Property.</p>
<p>Any non-emergency repair or maintenance expense exceeding £100 GBP (or its equivalent) shall require the prior approval of the Owner. In the event of an emergency or where immediate action is required to protect the Property, guests, or prevent further damage, the Property Manager may authorize such repairs without prior approval and shall notify the Owner as soon as reasonably practicable thereafter.</p>
<h2>8. Access to property</h2>
<p>The Owner hereby authorises the Property Manager, its employees, agents, and approved contractors to access the Property at reasonable times for the purposes of management, inspections, maintenance, cleaning, repairs, guest services, and any other activities necessary for the proper operation of the Property.</p>
<h2>9. Client funds</h2>
${row('<b>Funds option:</b> {funds_option:Option A - NOVOURQ Managed Business Account|Option B - Owner Managed Account}')}
<p><b>Option A – NOVOURQ Managed Business Account.</b> The Property shall be listed under accounts operated by NOVOURQ. The Owner acknowledges that NOVOURQ maintains Superhost status and other platform performance metrics which may enhance visibility, occupancy, and revenue performance. All booking revenue shall be received into the accounts designated by NOVOURQ and, following deduction of the applicable management fees and any approved expenses, the remaining balance shall be remitted to the Owner in accordance with the agreed payment schedule.</p>
<p><b>Option B – Owner Managed Account.</b> The Property shall be listed under the Owner’s own booking accounts. All booking revenue shall be received directly by the Owner, who shall remain responsible for the timely payment of all management fees and approved expenses due to NOVOURQ.</p>
<p>The Property Manager shall provide reasonable reporting and accounting for all funds received and disbursed in connection with the operation and management of the property.</p>
<h2>10. Limitation of liability</h2>
<p>The Property Manager shall not be liable for any loss, damage, delay, or interruption arising from:</p>
${li(['Guest misconduct or negligence;', 'Theft, vandalism, or criminal acts committed by third parties;', 'Acts of God, including hurricanes, earthquakes, floods, or other natural disasters;', 'Utility outages, internet failures, or interruptions in public services;', 'Government actions, regulatory changes, or any event beyond the reasonable control of the Property Manager.'])}
<h2>11. Confidentiality</h2>
<p>Both parties agree to maintain the confidentiality of all business, operational, financial, and proprietary information obtained in connection with this Agreement and shall not disclose such information to any third party except as required by law or with the prior written consent of the other party.</p>
<h2>12. Termination</h2>
<p>Following the expiration of the initial six (6) month term, either party may terminate this Agreement by providing not less than thirty (30) days’ written notice to the other party. Any outstanding fees, charges, or balances owing under this Agreement shall remain due and payable upon termination.</p>
<h2>13. Non-circumvention</h2>
<p>The Owner agrees that, during the term of this Agreement and for a period of twelve (12) months following its termination, they shall not directly or indirectly engage, employ, solicit, or contract with any contractor, cleaner, maintenance personnel, supplier, or service provider introduced by or affiliated with NOVOURQ without the prior written consent of the Property Manager.</p>
<h2>14. Governing law</h2>
<p>This Agreement shall be governed by and construed in accordance with the laws of Jamaica and, where applicable, the laws of England and Wales.</p>
<h2>Schedule A – Client onboarding information</h2>
<p>This Schedule A forms part of the Property Management Agreement between NOVOURQ and the Owner.</p>
<h2>Owner details</h2>
${row('<b>Full name:</b> {owner_full_name}', '<b>TRN / SSN / NI:</b> {tax_reference}', '<b>Date of birth:</b> {date_of_birth}', '<b>Phone number:</b> {owner_phone}', '<b>Email address:</b> {owner_email}', '<b>Emergency contact name:</b> {emergency_contact_name}', '<b>Emergency contact number:</b> {emergency_contact_number}')}
<h2>Property details</h2>
${row('<b>Property address:</b> {owner_property_address}', '<b>Parish:</b> {parish}', '<b>Property type:</b> {property_type:Apartment|House|Villa|Townhouse|Cottage|Guest House|Commercial Property|Other}', '<b>Number of bedrooms:</b> {owner_bedrooms}', '<b>Number of bathrooms:</b> {bathrooms}', '<b>Maximum occupancy:</b> {max_occupancy}', '<b>Current property use:</b> {current_use:Airbnb|Short-Term Rental|Long-Term Rental|Vacant|Owner Occupied}')}
<h2>Property access</h2>
${row('<b>Key collection method:</b> {key_method}', '<b>Number of keys provided:</b> {keys_provided}', '<b>Gate code:</b> {gate_code}', '<b>Alarm code:</b> {alarm_code}', '<b>Property access instructions:</b> {access_details}')}
<h2>Property features</h2>
${row('<b>Features:</b> {property_features}', '<b>Other features:</b> {other_features}')}
<h2>Booking platform details</h2>
${row('<b>Current listing platform:</b> {listing_platform:Airbnb|Booking.com|Vrbo|Expedia|Direct Bookings|Not Currently Listed}', '<b>Listing URLs:</b> {listing_urls}')}
<h2>Financial information</h2>
${row('<b>Bank name:</b> {bank_name}', '<b>Account name:</b> {bank_account_name}', '<b>Account number:</b> {bank_account_number}', '<b>Branch:</b> {bank_branch}', '<b>Payout schedule:</b> {payout_frequency:Weekly|Bi-Weekly|Monthly}')}
<h2>Management package selected</h2>
${row('<b>Package:</b> {package:£149 GBP Monthly Management Package (approx. J$31,500 JMD / US$200 USD)|20% Revenue Share Management Package}')}
<h2>Commencement date</h2>
${row('<b>Management start date:</b> {start_date}')}
<h2>Owner declaration</h2>
<p>I confirm that the information provided above is accurate and complete. I authorise NOVOURQ to manage the above property in accordance with the Property Management Agreement.</p>
<p><b>Authorised representative:</b> {staff_name}, {staff_role}</p>
<p><b>Owner signature:</b> signed electronically below. <b>Date:</b> {signdate_1}</p>`,
  },
  {
    name: 'Landlord Onboarding', category: 'Agreements', lock_mode: 'approval', needs_signature: true,
    email_subject: 'Your landlord onboarding details — {company_name}',
    body: `<h1>Landlord Details</h1>
<p>In order to onboard your property with us we will need the following details:</p>
${row('<b>No. of landlords:</b> {landlord_count:1|2|3|4}')}
${landlordBlock(1)}
<p>Complete the sections below only for the landlords you have.</p>
${landlordBlock(2)}
${landlordBlock(3)}
${landlordBlock(4)}
<h2>Other</h2>
${row('<b>Where did you hear about us?:</b> {heard_about_us}', '<b>Special requirements:</b> {special_requirements}')}
<p><b>Signature:</b> signed electronically below. <b>Date:</b> {signdate_1}</p>`,
  },
  {
    name: 'Estate Agency Property Management Agreement', category: 'Agreements', lock_mode: 'approval', needs_signature: true,
    email_subject: 'Your estate agency management agreement — {company_name}',
    body: `<h1>Property Management Agreement</h1>
<p>The Agent is authorised to provide the property management services described in this agreement.</p>
<h2>Details of the property to which the tenancy relates</h2>
${row('<b>Address of the property:</b> {property_address}')}
<h2>Details of property management company or agent of company</h2>
${row('<b>Name:</b> {company_name}', '<b>Registered address:</b> Tallis House, 2 Tallis St, Blackfriars, London EC4Y 0AB', '<b>Website:</b> www.thenovourq.com', '<b>Owner portal:</b> owners.thenovourq.com', '<b>Email:</b> {manager_email}', '<b>Telephone number:</b> {manager_phone}')}
<h2>Property owner / landlord</h2>
${row('<b>Name:</b> {recipient_name}', '<b>Address for contact:</b> {recipient_address}', '<b>Email:</b> {recipient_email}', '<b>Mobile:</b> {recipient_phone}', '<b>Date of birth:</b> {date_of_birth}', '<b>Permanent residence:</b> {permanent_residence}', '<b>Country of residence:</b> {country_of_residence}', '<b>Official identification type:</b> {id_type:Passport|National ID|Driver’s Licence|Government Issued ID}', '<b>ID / passport number:</b> {id_number}', '<b>ID issuing country:</b> {id_country}', '<b>Local tax reference number (if applicable):</b> {tax_reference}')}
<h2>Agreement term &amp; termination</h2>
${row('<b>Term:</b> 6 months minimum', '<b>Notice period:</b> 1 month', '<b>Commencement date:</b> {start_date}')}
<p>This Agreement commences on the date above and shall continue until terminated by either party by giving 2 months’ written notice.</p>
<h2>Services</h2>
<p>NOVOURQ will provide, as agreed:</p>
${li(['Collect rent from the tenant.', 'Account to the Landlord for rent received.', 'Manage tenant communications.', 'Deal with routine maintenance and repairs.', 'Arrange contractors where required.', 'Carry out property inspections.', 'Monitor rent arrears.', 'Manage tenancy administration.', 'Assist with tenancy renewals or changes.', 'Maintain relevant property and tenancy records.', 'Provide regular landlord statements.'])}
<p>(a) The Agent will collect rent from the tenant and hold client money in accordance with applicable legal and regulatory requirements.</p>
<p>(b) Rent collected will be accounted for to the Landlord after deduction of authorised fees, expenses and other agreed payments.</p>
<p>(c) The Agent will normally pay the Landlord {payment_timing} into the bank account nominated by the Landlord.</p>
<h2>Management fee</h2>
<p>The Landlord agrees to pay the Agent:</p>
${row('<b>(a) Percentage of rent collected:</b> {fee_percent}', '<b>or (b) Fee per month:</b> {fee_monthly}')}
<p>The Agent is authorised to deduct its management fee from client money in accordance with this agreement.</p>
<h2>Maintenance and repairs</h2>
<p>The Agent may arrange routine repairs, without obtaining prior approval from the Landlord, up to:</p>
${row('<b>Amount per individual repair:</b> {repair_limit}')}
<p>For repairs above this amount, the Agent will normally obtain the Landlord’s approval before proceeding, except where immediate action is reasonably necessary to protect the property, comply with a legal obligation, or protect the health and safety of occupants.</p>
<p>The Landlord remains responsible for the cost of authorised repairs.</p>
<h2>Property compliance</h2>
<p>(a) The Landlord is responsible for ensuring that the property is legally suitable to let and for providing the Agent with required certificates and information.</p>
<p>(b) The Agent may assist with arranging inspections, certificates and compliance services where agreed.</p>
<p>(c) The Landlord authorises the Agent to notify them of compliance issues and recommend appropriate action.</p>
<h2>Tenants</h2>
<p>(a) The Agent may communicate with tenants on the Landlord’s behalf regarding rent, repairs, inspections and general tenancy matters.</p>
<p>(b) Where agreed, the Agent may carry out tenant referencing and Right to Rent checks in accordance with applicable requirements.</p>
<h2>Tenancy deposits</h2>
<p>(a) Where applicable, the Agent will deal with the tenancy deposit in accordance with the applicable tenancy deposit legislation and the deposit protection scheme being used.</p>
<h2>Landlord responsibilities</h2>
<p>The Landlord agrees to:</p>
${li(['Provide accurate ownership and contact information.', 'Provide all required property information and certificates.', 'Maintain appropriate landlord/buildings insurance.', 'Pay property-related costs when due.', 'Pay for authorised repairs and maintenance.', 'Inform the Agent of any relevant changes affecting the property.', 'Comply with applicable landlord obligations.'])}
<h2>Agent’s authority</h2>
<p>(a) The Landlord authorises the Agent to act on the Landlord’s behalf in relation to the services covered by this agreement.</p>
<p>(b) The Agent may communicate with tenants, contractors, utility providers and relevant authorities where reasonably necessary to provide the agreed services.</p>
<h2>Client money</h2>
<p>(a) Money belonging to the Landlord or tenant will be treated as client money where applicable and handled in accordance with applicable legal requirements and the Agent’s client-money procedures.</p>
<p>(b) The Agent will maintain records of money received and paid out on behalf of the Landlord.</p>
<h2>Landlord statements</h2>
<p>(a) The Agent will provide the Landlord with regular statements showing, where applicable:</p>
${li(['Rent received.', 'Management fees.', 'Repairs and expenses.', 'Other deductions.', 'Payments made to the Landlord.', 'Remaining balance.'])}
<h2>Expenses</h2>
<p>(a) The Landlord authorises the Agent to deduct agreed property-related expenses from funds held on the Landlord’s behalf, where permitted under this agreement.</p>
<p>(b) Examples may include:</p>
${li(['Repairs.', 'Contractor invoices.', 'Compliance certificates.', 'Locksmith costs.', 'Emergency call-outs.'])}
<h2>Ending the agreement</h2>
<p>Either party may terminate this agreement by giving:</p>
<p>(a) {termination_notice} written notice.</p>
<p>(b) Any outstanding fees, expenses or sums due to the Agent remain payable following termination.</p>
<p>(c) The parties will cooperate to transfer the relevant property, tenancy and financial records following termination.</p>
<h2>Complaints</h2>
<p>The Agent operates a written complaints procedure.</p>
<p>Complaints should initially be made to:</p>
${row('<b>Name / email / address:</b> {complaints_contact}')}
<p>The Agent will handle complaints in accordance with its complaints procedure and applicable redress requirements.</p>
<h2>Data protection</h2>
<p>The Agent and Landlord will handle personal information in accordance with applicable UK data-protection legislation.</p>
<h2>Entire agreement</h2>
<p>This agreement sets out the agreed property-management services between the Landlord and Agent and should be read together with any schedules or additional terms agreed between the parties.</p>
<h2>Signatures</h2>
<p><b>Landlord:</b> signed electronically below. <b>Date:</b> {signdate_1}</p>
<p><b>Agent:</b> {staff_name}, {staff_role}</p>`,
  },
]
