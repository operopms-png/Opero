# Data Protection Pack — AI Operations Service

Working draft prepared from how the platform actually handles data (code reviewed 2 Nov 2026). It is a starting point for a solicitor to finalise, not legal advice. Items in [square brackets] must be completed before use.

---

## Part 1 — Data Processing Agreement (client-facing template)

**Parties.** [Client legal name] ("Controller") and [Service Provider legal name], company number [number], [registered address] ("Processor").

**1. Roles.** The Controller decides why and how the personal data of its guests, tenants, landlords, owners and enquirers is used. The Processor handles that data only to provide the services in the Service Agreement.

**2. Scope of processing.**
- Subject matter: operating the Controller's property management, short-let and lettings communications and records through the platform and its AI agents.
- Duration: the term of the Service Agreement, plus the deletion period in Part 2.
- Data subjects: guests, tenants, landlords, property owners, enquirers, the Controller's staff and contractors.
- Personal data: names, email addresses, phone numbers, booking and tenancy details, messages and message history, property access and check-in information, documents uploaded by the Controller (e.g. tenancy agreements, ID or proof-of-address, bank statements for affordability checks), rent and payment records.
- Special category data: none is intended. The Controller must not enter health, ethnicity, religion or similar data into free-text fields or the AI agents.

**3. Processor obligations.**
- Process only on the Controller's documented instructions, including for international transfers, unless law requires otherwise.
- Ensure everyone with access is bound by confidentiality.
- Keep appropriate security measures: per-client data separation enforced in the database, role-based access, encrypted connections, access logging, and human approval of every AI-drafted outbound message before it is sent.
- Assist the Controller with data subject requests (access, correction, deletion, restriction, portability, objection) within 5 working days of being asked.
- Notify the Controller without undue delay, and in any event within 48 hours, of becoming aware of a personal data breach, with the details the Controller needs for its own notification duties.
- Assist with data protection impact assessments and regulator consultations where reasonably required.
- At the end of the services, return or delete all personal data as instructed (Part 2 timetable) and confirm in writing.
- Make available the information needed to show compliance and allow reasonable audits on 30 days' notice.

**4. Sub-processors.** The Controller gives general authorisation for the sub-processors in Part 3. The Processor will give at least 30 days' notice of any change, and the Controller may object on reasonable grounds. The Processor stays responsible for its sub-processors.

**5. International transfers.** Some sub-processors operate outside the UK. The Processor will only use a lawful transfer mechanism (UK adequacy regulations, the UK-US Data Bridge where the recipient is certified, or the UK International Data Transfer Agreement / Addendum) and will provide details on request.

**6. AI processing.**
- AI agents only draft. A named member of the Controller's team approves, edits or rejects each draft before anything is sent, and each decision is logged.
- The AI provider processes data only to generate the requested draft and is not permitted to train its models on the Controller's data under the Processor's commercial terms [confirm and attach the provider's current terms].
- No decision with legal or similarly significant effect on an individual is made solely by AI.

**7. Liability and law.** [Governed by the law of England and Wales / as agreed.] [Liability cap and indemnity wording to be settled by solicitor.]

---

## Part 2 — Retention schedule

Recommended defaults. The Controller may instruct different periods. Where law requires a longer period (for example tax and landlord record-keeping), the longer period applies.

| Data | Retain for | Then |
|---|---|---|
| Enquiries and leads that did not convert (CRM contacts, website enquiries) | 12 months from last contact | Delete |
| Guest messages and booking records | 6 years from checkout (tax and dispute limitation) | Delete or anonymise |
| Tenancy records, agreements, deposit and inspection records | Duration of tenancy plus 6 years | Delete |
| Right-to-rent and ID documents | Duration of tenancy plus 1 year | Delete |
| Bank statements uploaded for affordability checks | 30 days after the decision | Delete the file; keep the outcome |
| Financial records (invoices, payouts, rent ledger) | 6 years from end of the tax year | Delete |
| AI drafts, approvals and activity log | 12 months, or 6 years where tied to a booking or tenancy | Delete |
| Security and webhook debug logs | 90 days | Delete |
| Closed client account | 30 days after termination for export, then everything deleted within a further 30 days | Written confirmation of deletion |

**Not yet automated.** The platform does not currently purge data on these timetables. Until a scheduled purge job is built, deletion is a manual task and should be actioned at least quarterly.

---

## Part 3 — Sub-processors and what each receives

| Provider | Purpose | Personal data involved | Location |
|---|---|---|---|
| Supabase | Database, authentication, file storage | All platform data | [confirm project region] |
| Netlify | Hosting and scheduled jobs | Request data in transit | [confirm] |
| Anthropic | AI drafting and analysis | See Part 4 | United States |
| xAI | AI assistant features (where enabled) | Text the user enters into that feature | United States |
| Resend | Sending and receiving email | Names, email addresses, message content | [confirm] |
| Twilio | SMS, WhatsApp and voice | Phone numbers, message content, call audio where voice is enabled | United States |
| Stripe | Payments and payouts | Payer details, amounts | [confirm] |
| Xero | Accounting sync (where connected) | Invoice and contact details | [confirm] |
| Smoobu | Channel manager (where connected) | Guest names, booking details, guest messages | [confirm] |

---

## Part 4 — What guest and tenant data goes to the AI provider

Plain-language statement for the privacy notice and the client contract.

When an AI agent drafts a reply, the platform sends the AI provider (Anthropic):
- the guest's first name or full name as held on the booking;
- the text of the guest's message;
- the property's name and address;
- the check-in and check-out instructions and house rules the Controller has stored;
- the property's WiFi network name and password, because guests commonly ask for them.

Other features send other data: documents uploaded for an affordability check (for example a bank statement) are sent in full to the AI provider to be read; email, SMS and portal assistants send the message being answered plus knowledge the Controller has entered.

Not sent: payment card details, Stripe or Supabase credentials, or other clients' data. Each request contains only the one client's data.

What the AI provider does with it: generates the draft and returns it. Retention and training terms are set by the provider's commercial agreement. [Confirm and record the current retention period and the no-training commitment before relying on this statement.]

**Recommended product changes** (to reduce what is shared):
1. Stop including the WiFi password in the AI prompt unless the guest asked for it. A simple keyword check on the guest's message is enough.
2. Redact email addresses and phone numbers from guest messages before they are sent.
3. Add an affordability-check setting that deletes the uploaded statement automatically after the decision is stored.

---

## Part 5 — Before selling

- [ ] Solicitor reviews Parts 1–4 and the Service Agreement.
- [ ] Register with the ICO and pay the data protection fee if not already done.
- [ ] Publish a privacy notice that matches Part 4.
- [ ] Complete a data protection impact assessment for the AI features.
- [ ] Obtain written confirmation of each sub-processor's transfer mechanism and the AI provider's retention and no-training terms.
- [ ] Build the scheduled retention purge, or commit to a manual quarterly review.
- [ ] Agree a breach-response contact and process (who is called, within what time).
