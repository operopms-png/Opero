// AI marketing agent. Drafts a few social posts a day from real records (listings, short-stay properties, developments).
// Like every agent it only drafts into AI Approvals. Approving saves the post to Marketing, Social posts, as Scheduled.
// Posting straight to the platforms needs each account connected; until then the post is ready to copy from that board.
import { callClaude } from './claude'
import { queueAiAction } from './ai-approvals'
import { svc, freshCounts, enabledBusinesses, companyName, dayStr } from './ai-proposal-utils'

const done = (r: any, q: any) => { if ('queued' in q) r.queued++; else { r.skipped++; if ('error' in q) r.errors.push(q.error) } }
const PLATFORMS = ['Instagram', 'Facebook', 'LinkedIn']
const MAX_PER_RUN = 3

type Subject = { module: 'estate' | 'str' | 'dev'; label: string; key: string; facts: string }

export async function proposeSocialPosts() {
  const db = svc()
  const result = freshCounts()
  const businesses = await enabledBusinesses('marketing_posts')
  result.businesses = businesses.length
  const day = dayStr()
  const dayNo = Math.floor(Date.now() / 86400000)

  for (const businessId of businesses) {
    const [est, str, dev] = await Promise.all([
      db.from('estate_properties').select('id,name,address,type,bedrooms,rent,status,description,features,available_from').eq('user_id', businessId).limit(60),
      db.from('properties').select('id,name,city,bedrooms,max_guests,description,amenities,status').eq('user_id', businessId).limit(60),
      db.from('dev_projects').select('id,name,location,status,description').eq('user_id', businessId).limit(30),
    ])
    const subjects: Subject[] = []
    for (const p of est.data ?? []) {
      if (/let|rented|sold|withdrawn|archiv/i.test(String(p.status ?? ''))) continue
      subjects.push({ module: 'estate', label: p.name || p.address, key: `estate:${p.id}`, facts: [p.type && `Type: ${p.type}`, p.bedrooms != null && `Bedrooms: ${p.bedrooms}`, p.address && `Area: ${p.address}`, p.rent && `Rent: ${p.rent}`, p.features && `Features: ${Array.isArray(p.features) ? p.features.join(', ') : p.features}`, p.available_from && `Available from: ${p.available_from}`, p.description && `Description: ${String(p.description).slice(0, 400)}`].filter(Boolean).join('\n') })
    }
    for (const p of str.data ?? []) {
      subjects.push({ module: 'str', label: p.name, key: `str:${p.id}`, facts: [p.city && `Location: ${p.city}`, p.bedrooms != null && `Bedrooms: ${p.bedrooms}`, p.max_guests && `Sleeps: ${p.max_guests}`, p.amenities && `Amenities: ${Array.isArray(p.amenities) ? p.amenities.join(', ') : p.amenities}`, p.description && `Description: ${String(p.description).slice(0, 400)}`].filter(Boolean).join('\n') })
    }
    for (const p of dev.data ?? []) {
      subjects.push({ module: 'dev', label: p.name, key: `dev:${p.id}`, facts: [p.location && `Location: ${p.location}`, p.status && `Stage: ${p.status}`, p.description && `About: ${String(p.description).slice(0, 400)}`].filter(Boolean).join('\n') })
    }
    const usable = subjects.filter(s => s.facts.split('\n').length >= 2)
    if (!usable.length) { result.skipped++; continue }
    const sign = await companyName(businessId)
    // Rotate through the records so every one is featured in turn, one per module per day at most.
    const picks: Subject[] = []
    for (const m of ['estate', 'str', 'dev'] as const) {
      const pool = usable.filter(s => s.module === m)
      if (pool.length) picks.push(pool[dayNo % pool.length])
    }
    for (const [i, s] of picks.slice(0, MAX_PER_RUN).entries()) {
      const platform = PLATFORMS[(dayNo + i) % PLATFORMS.length]
      const system = `You write one short social media post for ${sign} on ${platform}. Use only the facts given. Do not invent features, prices, views, distances, availability, awards or guarantees, and do not promise returns. Plain, warm, professional tone, no childish emojis (none at all on LinkedIn). 40 to 80 words. End with a short call to action to enquire or message us. Then on a new line write 3 to 5 relevant hashtags. Return only the post.`
      const { text, error } = await callClaude(system, `Write the post about: ${s.label}\n\nFacts:\n${s.facts}`, 400)
      if (error || !text) { result.errors.push(`${s.label}: ${error ?? 'no text'}`); continue }
      const q = await queueAiAction({
        userId: businessId, agentKey: 'marketing_posts', actionType: 'social_post',
        title: `${platform} post: ${s.label}`, propertyName: s.label, draftBody: text,
        payload: { platform, module: s.module, subject: s.key, scheduled_at: new Date(Date.now() + 86400000).toISOString().slice(0, 10) + 'T09:00:00Z' },
        context: { summary: `Written only from the details on the ${s.label} record. Approving saves it to Marketing, Social posts, scheduled for tomorrow 09:00. Check it before approving.` },
        dedupe: { key: 'subject', value: s.key, sinceIso: dayStr(-14) + 'T00:00:00Z' },
      })
      done(result, q)
    }
    // One video brief a day: script, a prompt to paste into the video tool (Snippo) and a caption. Approving puts a task on the board.
    const vpick = usable[(dayNo + 1) % usable.length]
    {
      const system = `You write a brief for a 20 to 30 second vertical social video for ${sign}. Use only the facts given. Do not invent features, prices, views, distances or promises. Return exactly three parts with these headings on their own lines: "Script" (a short voice-over of 50 to 70 words, plain and warm), "Video prompt" (a realistic scene-by-scene description of 4 to 6 shots to paste into an AI video tool: what the camera shows, no text on screen, no people's faces in close-up, no logos), "Caption" (one or two sentences and 3 to 5 hashtags). No emojis.`
      const { text, error } = await callClaude(system, `Subject: ${vpick.label}\n\nFacts:\n${vpick.facts}`, 700)
      if (error || !text) result.errors.push(`video ${vpick.label}: ${error ?? 'no text'}`)
      else {
        const q = await queueAiAction({
          userId: businessId, agentKey: 'marketing_posts', actionType: 'video_brief',
          title: `Video brief: ${vpick.label}`, propertyName: vpick.label, draftBody: text,
          payload: { module: vpick.module, subject: 'video:' + vpick.key, label: vpick.label },
          context: { summary: `A script, video prompt and caption written only from the details on the ${vpick.label} record. Approving puts a task on your Task board to make the video in Snippo and upload it to Marketing, Videos.` },
          dedupe: { key: 'subject', value: 'video:' + vpick.key, sinceIso: dayStr(-14) + 'T00:00:00Z' },
        })
        done(result, q)
      }
    }
    void day
  }
  return result
}
