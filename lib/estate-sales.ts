// Sales progression helpers: the standard checklist and starting a sale from an accepted offer.
import { supabase } from './supabase'

export const SALE_STEPS: { category: string; steps: string[] }[] = [
  { category: 'Conveyancing', steps: ['Solicitors instructed', 'Memorandum of sale sent', 'Draft contract received', 'Searches ordered', 'Searches returned', 'Enquiries raised and answered'] },
  { category: 'Due diligence', steps: ['Buyer ID and AML checked', 'Proof of funds received', 'Mortgage offer received', 'Survey or valuation done', 'Title checked'] },
  { category: 'Contracts', steps: ['Contracts agreed', 'Contracts signed', 'Deposit received', 'Exchange of contracts'] },
  { category: 'Completion', steps: ['Completion date set', 'Funds received', 'Keys released', 'Completion confirmed'] },
]
export const SALE_STATUSES = ['Sale agreed', 'In progress', 'Exchanged', 'Completed', 'Fell through']

// Creates the sale and its checklist from an accepted offer. Returns an error message or null.
export async function startSaleFromOffer(offer: any, userId: string): Promise<string | null> {
  const { data: existing } = await supabase.from('estate_sales').select('id').eq('offer_id', offer.id).limit(1)
  if (existing && existing.length) return 'A sale has already been started for this offer'
  const price = offer.counter_amount ?? offer.amount // a counteroffer that was accepted is the agreed price; you can edit it on the sale
  const { data: sale, error } = await supabase.from('estate_sales').insert([{
    user_id: userId, property_id: offer.property_id, offer_id: offer.id, buyer_id: offer.contact_id, agreed_price: price, status: 'Sale agreed',
  }]).select('id').single()
  if (error || !sale) return error?.message ?? 'Could not start the sale'
  let sort = 0
  const rows = SALE_STEPS.flatMap(g => g.steps.map(name => ({ user_id: userId, sale_id: sale.id, category: g.category, name, sort: sort++ })))
  const { error: e2 } = await supabase.from('estate_sale_steps').insert(rows)
  return e2?.message ?? null
}
