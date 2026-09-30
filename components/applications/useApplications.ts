'use client'
import { useCallback, useEffect, useState } from 'react'
import { supabase, getAccountId } from '@/lib/supabase'
import { APPLICATIONS_BOARD as B, type BoardStore } from '@/lib/marketing-boards'

export function useApplications(): BoardStore & { loading: boolean; error: string | null } {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accountId, setAccountId] = useState('')
  const [rows, setRows] = useState<Record<string, any[]>>({ applications: [] })
  const [people, setPeople] = useState<string[]>([])
  const [me, setMe] = useState('')

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const acc = await getAccountId(user)
      setAccountId(acc)
      const [{ data, error }, { data: team }] = await Promise.all([
        supabase.from(B.table).select('*').eq('user_id', acc).order('created_at', { ascending: false }),
        supabase.from('team_members').select('name,email').eq('user_id', acc),
      ])
      if (error) { setError(error.message); setLoading(false); return }
      setRows({ applications: (data ?? []).map(r => ({ ...r, module: r.module ?? '' })) })
      const myName = (team ?? []).find((t: any) => t.email === user.email)?.name || (user.email ?? '').split('@')[0]
      setMe(myName)
      setPeople([...new Set<string>([myName, ...(team ?? []).filter((t: any) => t.name?.trim() && t.email?.includes('@')).map((t: any) => t.name.trim())])].filter(Boolean))
      setLoading(false)
    })()
  }, [])

  const update = useCallback(async (_k: string, id: string, patch: Record<string, any>) => {
    let prev: any[] = []
    setRows(r => { prev = r.applications; return { applications: r.applications.map(x => x.id === id ? { ...x, ...patch } : x) } })
    const { error } = await supabase.from(B.table).update(patch).eq('id', id)
    if (error) { alert(error.message); setRows({ applications: prev }) }
  }, [])

  const add = useCallback(async (_k: string, values: Record<string, any>) => {
    const { data, error } = await supabase.from(B.table).insert({ ...B.defaults, owner: me || null, ...values, user_id: accountId }).select().single()
    if (error) { alert(error.message); return null }
    const row = { ...data, module: data.module ?? '' }
    setRows(r => ({ applications: [row, ...r.applications] }))
    return row
  }, [accountId, me])

  const remove = useCallback(async (_k: string, ids: string[]) => {
    const { error } = await supabase.from(B.table).delete().in('id', ids)
    if (error) { alert(error.message); return }
    setRows(r => ({ applications: r.applications.filter(x => !ids.includes(x.id)) }))
  }, [])

  const duplicate = useCallback(async (_k: string, ids: string[]) => {
    const copies = rows.applications.filter(x => ids.includes(x.id)).map(({ id, created_at, ...rest }) => ({ ...rest, candidate_name: `${rest.candidate_name} (copy)` }))
    const { data, error } = await supabase.from(B.table).insert(copies).select()
    if (error) { alert(error.message); return }
    setRows(r => ({ applications: [...(data ?? []), ...r.applications] }))
  }, [rows])

  return { loading, error, rows, replies: {}, events: [], people, stats: {}, sendingId: null, update, add, remove, duplicate, sendEmail: async () => {} }
}
