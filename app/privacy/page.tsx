export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#F7F8FA', fontFamily: "'Inter', -apple-system, sans-serif", padding: '48px 20px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', padding: '48px 40px' }}>
        <a href="/landing.html" style={{ fontSize: 13, color: '#3B4AFF', textDecoration: 'none' }}>← Back to Opero</a>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#101828', margin: '20px 0 4px' }}>Privacy Policy</h1>
        <p style={{ fontSize: 13, color: '#98A2B3', margin: '0 0 32px' }}>Last updated: 23 September 2026</p>

        <div style={{ fontSize: 14, color: '#344054', lineHeight: 1.7 }}>
          <p>This Privacy Policy explains how Opero (helloopero.com), operated by Sangsters Group ("Opero", "we", "us"), collects, uses, and protects personal data.</p>

          <h2 style={sectionH}>1. Who this covers</h2>
          <p>This policy covers Opero account holders and their team members ("you"), and — where you enter it into the platform — the personal data of your tenants, guests, owners, and staff ("your users' data"), which you control and we process on your behalf.</p>

          <h2 style={sectionH}>2. What we collect</h2>
          <p>Account data: name, email, password (stored encrypted), and company details you provide at signup. Billing data: handled directly by Stripe — we receive confirmation of payment, not your card details. Platform data: property, booking, tenancy, staff, and messaging records you or your team enter to use the service. Usage data: basic technical logs (e.g. sign-in times) used to keep the platform secure and working.</p>

          <h2 style={sectionH}>3. Why we process it</h2>
          <p>To provide and operate the Opero platform you've subscribed to; to process payments; to send essential account and service emails (e.g. password resets, booking notifications you've configured); and to keep the platform secure and improve it. We do not sell personal data.</p>

          <h2 style={sectionH}>4. Who we share it with</h2>
          <p>We use trusted service providers to run Opero, including Supabase (database and authentication hosting), Netlify (application hosting), and Stripe (payment processing). These providers only process data as needed to provide their service to us and are bound by their own data protection obligations. We do not share your data with third parties for marketing purposes.</p>

          <h2 style={sectionH}>5. Where data is stored</h2>
          <p>Data is stored with our hosting providers' infrastructure, which may involve processing outside your home country. Where that happens, we rely on our providers' standard safeguards (such as the EU/UK Standard Contractual Clauses) for international transfers.</p>

          <h2 style={sectionH}>6. How long we keep it</h2>
          <p>We keep account and platform data for as long as your account is active, and for a reasonable period afterward to meet legal, accounting, or dispute-resolution needs. You can request deletion of your account data at any time (see Section 8).</p>

          <h2 style={sectionH}>7. Security</h2>
          <p>We use industry-standard measures — encrypted connections, access controls, and row-level security on your data — to protect information stored in Opero. No system is completely secure, and we encourage you to use a strong, unique password.</p>

          <h2 style={sectionH}>8. Your rights</h2>
          <p>If you are in the UK or EU, you have rights under GDPR to access, correct, export, or request deletion of your personal data, and to object to certain processing. To exercise any of these rights, contact us at the email below. If you are a tenant, guest, owner, or staff member whose data was entered by an Opero account holder, please contact that business directly — they control that data — or contact us and we will help route your request.</p>

          <h2 style={sectionH}>9. Cookies</h2>
          <p>Opero uses only essential cookies needed to keep you signed in and the platform working. We do not use third-party advertising or tracking cookies.</p>

          <h2 style={sectionH}>10. Changes to this policy</h2>
          <p>We may update this policy from time to time. Material changes will be notified to account holders by email or an in-app notice.</p>

          <h2 style={sectionH}>11. Contact</h2>
          <p>For any privacy question or request, contact <a href="mailto:hello@helloopero.com" style={{ color: '#3B4AFF' }}>hello@helloopero.com</a>.</p>
        </div>
      </div>
    </div>
  )
}

const sectionH = { fontSize: 16, fontWeight: 700, color: '#101828', margin: '28px 0 8px' } as const
