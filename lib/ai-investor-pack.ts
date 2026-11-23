// Lets Novourq Cloud AI (Ask AI and Novourq Voice) find an investor's pack and get its link ready, or start a new one.
// An investor pack shows figures an investor relies on, so this never makes a link by itself: it waits in Staff Centre → AI Approvals
// and the pack's link goes live, as Sent, only when a person approves it. Same result as Staff Centre → Human Intelligence Hub →
// Clients and sales → Marketing → Pack Builder → open the pack → Create link and mark Sent. The AI never sends the link to the investor.
import { serviceClient as db } from '@/lib/admin-auth'
import { queueAiAction } from '@/lib/ai-approvals'

type Who = { businessId: string; name: string; email: string; isAdmin: boolean; role?: string }

export async function proposeInvestorPack(c: Who, input: { investor: unknown; investors?: unknown; kind?: unknown; agentKey: string; via: string }): Promise<{ ok: true; summary: string; already?: boolean } | { ok: false; error: string }> {
  if (!(c.isAdmin || /co founder/i.test(c.role || ''))) return { ok: false, error: 'Only admins and co-founders can create investor pack links.' }
  const investor = String(input.investor || '').trim().replace(/[%_,()]/g, ' ').slice(0, 80).trim()
  if (!investor) return { ok: false, error: 'I need the investor\'s name.' }
  const { data: found } = await db.from('invest_packs').select('id,name,prepared_for,stage,active,kind:data->>kind').eq('business_id', c.businessId)
    .or(`prepared_for.ilike.%${investor}%,name.ilike.%${investor}%`).order('updated_at', { ascending: false }).limit(5)
  const kind = String(input.kind || '').toLowerCase() === 'property' ? 'property' : 'full'
  const same = (found ?? []).filter(p => (p.kind === 'property' ? 'property' : 'full') === kind) // a property-only pack and a full pack for the same investor are different packs
  const live = same.find(p => p.stage !== 'draft')
  const draft = same.find(p => p.stage === 'draft')
  if (live && !draft) return { ok: true, already: true, summary: `"${live.name}" already has a live link (stage: ${live.stage}${live.active ? '' : ', paused'}). Open it in Pack Builder to copy it` }
  const investors = Math.min(20, Math.max(1, Math.round(Number(input.investors) || 2)))
  const title = draft ? `Create the link for "${draft.name}"` : `New ${kind === 'property' ? 'property-only ' : ''}investor pack for ${investor}`
  const text = draft
    ? `Pack: ${draft.name}\nFor: ${draft.prepared_for || investor}\n\nApproving makes this pack's link live and marks it Sent. It is not sent to ${investor}: you copy the link or the WhatsApp message from Pack Builder and send it yourself. Check the figures in the preview first.`
    : `New ${kind === 'property' ? 'property-only pack (no car, with the landlord-offer example)' : 'pack'} for ${investor}, ${investors} investor${investors === 1 ? '' : 's'}, with the standard ${kind === 'property' ? 'property' : 'Voxy and property'} figures.\n\nApproving builds the pack and makes its link live as Sent. It is not sent to ${investor}: you copy the link or the WhatsApp message from Pack Builder and send it yourself. Check the figures and add photos there.`
  const q: any = await queueAiAction({
    userId: c.businessId, agentKey: input.agentKey, actionType: 'investor_pack', title: title.slice(0, 140), draftBody: text,
    payload: draft ? { pack_id: draft.id, investor, dedupe: `${investor}|${kind}` } : { investor, investors, kind, dedupe: `${investor}|${kind}` },
    reason: `${c.name || c.email} asked for this ${input.via}`,
    dedupe: { key: 'dedupe', value: `${investor}|${kind}`, sinceIso: new Date(Date.now() - 86400000).toISOString() },
  })
  if (q?.error) return { ok: false, error: q.error }
  if (q?.skipped) return { ok: false, error: `That is already waiting in AI Approvals.` }
  return { ok: true, summary: draft ? `the link for "${draft.name}"` : `a new investor pack for ${investor}` }
}
