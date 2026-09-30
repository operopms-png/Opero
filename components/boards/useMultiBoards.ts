'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase, getAccountId } from '@/lib/supabase'
import type { BoardStore, MkBoard, MkOption } from '@/lib/marketing-boards'

// Data store for a workspace of CRM-style boards, one table per board.
export function useMultiBoards(boards: MkBoard[], opts: {
  refs?: (rows: Record<string, any[]>) => Record<string, MkOption[]>
  patch?: (boardKey: string, row: any, patch: Record<string, any>) => Record<string, any>
} = {}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accountId, setAccountId] = useState('')
  const [rows, setRows] = useState<Record<string, any[]>>(() => Object.fromEntries(boards.map(b => [b.key, []])))
  const [people, setPeople] = useState<string[]>([])
  const rowsRef = useRef(rows)
  rowsRef.current = rows
  const byKey = (k: string) => boards.find(b => b.key === k)!

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const acc = await getAccountId(user)
      setAccountId(acc)
      const res = await Promise.all(boards.map(b => supabase.from(b.table).select('*').eq('user_id', acc).order('created_at', { ascending: false })))
      const bad = res.find(r => r.error)
      if (bad?.error) { setError(bad.error.message); setLoading(false); return }
      setRows(Object.fromEntries(boards.map((b, i) => [b.key, res[i].data ?? []])))
      const { data: tm } = await supabase.from('team_members').select('name,email').eq('user_id', acc)
      setPeople([...new Set<string>((tm ?? []).filter((t: any) => t.name?.trim()).map((t: any) => t.name.trim()))])
      setLoading(false)
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const refs = useMemo(() => opts.refs?.(rows) ?? {}, [rows]) // eslint-disable-line react-hooks/exhaustive-deps

  const update = useCallback(async (k: string, id: string, patch: Record<string, any>) => {
    const prev = rowsRef.current[k]
    const row = prev.find(x => x.id === id)
    const full = opts.patch && row ? opts.patch(k, row, patch) : patch
    setRows(r => ({ ...r, [k]: r[k].map(x => x.id === id ? { ...x, ...full } : x) }))
    const { error } = await supabase.from(byKey(k).table).update(full).eq('id', id)
    if (error) { alert(error.message); setRows(r => ({ ...r, [k]: prev })) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const add = useCallback(async (k: string, values: Record<string, any>) => {
    const b = byKey(k)
    const { data, error } = await supabase.from(b.table).insert({ ...b.defaults, ...values, user_id: accountId }).select().single()
    if (error) { alert(error.message); return null }
    setRows(r => ({ ...r, [k]: [data, ...r[k]] }))
    return data
  }, [accountId]) // eslint-disable-line react-hooks/exhaustive-deps

  const remove = useCallback(async (k: string, ids: string[]) => {
    const { error } = await supabase.from(byKey(k).table).delete().in('id', ids)
    if (error) { alert(error.message); return }
    setRows(r => ({ ...r, [k]: r[k].filter(x => !ids.includes(x.id)) }))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const duplicate = useCallback(async (k: string, ids: string[]) => {
    const b = byKey(k)
    const copies = rows[k].filter(x => ids.includes(x.id)).map(({ id, created_at, ...rest }) => b.nameRef ? rest : { ...rest, [b.nameField]: `${rest[b.nameField]} (copy)` })
    const { data, error } = await supabase.from(b.table).insert(copies).select()
    if (error) { alert(error.message); return }
    setRows(r => ({ ...r, [k]: [...(data ?? []), ...r[k]] }))
  }, [rows]) // eslint-disable-line react-hooks/exhaustive-deps

  const store: BoardStore = { rows, replies: {}, events: [], people, stats: {}, sendingId: null, update, add, remove, duplicate, sendEmail: async () => {}, refs }
  return { ...store, loading, error }
}
