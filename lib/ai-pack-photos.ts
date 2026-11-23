// Lets Novourq Cloud AI (Ask AI) add photos to an investor pack. The photos are attached in the chat, which uploads them to
// the portal's own file storage first; this only accepts links to that storage, so nothing outside it can be put in a pack.
// Photos are low risk and easy to remove (Pack Builder → open the pack → the cross on a photo), so this applies straight away
// with no approval step. It never changes the link, the stage or the figures. Admins and co-founders only.
import { serviceClient as db } from '@/lib/admin-auth'
import { cleanPack, type PackData } from '@/lib/pack-calc'

type Who = { businessId: string; name: string; email: string; isAdmin: boolean; role?: string }

const BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/pm-files/`

export async function addPackPhotos(c: Who, input: { investors: unknown; section: unknown; urls: unknown }): Promise<{ ok: true; summary: string } | { ok: false; error: string }> {
  if (!(c.isAdmin || /co founder/i.test(c.role || ''))) return { ok: false, error: 'Only admins and co-founders can add photos to investor packs.' }
  const sec = String(input.section || '').toLowerCase()
  const section: 'car' | 'home' | null = /car|voxy|vehicle|taxi/.test(sec) ? 'car' : /home|property|house|edmund|flat|apartment/.test(sec) ? 'home' : null
  if (!section) return { ok: false, error: 'Tell me which section the photos go in: the car (Voxy) or the property.' }
  const urls = Array.from(new Set(String(input.urls || '').split(/[\s,]+/).filter(u => u.startsWith(BASE) && u.length < 400)))
  if (!urls.length) return { ok: false, error: 'I did not get any attached photos. Attach them with the paperclip, then ask again.' }
  const names = String(input.investors || '').split(',').map(s => s.trim().replace(/[%_()]/g, ' ').slice(0, 80).trim()).filter(Boolean).slice(0, 10)
  if (!names.length) return { ok: false, error: 'I need the investor name or names.' }

  const done: string[] = []
  const missed: string[] = []
  for (const n of names) {
    const { data: found } = await db.from('invest_packs').select('id,name,data,stage').eq('business_id', c.businessId)
      .or(`prepared_for.ilike.%${n}%,name.ilike.%${n}%`).order('updated_at', { ascending: false }).limit(1)
    const p = found?.[0]
    if (!p) { missed.push(n); continue }
    const cur: PackData = cleanPack(p.data)
    const next = cleanPack({ ...cur, [section]: { ...cur[section], photos: [...cur[section].photos, ...urls.filter(u => !cur[section].photos.includes(u))].slice(0, 24) } })
    const { error } = await db.from('invest_packs').update({ data: next, updated_at: new Date().toISOString() }).eq('id', p.id).eq('business_id', c.businessId)
    if (error) return { ok: false, error: error.message }
    done.push(`"${p.name}"`)
  }
  if (!done.length) return { ok: false, error: `I could not find a pack for ${missed.join(', ')}.` }
  const where = section === 'car' ? 'car (Voxy)' : 'property'
  return { ok: true, summary: `${urls.length} photo${urls.length === 1 ? '' : 's'} to the ${where} section of ${done.join(' and ')}${missed.length ? `. No pack found for ${missed.join(', ')}` : ''}` }
}
