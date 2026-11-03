import { NextRequest } from 'next/server'
import { requireUser, serviceClient as db } from '@/lib/admin-auth'
import { parseGoal, progress, reviewGoal, STAGE_ODDS, type Goal } from '@/lib/portfolio-goals'

export const maxDuration = 60
const j = (o: any, status = 200) => Response.json(o, { status })

export async function GET(req: NextRequest) {
  const uid = await requireUser(req)
  if (!uid) return j({ error: 'Not signed in' }, 401)
  const { data } = await db.from('portfolio_goals').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(20)
  const goals = await Promise.all((data ?? []).map(async (g: any) => ({ ...g, progress: await progress(uid, g) })))
  return j({ goals, odds: STAGE_ODDS })
}

// POST { action:'create', text } | { action:'review'|'toggle'|'delete', goalId }
export async function POST(req: NextRequest) {
  const uid = await requireUser(req)
  if (!uid) return j({ error: 'Not signed in' }, 401)
  const b = await req.json().catch(() => ({}))
  if (b.action === 'create') {
    const text = String(b.text || '').trim().slice(0, 600)
    if (text.length < 8) return j({ error: 'Say what you want to reach, where and by when.' }, 400)
    const target = await parseGoal(text)
    if (!target) return j({ error: 'I could not find a number to aim for. Try "50 units in Manchester by June".' }, 400)
    const { data, error } = await db.from('portfolio_goals').insert({ user_id: uid, text, target }).select('*').single()
    if (error) return j({ error: error.message }, 500)
    await reviewGoal(data as Goal)
    return j({ success: true })
  }
  const { data: g } = await db.from('portfolio_goals').select('*').eq('id', b.goalId).eq('user_id', uid).maybeSingle()
  if (!g) return j({ error: 'Goal not found' }, 404)
  if (b.action === 'delete') { await db.from('portfolio_goals').delete().eq('id', g.id); return j({ success: true }) }
  if (b.action === 'toggle') { await db.from('portfolio_goals').update({ status: g.status === 'active' ? 'paused' : 'active' }).eq('id', g.id); return j({ success: true }) }
  if (b.action === 'review') { await reviewGoal(g as Goal); return j({ success: true }) }
  return j({ error: 'Unknown action' }, 400)
}
