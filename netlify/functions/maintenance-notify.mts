// Runs every 5 minutes: emails tenants, landlords and linked partners when a repair is reported, started or fixed.
import { schedule } from '@netlify/functions'
import { runMaintenanceNotify } from '../../lib/maintenance-notify'

export const handler = schedule('*/5 * * * *', async () => {
  const r = await runMaintenanceNotify()
  console.log('[maintenance-notify]', JSON.stringify(r))
  return { statusCode: r.errors.length ? 500 : 200 }
})
