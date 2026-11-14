import { NextRequest, NextResponse } from 'next/server'
import { serviceClient, requireStaffWithBusiness } from '@/lib/admin-auth'
import { LISTINGS_BUSINESS_ID } from '@/lib/listings'

// Group voice and video calls for Team Chat. Rooms are made on Daily (needs DAILY_API_KEY).
// A call is announced as a chat message carrying a [[call:ROOM:voice|video]] marker; joining checks
// the caller is a member of that chat and that the marker was posted there, so no extra table is needed.
const DAILY = 'https://api.daily.co/v1'
const MARKER = /\[\[call:([a-z0-9-]{6,60}):(voice|video)\]\]/

async function daily(path: string, body?: any, method = body ? 'POST' : 'GET') {
  const res = await fetch(DAILY + path, {
    method, headers: { Authorization: `Bearer ${process.env.DAILY_API_KEY}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const j = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(j?.info || j?.error || `Call service error ${res.status}`)
  return j
}

export async function POST(req: NextRequest) {
  const auth = await requireStaffWithBusiness(req)
  if (!auth || !auth.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // Calls run on the platform owner's Daily account and are billed to it, so they are limited to the
  // owner's own company until each client company can connect its own call account.
  if (auth.businessId !== LISTINGS_BUSINESS_ID) return NextResponse.json({ error: 'Group and video calls are not switched on for your company yet.' }, { status: 403 })
  if (!process.env.DAILY_API_KEY) return NextResponse.json({ error: 'Group calling is not switched on yet. Add DAILY_API_KEY in Netlify to enable it.' }, { status: 503 })

  const { action, conversation_id, room, video } = await req.json().catch(() => ({}))
  if (!conversation_id) return NextResponse.json({ error: 'conversation_id is required' }, { status: 400 })

  const { data: convo } = await serviceClient.from('staff_conversations').select('id,user_id,name').eq('id', conversation_id).maybeSingle()
  if (!convo || convo.user_id !== auth.businessId) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  const { data: mem } = await serviceClient.from('staff_conversation_members').select('member_name')
    .eq('conversation_id', conversation_id).ilike('member_email', auth.email).maybeSingle()
  if (!mem) return NextResponse.json({ error: 'You are not in this chat' }, { status: 403 })
  const myName = String(mem.member_name || auth.email.split('@')[0]).trim()
  const exp = Math.floor(Date.now() / 1000) + 3 * 3600

  try {
    let roomName: string, withVideo: boolean
    if (action === 'start') {
      withVideo = !!video
      roomName = 'nvq-' + crypto.randomUUID().replace(/-/g, '').slice(0, 20)
      await daily('/rooms', { name: roomName, privacy: 'private', properties: { exp, eject_at_room_exp: true, enable_screenshare: true, enable_chat: true, start_video_off: !withVideo } })
      await serviceClient.from('staff_messages').insert({
        conversation_id, sender_email: auth.email, sender_name: myName,
        body: `${withVideo ? '🎥' : '📞'} ${myName} started a ${withVideo ? 'video' : 'voice'} call. [[call:${roomName}:${withVideo ? 'video' : 'voice'}]]`,
      })
    } else if (action === 'join') {
      const m = String(room || '').match(/^[a-z0-9-]{6,60}$/)
      if (!m) return NextResponse.json({ error: 'Bad call' }, { status: 400 })
      roomName = room
      const { data: posted } = await serviceClient.from('staff_messages').select('body')
        .eq('conversation_id', conversation_id).like('body', `%[[call:${roomName}:%`).limit(1)
      const kind = posted?.[0]?.body?.match(MARKER)?.[2]
      if (!kind) return NextResponse.json({ error: 'That call is not part of this chat' }, { status: 404 })
      withVideo = kind === 'video'
    } else return NextResponse.json({ error: 'Unknown action' }, { status: 400 })

    let info: any
    try { info = await daily(`/rooms/${roomName}`) } catch { return NextResponse.json({ error: 'This call has ended.' }, { status: 410 }) }
    const t = await daily('/meeting-tokens', { properties: { room_name: roomName, user_name: myName, exp, start_video_off: !withVideo } })
    return NextResponse.json({ url: info.url, token: t.token, video: withVideo, room: roomName })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Could not start the call' }, { status: 502 })
  }
}
