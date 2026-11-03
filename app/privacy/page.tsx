import { LegalPage, H, link } from '@/components/legal/LegalPage'
import { LEGAL, operatorLine } from '@/lib/legal-config'

export const metadata = { title: 'Privacy Policy | Novourq' }

export default function PrivacyPage() {
  const contact = LEGAL.privacyEmail
    ? <a href={`mailto:${LEGAL.privacyEmail}`} style={link}>{LEGAL.privacyEmail}</a>
    : <>Submissions in Settings</>
  return (
    <LegalPage title="Privacy Policy" updated={LEGAL.updated}>
      <p>This policy covers personal data that {operatorLine()} (&ldquo;Novourq&rdquo;) handles for itself: its clients&rsquo; account holders and visitors to its website. When Novourq handles a client&rsquo;s tenants, landlords, guests or leads, it does so for that client under a data processing agreement, and the client&rsquo;s own privacy notice applies to those people.</p>

      <H>1. Who we are</H>
      <p>{operatorLine()}. Privacy contact: {contact}.{LEGAL.icoNumber ? ` ICO registration number: ${LEGAL.icoNumber}.` : ''}</p>

      <H>2. What we collect</H>
      <p>Account details (name, email, role), company details you enter (name, logo, contact lines), billing details held by Stripe (we do not store card numbers), usage and security logs, and messages you send us through Submissions, support or the website. Passwords are never stored in readable form.</p>

      <H>3. Why we use it</H>
      <p>To provide the service (contract). To bill you (contract and legal obligation). To keep the service secure and prevent abuse (legitimate interests). To improve the product (legitimate interests). To send service messages and, where you agree, product news (consent).</p>

      <H>4. AI processing</H>
      <p>Content you ask Novourq Cloud AI to work on is sent to our AI provider to produce the result.</p>

      <H>5. Who we share it with</H>
      <p>Only providers that help us run the service: hosting and database, payments, email, AI, and any integration you turn on (such as text messaging, accounting or channel managers). We also share data where the law requires.</p>

      <H>6. Where it is stored</H>
      <p>Our providers may process data outside the UK. Where data leaves the UK or EEA we rely on adequacy decisions or standard contractual clauses.</p>

      <H>7. How long we keep it</H>
      <p>Account data while the account is open and for a reasonable period after it closes. Billing records for 6 years. When you ask for deletion we complete it within 30 days, apart from records the law requires us to keep.</p>

      <H>8. Your rights</H>
      <p>You can ask for access, correction, deletion, restriction, portability and to object. Account admins can download all company data and request deletion in Settings, under Privacy &amp; Data. Other requests: {contact}. You can complain to the Information Commissioner&rsquo;s Office.</p>

      <H>9. Security</H>
      <p>Data is encrypted in transit, access is limited by account and role, and client accounts are kept separate from each other.</p>

      <H>10. Changes</H>
      <p>We will tell account admins by email about material changes.</p>
    </LegalPage>
  )
}
