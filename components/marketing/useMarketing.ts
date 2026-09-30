'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, getAccountId } from '@/lib/supabase'
import { BOARDS, type MkBoardKey } from '@/lib/marketing-boards'

export type EmailStats = { delivered: boolean; opened: number; clicked: number; bounced: boolean; replies: number }

export function useMarketing() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accountId, setAccountId] = useState<string>('')
  const [rows, setRows] = useState<Record<MkBoardKey, any[]>>({ campaigns: [], emails: [], social: [], ads: [], templates: [] })
  const [replies, setReplies] = useState<Record<string, any[]>>({})
  const [events, setEvents] = useState<any[]>([])
  const [people, setPeople] = useState<string[]>([])
  const [me, setMe] = useState<string>('')
  const [sendSettings, setSendSettings] = useState({ marketing_from_email: '', marketing_from_name: 'Sangsters Group' })
  const [sendingId, setSendingId] = useState<string | null>(null)

  const loadEmailExtras = useCallback(async (emailIds: string[]) => {
    if (!emailIds.length) { setReplies({}); setEvents([]); return }
    const [{ data: rep }, { data: ev }] = await Promise.all([
      supabase.from('marketing_email_replies').select('*').in('marketing_email_id', emailIds).order('created_at', { ascending: true }),
      supabase.from('marketing_email_events').select('*').in('marketing_email_id', emailIds),
    ])
    const g: Record<string, any[]> = {}
    for (const r of rep ?? []) (g[r.marketing_email_id] ??= []).push(r)
    setReplies(g); setEvents(ev ?? [])
  }, [])

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    const acc = await getAccountId(user)
    setAccountId(acc)
    const results = await Promise.all(BOARDS.map(b => supabase.from(b.table).select('*').eq('user_id', acc).order('created_at', { ascending: false })))
    const bad = results.find(r => r.error)
    if (bad?.error) { setError(bad.error.message); setLoading(false); return }
    const next = {} as Record<MkBoardKey, any[]>
    BOARDS.forEach((b, i) => { next[b.key] = results[i].data ?? [] })
    setRows(next)
    await loadEmailExtras(next.emails.map(e => e.id))
    const [{ data: team }, { data: settings }] = await Promise.all([
      supabase.from('team_members').select('name,email').eq('user_id', acc),
      supabase.from('integrations').select('marketing_from_email,marketing_from_name').eq('user_id', acc).maybeSingle(),
    ])
    const myName = (team ?? []).find((t: any) => t.email === user.email)?.name || user.user_metadata?.full_name || (user.email ?? '').split('@')[0]
    setMe(myName)
    const names = new Set<string>([myName, ...(team ?? []).filter((t: any) => t.name?.trim() && t.email?.includes('@')).map((t: any) => t.name.trim())])
    setPeople([...names].filter(Boolean))
    if (settings) setSendSettings({ marketing_from_email: settings.marketing_from_email || '', marketing_from_name: settings.marketing_from_name || 'Sangsters Group' })
    setLoading(false)
  }, [loadEmailExtras])

  useEffect(() => { load() }, [load])

  const tableOf = (k: MkBoardKey) => BOARDS.find(b => b.key === k)!.table

  const update = useCallback(async (k: MkBoardKey, id: string, patch: Record<string, any>) => {
    let prev: any[] = []
    setRows(r => { prev = r[k]; return { ...r, [k]: r[k].map(x => x.id === id ? { ...x, ...patch } : x) } })
    const { error } = await supabase.from(tableOf(k)).update(patch).eq('id', id)
    if (error) { alert(error.message); setRows(r => ({ ...r, [k]: prev })) }
  }, [])

  const add = useCallback(async (k: MkBoardKey, values: Record<string, any>) => {
    const b = BOARDS.find(x => x.key === k)!
    const row = { ...b.defaults, module: 'pm', owner: k === 'templates' ? undefined : me || null, ...values, user_id: accountId }
    if (k === 'templates') delete (row as any).owner
    const { data, error } = await supabase.from(b.table).insert(row).select().single()
    if (error) { alert(error.message); return null }
    setRows(r => ({ ...r, [k]: [data, ...r[k]] }))
    return data
  }, [accountId, me])

  const remove = useCallback(async (k: MkBoardKey, ids: string[]) => {
    const { error } = await supabase.from(tableOf(k)).delete().in('id', ids)
    if (error) { alert(error.message); return }
    setRows(r => ({ ...r, [k]: r[k].filter(x => !ids.includes(x.id)) }))
  }, [])

  const duplicate = useCallback(async (k: MkBoardKey, ids: string[]) => {
    const src = rows[k].filter(x => ids.includes(x.id))
    const copies = src.map(({ id, created_at, reply_token, sent_at, ...rest }) => {
      const c: any = { ...rest }
      if (k === 'emails') { c.status = 'Draft'; c.subject = `${rest.subject} (copy)` } else if (c.name) c.name = `${rest.name} (copy)`
      else if (c.caption) c.caption = `${rest.caption} (copy)`
      return c
    })
    const { data, error } = await supabase.from(tableOf(k)).insert(copies).select()
    if (error) { alert(error.message); return }
    setRows(r => ({ ...r, [k]: [...(data ?? []), ...r[k]] }))
  }, [rows])

  const sendEmail = useCallback(async (id: string) => {
    setSendingId(id)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/marketing-send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
      body: JSON.stringify({ email_id: id }),
    })
    const result = await res.json().catch(() => ({}))
    setSendingId(null)
    if (!res.ok) { alert(result.error || 'Could not send email'); return }
    if (result.skipped) { alert(result.message); return }
    const { data } = await supabase.from('marketing_emails').select('*').eq('id', id).single()
    if (data) setRows(r => ({ ...r, emails: r.emails.map(x => x.id === id ? data : x) }))
    await loadEmailExtras(rows.emails.map(e => e.id))
  }, [rows.emails, loadEmailExtras])

  const saveSendSettings = useCallback(async (s: typeof sendSettings) => {
    const { error } = await supabase.from('integrations').upsert({ user_id: accountId, ...s }, { onConflict: 'user_id' })
    if (error) { alert(error.message); return false }
    setSendSettings(s); return true
  }, [accountId])

  const stats = useMemo(() => {
    const m: Record<string, EmailStats> = {}
    for (const e of rows.emails) m[e.id] = { delivered: false, opened: 0, clicked: 0, bounced: false, replies: replies[e.id]?.length ?? 0 }
    for (const ev of events) {
      const s = m[ev.marketing_email_id]; if (!s) continue
      if (ev.type === 'delivered') s.delivered = true
      if (ev.type === 'opened') s.opened++
      if (ev.type === 'clicked') s.clicked++
      if (ev.type === 'bounced') s.bounced = true
    }
    return m
  }, [rows.emails, events, replies])

  return { loading, error, accountId, rows, replies, events, people, me, stats, sendSettings, sendingId, update, add, remove, duplicate, sendEmail, saveSendSettings, reload: load }
}
export type Mk = ReturnType<typeof useMarketing>
