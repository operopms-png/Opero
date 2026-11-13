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
    'Schedule a meeting with us: https://app.thenovourq.com/meeting',
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

// The ready-written message for people who want the AI platform (software), not our management service.
const PLATFORM_MESSAGE = {
  subject: 'NOVOURQ Cloud AI: your property business, run by AI',
  text: [
    'Hello {{first_name}},',
    '',
    'We are NOVOURQ. Novourq Cloud AI is a property platform with AI built in, and it is available now for landlords, Airbnb hosts, estate agencies and developers.',
    'It drafts the rent reminders, guest replies, owner reports, listings and investor updates, and a person approves everything before it is sent.',
    'What the platform gives you:',
    '',
    '* One dashboard for your properties, tenants, bookings, rent, maintenance and compliance',
    '* AI that does the drafting while you approve, with a full record of what it did',
    '* Portals for owners, tenants and partners, and a 3D walk-through to showcase developments',
    '',
    'Get started now: https://app.thenovourq.com/login?signup=1',
    '',
    'Website: http://www.thenovourq.com',
    '',
    'Brochure: https://app.thenovourq.com/services/NOVOURQ_Cloud_AI_Brochure.pdf',
    '',
    'Kind regards,',
    'NOVOURQ',
    'contact.us@thenovourq.com',
  ].join('\n'),
}

export function generateMessage(audience?: string): { subject: string; text: string } {
  return audience === 'platform' ? PLATFORM_MESSAGE : MESSAGE
}
