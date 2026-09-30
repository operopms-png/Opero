'use client'
import { useCallback, useEffect, useState } from 'react'
import { supabase, getAccountId } from '@/lib/supabase'
import { APPLICATIONS_BOARD, type BoardStore, type MkBoard } from '@/lib/marketing-boards'

// Generic data store for one CRM-style board backed by a single table.
export function useTableBoard(B: MkBoard, opts: { order?: string; normalize?: (r: any) => any; ownerField?: string } = {}): BoardStore & { loading: boolean; error: string | null; me: string } {
  const norm = opts.normalize ?? ((r: any) => r)
  const ownerField = opts.ownerField ?? 'owner'
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accountId, setAccountId] = useState('')
  const [rows, setRows] = useState<Record<string, any[]>>({ [B.key]: [] })
  const [team, setTeam] = useState<string[]>([])
  const [me, setMe] = useState('')

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const acc = await getAccountId(user)
      setAccountId(acc)
      const [{ data, error }, { data: tm }] = await Promise.all([
        supabase.from(B.table).select('*').eq('user_id', acc).order(opts.order ?? 'created_at', { ascending: false }),
        supabase.from('team_members').select('name,email').eq('user_id', acc),
      ])
      if (error) { setError(error.message); setLoading(false); return }
      setRows({ [B.key]: (data ?? []).map(norm) })
      const myName = (tm ?? []).find((t: any) => t.email === user.email)?.name || (user.email ?? '').split('@')[0]
      setMe(myName)
      setTeam([myName, ...(tm ?? []).filter((t: any) => t.name?.trim() && t.email?.includes('@')).map((t: any) => t.name.trim())])
      setLoading(false)
    })()
  }, [B.key]) // eslint-disable-line react-hooks/exhaustive-deps

  const list = rows[B.key] ?? []
  // people = team + anyone already named on the board (e.g. older wins)
  const people = [...new Set<string>([...team, ...list.map(r => r[ownerField]).filter((x: any) => typeof x === 'string' && x.trim() && x !== 'Unassigned')])].filter(Boolean)

  const update = useCallback(async (_k: string, id: string, patch: Record<string, any>) => {
    let prev: any[] = []
    setRows(r => { prev = r[B.key]; return { [B.key]: r[B.key].map(x => x.id === id ? { ...x, ...patch } : x) } })
    const { error } = await supabase.from(B.table).update(patch).eq('id', id)
    if (error) { alert(error.message); setRows({ [B.key]: prev }) }
  }, [B])

  const add = useCallback(async (_k: string, values: Record<string, any>) => {
    const { data, error } = await supabase.from(B.table).insert({ ...B.defaults, ...(me ? { [ownerField]: me } : {}), ...values, user_id: accountId }).select().single()
    if (error) { alert(error.message); return null }
    const row = norm(data)
    setRows(r => ({ [B.key]: [row, ...r[B.key]] }))
    return row
  }, [B, accountId, me, ownerField]) // eslint-disable-line react-hooks/exhaustive-deps

  const remove = useCallback(async (_k: string, ids: string[]) => {
    const { error } = await supabase.from(B.table).delete().in('id', ids)
    if (error) { alert(error.message); return }
    setRows(r => ({ [B.key]: r[B.key].filter(x => !ids.includes(x.id)) }))
  }, [B])

  const duplicate = useCallback(async (_k: string, ids: string[]) => {
    const copies = list.filter(x => ids.includes(x.id)).map(({ id, created_at, ...rest }) => ({ ...rest, ...('source_deal_id' in rest ? { source_deal_id: null, notes: null } : {}), [B.nameField]: `${rest[B.nameField]} (copy)` }))
    const { data, error } = await supabase.from(B.table).insert(copies).select()
    if (error) { alert(error.message); return }
    setRows(r => ({ [B.key]: [...(data ?? []).map(norm), ...r[B.key]] }))
  }, [B, list]) // eslint-disable-line react-hooks/exhaustive-deps

  return { loading, error, me, rows, replies: {}, events: [], people, stats: {}, sendingId: null, update, add, remove, duplicate, sendEmail: async () => {} }
}

export function useApplications() {
  return useTableBoard(APPLICATIONS_BOARD, { normalize: r => ({ ...r, module: r.module ?? '' }) })
}
