// The one ready-written NOVOURQ marketing message for the Mailing list (our management service).
// {{first_name}} is replaced with each person's first name.
const MESSAGE = {
  subject: 'Property management and Guaranteed Rent with NOVOURQ',
  text: [
    'Hello {{first_name}},',
    '',
    'We are NOVOURQ. We manage houses, apartments and hospitality units across Jamaica and the UK, and we take care of your property from start to finish, so you can rely on it without having to run it yourself.',
    'We use AI technology to remove human error from rent collection, maintenance and reporting, and our owners portal gives you full transparency, so you can see your statements, documents and property updates at any time.',
    'What our management service gives you:',
    '',
    '* Guaranteed Rent, paid on time every month, on contracts of 3 to 5 years',
    '* Vetted, ready-to-move tenants and well-kept furnished homes',
    '* Day-to-day management, maintenance and compliance handled for you',
    '',
    'schedule a meeting with us: https://app.thenovourq.com/meeting',
    '',
    'Website: http://www.thenovourq.com',
    '',
    'Brochure: https://app.thenovourq.com/services/NOVOURQ_Brochure.pdf',
    '',
    'Kind regards,',
    'NOVOURQ',
    'contact.us@thenovourq.com',
  ].join('\n'),
}

export function generateMessage(_audience?: string): { subject: string; text: string } {
  return MESSAGE
}
