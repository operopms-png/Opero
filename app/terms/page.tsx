import { LegalPage, H, link } from '@/components/legal/LegalPage'
import { LEGAL, operatorLine } from '@/lib/legal-config'

export const metadata = { title: 'Terms of Service | Novourq' }

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated={LEGAL.updated}>
      <p>These terms are the agreement between {operatorLine()} (&ldquo;Novourq&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) and the business that subscribes (&ldquo;you&rdquo;). By creating an account or using Novourq you agree to them.</p>

      <H>1. The service</H>
      <p>Novourq provides a cloud platform for property businesses, including property, tenant, lease, finance and CRM tools and an AI assistant (&ldquo;Novourq Cloud AI&rdquo;) that works on your records and on your behalf.</p>

      <H>2. Your account</H>
      <p>You must give accurate details and keep logins secure. You are responsible for everything done under your account, including by people you invite. The account admin controls who has access.</p>

      <H>3. Subscription and payment</H>
      <p>The service costs £79 a month after a 14-day free trial. Payment is by card through Stripe, and we do not store card details. You can cancel at any time from your account settings or by contacting us. Cancellation takes effect at the end of the paid period. Fees already paid are not refundable, except where the law requires otherwise.</p>

      <H>4. Your data</H>
      <p>You own the data you put into Novourq. You give us permission to process it only to provide the service. Where we handle personal data of your landlords, tenants, guests or leads, you are the controller and we are the processor, and we handle it under a data processing agreement that forms part of these terms. Account admins can download all company data and request deletion under Settings, Privacy &amp; Data. See our <a href="/privacy" style={link}>Privacy Policy</a>.</p>

      <H>5. The AI assistant</H>
      <p>Novourq Cloud AI prepares and sends emails, tasks and messages using your records and your branding. It sends automatically unless you switch a skill to wait for approval. It never moves money or signs legal contracts without a person&rsquo;s approval. You are responsible for reviewing what it does. AI output can be wrong, so you must check anything that matters, in particular legal notices, rent demands, and deposit and tenancy documents.</p>

      <H>6. Compliance is yours</H>
      <p>You are responsible for lawful use, including your own obligations to tenants, landlords and regulators, consents to contact people, and the content of notices. Novourq is a tool, not legal, tax or financial advice.</p>

      <H>7. Acceptable use</H>
      <p>No unlawful use, no attempts to break or overload the service, no spam, and no uploading material you have no right to use.</p>

      <H>8. Third-party services</H>
      <p>Novourq relies on providers for hosting, payment, email and AI. We are not responsible for outages of services we do not control.</p>

      <H>9. Availability and support</H>
      <p>We work to keep Novourq available but do not guarantee uninterrupted service. Support is through Submissions in Settings.</p>

      <H>10. Intellectual property</H>
      <p>Novourq owns the platform and its software. You keep ownership of your content, and give us a licence to host and process it to run the service.</p>

      <H>11. Confidentiality</H>
      <p>Each side keeps the other&rsquo;s confidential information private and uses it only for this agreement.</p>

      <H>12. Liability</H>
      <p>Nothing limits liability that cannot lawfully be limited. Otherwise our total liability in any 12 months is limited to the fees you paid in that period, and we are not liable for indirect or lost-profit losses.</p>

      <H>13. Ending the agreement</H>
      <p>Either side may end it for serious breach not fixed within 30 days. On ending, you can export your data for 30 days, after which we delete it.</p>

      <H>14. Changes</H>
      <p>We may update these terms with 30 days&rsquo; notice by email. If you do not agree, you can cancel before they take effect.</p>

      <H>15. Law and disputes</H>
      <p>These terms are governed by the law of England and Wales, and its courts have jurisdiction.</p>

      <H>16. Contact</H>
      <p>Questions about these terms: {LEGAL.privacyEmail ? <a href={`mailto:${LEGAL.privacyEmail}`} style={link}>{LEGAL.privacyEmail}</a> : 'send us a message through Submissions in Settings'}.</p>
    </LegalPage>
  )
}
