// Built-in pictures for the Portal guides (Staff Training). They show on a tab's guide in addition to any pictures an admin uploads.
export type GuidePic = { src: string; caption: string }

export const BUILT_IN_PICTURES: Record<string, GuidePic[]> = {
  're:hotel:Executive Dashboard': [
    { src: '/guide/hotels-dashboard.jpg', caption: 'Hotels, Executive Dashboard: rooms, occupancy tonight, who is in house, arrivals and departures today, rooms to clean and balances to collect. Press any tile or list to open it. The names here are examples.' },
  ],
  're:hotel:Reservations & Bookings': [
    { src: '/guide/hotels-reservations.jpg', caption: 'Hotels, Reservations and Bookings: press Check in when a guest arrives and Check out when they leave. The balance shows what the guest still owes. The names here are examples.' },
  ],
  're:community:Dashboard': [
    { src: '/guide/communities-dashboard.jpg', caption: 'Gated Communities, Dashboard: units, occupancy, residents, visitors on site, open repairs and open complaints at a glance. Press a tile to open that tab. The names here are examples.' },
  ],
  're:community:Visitor Management': [
    { src: '/guide/communities-visitors.jpg', caption: 'Gated Communities, Visitor Management: press Check in when a visitor arrives at the gate, Check out when they leave, or Deny entry. The names here are examples.' },
  ],
  '/staff-centre/ai-command-centre/office': [
    { src: '/guide/ai-office.jpg', caption: 'AI Office: each desk is one part of your AI team. The bubble shows what it last did and the orange badge is what waits for your yes. Tap a desk to see its latest work on the right. The activity here is an example.' },
  ],
  '/staff-centre/upkeep': [
    { src: '/guide/building-notices.jpg', caption: 'Building notices: write the notice, tick the homes and who sees it, and press Post notice. Past notices are listed underneath so you can hide or delete them.' },
  ],
  '/staff-centre/marketing': [
    { src: '/guide/marketing-mailing-list-button.jpg', caption: '1. Press Mailing list, next to "Sending as" at the top of Emails.' },
    { src: '/guide/mailing-list-window.jpg', caption: '1. Choose the audience (landlords, investors or platform leads). 2. Press Generate NOVOURQ message. 3. Pick a saved draft instead if you prefer. Then tick documents, choose pictures and/or PDF, and Send.' },
    { src: '/guide/landlords-link.jpg', caption: 'One link for all landlords: existing landlords sign in to the owners portal, new ones open the enquiry form. Copy it from the Enquiry form link card.' },
    { src: '/guide/tenants-link.jpg', caption: 'One link for all tenants: existing tenants go to the tenants portal, everyone else to the property listings. Copy it from the same card.' },
  ],
  '/pm?tab=Landlords': [
    { src: '/guide/hub-landlord-onboarding.jpg', caption: 'Onboarding a landlord: 1. Landlord Leads / CRM for the enquiry, 2. Owners to add the landlord, 3. Co-hosts if they have one, 4. Documents to store their ID and agreement.' },
  ],
  '/staff-centre/landlord-leads': [
    { src: '/guide/hub-landlord-onboarding.jpg', caption: 'Onboarding a landlord: 1. Landlord Leads / CRM for the enquiry, 2. Owners to add the landlord, 3. Co-hosts if they have one, 4. Documents to store their ID and agreement.' },
  ],
  '/staff-centre/services-pack': [
    { src: '/guide/ai-brochure.jpg', caption: 'The AI platform brochure (9 pages). It appears in Services Pack and under "AI platform" in the Mailing list, where you can send it as pictures and a PDF.' },
  ],
}
