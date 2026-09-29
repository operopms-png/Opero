export default function TermsPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#F7F8FA', fontFamily: "'Inter', -apple-system, sans-serif", padding: '48px 20px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', padding: '48px 40px' }}>
        <a href="/login" style={{ fontSize: 13, color: '#A8862E', textDecoration: 'none' }}>← Back to portal</a>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#323338', margin: '20px 0 4px' }}>Terms of Service</h1>
        <p style={{ fontSize: 13, color: '#98A2B3', margin: '0 0 32px' }}>Last updated: 23 September 2026</p>

        <div style={{ fontSize: 14, color: '#344054', lineHeight: 1.7 }}>
          <p>These Terms of Service ("Terms") govern access to and use of the Sangsters portal, a property management platform operated by Sangsters Group ("Sangsters", "we", "us"). By creating an account or using the portal, you agree to these Terms.</p>

          <h2 style={sectionH}>1. The service</h2>
          <p>The portal is used by Sangsters staff, property owners, landlords, tenants and partners to manage and view properties, bookings, tenancies, statements and related operations.</p>

          <h2 style={sectionH}>2. Accounts</h2>
          <p>You must provide accurate information when creating an account and keep your login credentials secure. You are responsible for all activity that happens under your account, including actions taken by team members you invite.</p>

          <h2 style={sectionH}>3. Payments</h2>
          <p>Any payments made through the portal (such as rent or partner fees) are processed by Stripe. We do not store your card details.</p>

          <h2 style={sectionH}>4. Your data and content</h2>
          <p>You retain ownership of the property, tenant, guest, booking, and staff data you enter into the portal ("your data"). You are responsible for having the right to process that data, including any personal data belonging to your tenants, guests, or staff. We process it on your behalf to provide the service, as described in our <a href="/privacy" style={{ color: '#A8862E' }}>Privacy Policy</a>.</p>

          <h2 style={sectionH}>5. Acceptable use</h2>
          <p>You agree not to use the portal to break the law, infringe anyone's rights, transmit malicious code, or attempt to gain unauthorized access to the platform or other users' data.</p>

          <h2 style={sectionH}>6. Availability and changes</h2>
          <p>We aim to keep the portal available and reliable but do not guarantee uninterrupted access. We may update, add to, or remove features from time to time, and may update these Terms; continued use after an update means you accept the revised Terms.</p>

          <h2 style={sectionH}>7. Liability</h2>
          <p>The portal is provided "as is". To the fullest extent permitted by law, we are not liable for indirect or consequential losses, or for disputes between you and your tenants, guests, owners, or staff. Nothing in these Terms limits liability that cannot be limited by law (for example, for fraud or death or personal injury caused by negligence).</p>

          <h2 style={sectionH}>8. Termination</h2>
          <p>You may stop using the portal at any time. We may suspend or terminate accounts that breach these Terms.</p>

          <h2 style={sectionH}>9. Governing law</h2>
          <p>These Terms are governed by the laws of England and Wales.</p>

          <h2 style={sectionH}>10. Contact</h2>
          <p>Questions about these Terms can be sent to <a href="mailto:contact.us@sangstersgroup.com" style={{ color: '#A8862E' }}>contact.us@sangstersgroup.com</a>.</p>
        </div>
      </div>
    </div>
  )
}

const sectionH = { fontSize: 16, fontWeight: 700, color: '#323338', margin: '28px 0 8px' } as const
