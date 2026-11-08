// Utility providers we know, so a bill account can be set up in one tap. Client and server safe.
export type UtilityProvider = { key: string; name: string; service: string; unit: string; site: string }
export const UTILITY_PROVIDERS: UtilityProvider[] = [
  { key: 'jps', name: 'JPS', service: 'Electricity', unit: 'kWh', site: 'https://www.jpsco.com' },
  { key: 'flow', name: 'Flow', service: 'Broadband', unit: 'GB', site: 'https://www.discoverflow.co/jamaica' },
  { key: 'nwc', name: 'NWC', service: 'Water', unit: 'm³', site: 'https://www.nwcjamaica.com' },
  { key: 'digicel', name: 'Digicel', service: 'Broadband', unit: 'GB', site: 'https://digiceljamaica.com' },
]
export const providerFor = (supplier?: string | null) => { const s = String(supplier || '').toLowerCase(); return UTILITY_PROVIDERS.find(p => s.includes(p.key) || s.includes(p.name.toLowerCase())) }
export const defaultUnit = (service?: string | null) => /elec/i.test(service || '') ? 'kWh' : /gas/i.test(service || '') ? 'kWh' : /water/i.test(service || '') ? 'm³' : /broad|internet/i.test(service || '') ? 'GB' : ''
