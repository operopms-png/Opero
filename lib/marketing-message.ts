// A ready-written NOVOURQ marketing message for the Mailing list. {{first_name}} is replaced with each person's first name.
export type MsgAudience = 'all' | 'landlord' | 'investor' | 'other'

const SIGN = `Kind regards,\nNOVOURQ\ncontact.us@thenovourq.com`

const BODY: Record<MsgAudience, { subject: string; text: string }> = {
  landlord: {
    subject: 'Guaranteed rent for your property',
    text: `Hello {{first_name}},\n\nNOVOURQ manages houses, apartments and hospitality units across Jamaica and the UK. Our Guaranteed Rent scheme pays you a fixed rent on time, every month, while we look after the property and find vetted, ready-to-move tenants.\n\nWhat you get:\n- Rent you can rely on, with no void periods to worry about\n- Day-to-day management, maintenance and compliance handled for you\n- An owners portal where you can see your statements, documents and property updates at any time\n- Contracts of 3 to 5 years, so you have certainty\n\nI have attached our brochure and property information below. If you would like to talk through your property, simply reply to this email.\n\n${SIGN}`,
  },
  investor: {
    subject: 'Property management that protects your investment',
    text: `Hello {{first_name}},\n\nNOVOURQ runs property for investors across Jamaica and the UK, with the technology and the team to keep every unit performing. Our AI-run platform removes human error from rent collection, maintenance and reporting, and gives you a clear view of your portfolio through your own owners portal.\n\nWe offer Guaranteed Rent, short let partnerships and estate management on contracts of 3 to 5 years.\n\nOur brochure and information are below. If you would like to discuss your portfolio, reply to this email and we will arrange a call.\n\n${SIGN}`,
  },
  other: {
    subject: 'News from NOVOURQ',
    text: `Hello {{first_name}},\n\nThank you for your interest in NOVOURQ. We manage and let property across Jamaica and the UK, with furnished apartments for tenants and Guaranteed Rent for landlords, all supported by our AI-run property platform.\n\nOur latest information is below. If anything is useful, or you have a question, just reply to this email.\n\n${SIGN}`,
  },
  all: {
    subject: 'Guaranteed rent and managed property with NOVOURQ',
    text: `Hello {{first_name}},\n\nNOVOURQ manages houses, apartments and hospitality units across Jamaica and the UK. Landlords get Guaranteed Rent on contracts of 3 to 5 years, tenants get well-kept furnished homes, and everyone gets a clear view of their property through our portals.\n\nOur brochure and information are below. If you would like to talk, reply to this email and a member of the team will be in touch.\n\n${SIGN}`,
  },
}

export function generateMessage(aud: string): { subject: string; text: string } {
  const k: MsgAudience = aud === 'landlord' || aud === 'investor' ? aud : aud === 'all' ? 'all' : 'other'
  return BODY[k]
}
