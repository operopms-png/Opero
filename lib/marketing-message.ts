// The one ready-written NOVOURQ marketing message for the Mailing list (our management service).
// {{first_name}} is replaced with each person's first name.
const SIGN = `Kind regards,\nNOVOURQ\ncontact.us@thenovourq.com`

const MESSAGE = {
  subject: 'Property management and Guaranteed Rent with NOVOURQ',
  text: `Hello {{first_name}},\n\nWe are NOVOURQ. We manage houses, apartments and hospitality units across Jamaica and the UK, and we take care of your property from start to finish, so you can rely on it without having to run it yourself.\n\nWe use AI technology to remove human error from rent collection, maintenance and reporting, and our owners portal gives you full transparency, so you can see your statements, documents and property updates at any time.\n\nWhat our management service gives you:\n- Guaranteed Rent, paid on time every month, on contracts of 3 to 5 years\n- Vetted, ready-to-move tenants and well-kept furnished homes\n- Day-to-day management, maintenance and compliance handled for you\n\nYou can open our brochure here: https://app.thenovourq.com/services/NOVOURQ_Brochure.pdf\n\nIf you would like to know more, schedule a meeting with us: https://app.thenovourq.com/meeting\n\n${SIGN}`,
}

export function generateMessage(_audience?: string): { subject: string; text: string } {
  return MESSAGE
}
