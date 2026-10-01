// Marketing → Scripts: ready-made wording staff paste into Email and the
// Airbnb Inbox, and that the AI follows when it drafts replies.
// Shared by browser and server.

export type Script = {
  id: string
  name: string
  category: string
  stage: string | null      // e.g. "Step 1 · First message to a host"
  kind: 'message' | 'guide' // guide = staff instructions, never sent
  body: string
  note: string | null       // tip for staff, shown next to the script
  show_email: boolean
  show_airbnb: boolean
  ai_use: boolean
  sort: number
  use_count: number
  created_by?: string | null
  updated_by?: string | null
  updated_at?: string
}

export const FILL_INS = ['{first_name}', '{name}', '{property}', '{my_name}'] as const

// Replace the fill-ins we know; leave unknown ones visible so staff spot them.
export function fillScript(text: string, v: { name?: string | null; property?: string | null; myName?: string | null }) {
  const name = (v.name ?? '').replace(/["']/g, '').trim()
  const usable = name && !name.includes('@') ? name : ''
  const first = usable.split(/\s+/)[0] ?? ''
  let out = text
  if (first) out = out.replace(/\{first_name\}/g, first)
  else out = out.replace(/,?\s*\{first_name\}/g, '') // "Hi {first_name}," -> "Hi,"
  if (usable) out = out.replace(/\{name\}/g, usable)
  if (v.property) out = out.replace(/\{property\}/g, v.property)
  if (v.myName && !v.myName.includes('@')) out = out.replace(/\{my_name\}/g, v.myName)
  return out
}

const PALETTE = ['#FF385C', '#579BFC', '#00C875', '#FDAB3D', '#9D50DD', '#A8862E', '#E2445C', '#66CCFF']
export function categoryColor(cat: string) {
  if (/airbnb/i.test(cat)) return '#FF385C'
  let h = 0
  for (const ch of cat) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return PALETTE[h % PALETTE.length]
}

// Text block the AI gets so it follows our wording (server prompts).
export function scriptsForAi(list: Script[]) {
  const use = list.filter(s => s.ai_use && s.body.trim())
  if (!use.length) return ''
  const msgs = use.filter(s => s.kind !== 'guide')
  const guides = use.filter(s => s.kind === 'guide')
  return `\n\nAPPROVED SCRIPTS — when the situation matches one of these, base your reply on its wording (adapt names and details, keep the meaning, don't add new facts). Fill-ins in {curly brackets}: use the person's first name for {first_name}; drop any you can't fill.\n` +
    msgs.map(s => `### ${s.category}${s.stage ? ` — ${s.stage}` : ''} — ${s.name}\n${s.body.trim()}`).join('\n\n') +
    (guides.length ? `\n\nSTAFF GUIDANCE (context only — never send this text):\n` + guides.map(s => `### ${s.name}\n${s.body.trim()}`).join('\n\n') : '')
}
