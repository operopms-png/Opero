export default function TermsPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#F7F8FA', fontFamily: "'Inter', -apple-system, sans-serif", padding: '48px 20px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', padding: '48px 40px' }}>
        <a href="/landing.html" style={{ fontSize: 13, color: '#3B4AFF', textDecoration: 'none' }}>← Back to Opero</a>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#101828', margin: '20px 0 4px' }}>Terms of Service</h1>
        <p style={{ fontSize: 13, color: '#98A2B3', margin: '0 0 32px' }}>Last updated: 23 September 2026</p>

        <div style={{ fontSize: 14, color: '#344054', lineHeight: 1.7 }}>
          <p>These Terms of Service ("Terms") govern access to and use of Opero (helloopero.com), a property management software platform operated by Sangsters Group ("Opero", "we", "us"). By creating an account or using Opero, you agree to these Terms.</p>

          <h2 style={sectionH}>1. The service</h2>
          <p>Opero is a subscription software platform for property managers, landlords, letting and estate agencies, and short-term rental operators to manage properties, bookings, tenancies, staff, and related operations. Opero is a software tool only — we are not a party to any tenancy, booking, or agency agreement made using the platform, and we are not responsible for the conduct of any user, tenant, guest, or property owner.</p>

          <h2 style={sectionH}>2. Accounts</h2>
          <p>You must provide accurate information when creating an account and keep your login credentials secure. You are responsible for all activity that happens under your account, including actions taken by team members you invite.</p>

          <h2 style={sectionH}>3. Subscriptions and billing</h2>
          <p>Opero is offered as a recurring monthly subscription or a one-time payment plan, as shown at checkout. Subscriptions renew automatically until cancelled. You can cancel at any time from Settings → Billing & Subscriptions; cancellation takes effect at the end of the current billing period. Fees are non-refundable except where required by law.</p>
          <p>Payments are processed by Stripe. We do not store your card details.</p>

          <h2 style={sectionH}>4. Your data and content</h2>
          <p>You retain ownership of the property, tenant, guest, booking, and staff data you enter into Opero ("your data"). You are responsible for having the right to process that data, including any personal data belonging to your tenants, guests, or staff. We process it on your behalf to provide the service, as described in our <a href="/privacy" style={{ color: '#3B4AFF' }}>Privacy Policy</a>.</p>

          <h2 style={sectionH}>5. Acceptable use</h2>
          <p>You agree not to use Opero to break the law, infringe anyone's rights, transmit malicious code, or attempt to gain unauthorized access to the platform or other users' data.</p>

          <h2 style={sectionH}>6. Availability and changes</h2>
          <p>We aim to keep Opero available and reliable but do not guarantee uninterrupted access. We may update, add to, or remove features from time to time, and may update these Terms; continued use after an update means you accept the revised Terms.</p>

          <h2 style={sectionH}>7. Liability</h2>
          <p>Opero is provided "as is". To the fullest extent permitted by law, we are not liable for indirect or consequential losses, or for disputes between you and your tenants, guests, owners, or staff. Nothing in these Terms limits liability that cannot be limited by law (for example, for fraud or death or personal injury caused by negligence).</p>

          <h2 style={sectionH}>8. Termination</h2>
          <p>You may stop using Opero and cancel your subscription at any time. We may suspend or terminate accounts that breach these Terms.</p>

          <h2 style={sectionH}>9. Governing law</h2>
          <p>These Terms are governed by the laws of England and Wales.</p>

          <h2 style={sectionH}>10. Contact</h2>
          <p>Questions about these Terms can be sent to <a href="mailto:hello@helloopero.com" style={{ color: '#3B4AFF' }}>hello@helloopero.com</a>.</p>
        </div>
      </div>
    </div>
  )
}

const sectionH = { fontSize: 16, fontWeight: 700, color: '#101828', margin: '28px 0 8px' } as const
