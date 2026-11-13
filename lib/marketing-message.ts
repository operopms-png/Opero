// The one ready-written NOVOURQ marketing message for the Mailing list (our management service).
// {{first_name}} is replaced with each person's first name.
const SIGN = `Kind regards,\nNOVOURQ\ncontact.us@thenovourq.com`

const MESSAGE = {
  subject: 'Property management and Guaranteed Rent with NOVOURQ',
  text: `Hello {{first_name}},\n\nWe are NOVOURQ. We manage houses, apartments and hospitality units across Jamaica and the UK, and we take care of your property from start to finish, so you can rely on it without having to run it yourself.\n\nWhat our management service gives you:\n- Guaranteed Rent, paid on time every month, on contracts of 3 to 5 years\n- Vetted, ready-to-move tenants and well-kept furnished homes\n- Day-to-day management, maintenance and compliance handled for you\n- Technology that removes human error from rent collection, maintenance and reporting\n- An owners portal where you can see your statements, documents and property updates at any time\n\nOur brochure and information are below. If you would like to talk through your property, simply reply to this email and a member of the team will be in touch.\n\n${SIGN}`,
}

export function generateMessage(_audience?: string): { subject: string; text: string } {
  return MESSAGE
}
