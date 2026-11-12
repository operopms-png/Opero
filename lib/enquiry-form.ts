// The public "work with us" enquiry form (app/enquire/[token]). Shared by the page and its API.
// Each company has its own link (table enquiry_links); every lead lands in that company's CRM.
export const ENQUIRY_SERVICES = [
  { key: 'guaranteed_rent', label: 'Guaranteed Rent', text: 'We rent your property from you and pay you a fixed, guaranteed rent every month.', module: 'pm' },
  { key: 'short_let', label: 'Short Let Partnership', text: 'We run your property as a short stay and share the income with you.', module: 'str' },
  { key: 'estate_pm', label: 'Estate Property Management', text: 'We find tenants and manage your property day to day for a fee.', module: 'estate' },
] as const
export type EnquiryService = typeof ENQUIRY_SERVICES[number]['key']

export const BEDROOMS = ['Studio', '1', '2', '3', '4', '5', '6+']
export const BATHROOMS = ['1', '2', '3', '4', '5+']
export const FURNITURE = ['Fully furnished', 'Part furnished', 'Unfurnished']
export const WHEN = ['In less than a month', 'In 1 to 3 months', 'More than 3 months']
export const ROLES = ['Owner', 'Investor', 'Other']
