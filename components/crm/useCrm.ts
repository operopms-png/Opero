'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase, getAccountId } from '@/lib/supabase'
import type { Board, Column, Group, Item, Person, FileRef, ColumnType } from '@/lib/crm-board'
import { GROUP_COLORS, newId } from '@/lib/crm-board'

export type Crm = ReturnType<typeof useCrm>

const byPos = (a: { position: number }, b: { position: number }) => a.position - b.position

export function useCrm() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [accountId, setAccountId] = useState('')
  const [me, setMe] = useState<{ id: string; email: string; name: string } | null>(null)
  const [boards, setBoards] = useState<Board[]>([])
  const [columns, setColumns] = useState<Column[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [updateCounts, setUpdateCounts] = useState<Record<string, number>>({})
  const itemsRef = useRef<Item[]>([])
  itemsRef.current = items

  const load = useCallback(async (acct: string) => {
    const [b, c, g] = await Promise.all([
      supabase.from('crm_boards').select('*').eq('user_id', acct).order('position'),
      supabase.from('crm_board_columns').select('*').eq('user_id', acct).order('position'),
      supabase.from('crm_board_groups').select('*').eq('user_id', acct).order('position'),
    ])
    // items can exceed the default 1000-row page — fetch in pages
    const all: Item[] = []
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from('crm_board_items').select('*').eq('user_id', acct).order('position').range(from, from + 999)
      if (error) throw error
      all.push(...((data ?? []) as Item[]))
      if (!data || data.length < 1000) break
    }
    if (b.error) throw b.error
    setBoards((b.data ?? []) as Board[])
    setColumns((c.data ?? []) as Column[])
    setGroups((g.data ?? []) as Group[])
    setItems(all)
    const { data: upd } = await supabase.from('crm_board_item_updates').select('item_id').eq('user_id', acct)
    const counts: Record<string, number> = {}
    for (const u of upd ?? []) counts[(u as any).item_id] = (counts[(u as any).item_id] ?? 0) + 1
    setUpdateCounts(counts)
  }, [])

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { window.location.href = '/login'; return }
        const acct = await getAccountId(user)
        setAccountId(acct)
        const { data: tm } = await supabase.from('team_members').select('id,name,email').eq('user_id', acct).order('name')
        const mine = (tm ?? []).find((t: any) => t.email === user.email)
        setMe({ id: user.id, email: user.email ?? '', name: mine?.name ?? (user.email ?? '').split('@')[0] })
        const owner: Person = { id: acct, name: acct === user.id ? ((user.email ?? '').split('@')[0] || 'Admin') : 'Admin', email: acct === user.id ? user.email ?? '' : '' }
        setPeople([owner, ...(tm ?? []).filter((t: any) => t.email !== owner.email).map((t: any) => ({ id: t.id, name: t.name || t.email, email: t.email }))])
        const { count } = await supabase.from('crm_boards').select('id', { count: 'exact', head: true }).eq('user_id', acct)
        if (!count) {
          const { error } = await supabase.rpc('crm_seed_default_boards', { p_user: acct })
          if (error) throw error
        }
        await load(acct)
      } catch (e: any) {
        setError(e?.message ?? 'Could not load the CRM')
      } finally {
        setLoading(false)
      }
    })()
  }, [load])

  const fail = (e: any) => { if (e) { console.error(e); alert(e.message ?? 'Something went wrong — please refresh.') } }

  // ---------- items ----------

  const setValue = useCallback(async (itemId: string, col: Column, value: any) => {
    const item = itemsRef.current.find(i => i.id === itemId)
    if (!item) return
    const clean = value === '' || value === undefined || (Array.isArray(value) && value.length === 0) ? null : value
    const nextValues = { ...item.values }
    if (clean === null) delete nextValues[col.id]; else nextValues[col.id] = clean
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, values: nextValues, updated_at: new Date().toISOString() } : i))
    const { error } = await supabase.rpc('crm_item_set_value', { p_item: itemId, p_key: col.id, p_value: clean })
    fail(error)

    // Two-way connected boards: mirror the change onto the paired column
    const pair = col.type === 'link' ? col.settings?.pair_column_id : null
    if (pair) {
      const before: string[] = Array.isArray(item.values?.[col.id]) ? item.values[col.id] : []
      const after: string[] = Array.isArray(clean) ? clean : []
      const added = after.filter(x => !before.includes(x))
      const removed = before.filter(x => !after.includes(x))
      for (const tid of [...added, ...removed]) {
        const target = itemsRef.current.find(i => i.id === tid)
        if (!target) continue
        const cur: string[] = Array.isArray(target.values?.[pair]) ? target.values[pair] : []
        const nxt = added.includes(tid) ? Array.from(new Set([...cur, itemId])) : cur.filter(x => x !== itemId)
        const tv = { ...target.values }
        if (nxt.length) tv[pair] = nxt; else delete tv[pair]
        setItems(prev => prev.map(i => i.id === tid ? { ...i, values: tv } : i))
        const { error: e2 } = await supabase.rpc('crm_item_set_value', { p_item: tid, p_key: pair, p_value: nxt.length ? nxt : null })
        fail(e2)
      }
    }
  }, [])

  const updateItem = useCallback(async (itemId: string, patch: Partial<Pick<Item, 'name' | 'group_id' | 'position'>>) => {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, ...patch } : i))
    const { error } = await supabase.from('crm_board_items').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', itemId)
    fail(error)
  }, [])

  const addItem = useCallback(async (boardId: string, groupId: string | null, name: string, values: Record<string, any> = {}, atTop = false) => {
    const inGroup = itemsRef.current.filter(i => i.board_id === boardId && i.group_id === groupId)
    const position = inGroup.length ? (atTop ? Math.min(...inGroup.map(i => i.position)) - 1 : Math.max(...inGroup.map(i => i.position)) + 1) : 1
    const { data, error } = await supabase.from('crm_board_items').insert({ board_id: boardId, group_id: groupId, user_id: accountId, name, values, position }).select().single()
    if (error) { fail(error); return null }
    // the insert trigger may have linked a crm_contacts row — re-read it
    const { data: fresh } = await supabase.from('crm_board_items').select('*').eq('id', data.id).single()
    setItems(prev => [...prev, (fresh ?? data) as Item])
    return (fresh ?? data) as Item
  }, [accountId])

  const deleteItems = useCallback(async (ids: string[]) => {
    const doomed = itemsRef.current.filter(i => ids.includes(i.id))
    setItems(prev => prev.filter(i => !ids.includes(i.id)))
    const { error } = await supabase.from('crm_board_items').delete().in('id', ids)
    fail(error)
    const contactIds = doomed.map(i => i.crm_contact_id).filter(Boolean) as string[]
    const dealIds = doomed.map(i => i.crm_deal_id).filter(Boolean) as string[]
    if (contactIds.length) await supabase.from('crm_contacts').delete().in('id', contactIds)
    if (dealIds.length) await supabase.from('crm_deals').delete().in('id', dealIds)
  }, [])

  const duplicateItems = useCallback(async (ids: string[]) => {
    const src = itemsRef.current.filter(i => ids.includes(i.id))
    const rows = src.map(i => ({ board_id: i.board_id, group_id: i.group_id, user_id: i.user_id, name: i.name + ' (copy)', values: i.values, position: i.position + 0.5 }))
    const { data, error } = await supabase.from('crm_board_items').insert(rows).select()
    if (error) { fail(error); return }
    setItems(prev => [...prev, ...((data ?? []) as Item[])])
  }, [])

  const moveItems = useCallback(async (ids: string[], groupId: string) => {
    const inGroup = itemsRef.current.filter(i => i.group_id === groupId)
    let pos = inGroup.length ? Math.max(...inGroup.map(i => i.position)) + 1 : 1
    for (const id of ids) { await updateItem(id, { group_id: groupId, position: pos++ }) }
  }, [updateItem])

  // ---------- groups ----------

  const addGroup = useCallback(async (boardId: string, title = 'New group') => {
    const bg = groups.filter(g => g.board_id === boardId)
    const position = bg.length ? Math.min(...bg.map(g => g.position)) - 1 : 1
    const color = GROUP_COLORS[bg.length % GROUP_COLORS.length]
    const { data, error } = await supabase.from('crm_board_groups').insert({ board_id: boardId, user_id: accountId, title, color, position }).select().single()
    if (error) { fail(error); return null }
    setGroups(prev => [...prev, data as Group])
    return data as Group
  }, [groups, accountId])

  const updateGroup = useCallback(async (id: string, patch: Partial<Group>) => {
    setGroups(prev => prev.map(g => g.id === id ? { ...g, ...patch } : g))
    const { error } = await supabase.from('crm_board_groups').update(patch).eq('id', id)
    fail(error)
  }, [])

  const deleteGroup = useCallback(async (id: string) => {
    const ids = itemsRef.current.filter(i => i.group_id === id).map(i => i.id)
    if (ids.length) await deleteItems(ids)
    setGroups(prev => prev.filter(g => g.id !== id))
    const { error } = await supabase.from('crm_board_groups').delete().eq('id', id)
    fail(error)
  }, [deleteItems])

  // ---------- columns ----------

  const addColumn = useCallback(async (boardId: string, type: ColumnType, title: string, settings: any = {}, afterPosition?: number) => {
    const bc = columns.filter(c => c.board_id === boardId)
    const position = afterPosition !== undefined ? afterPosition + 0.5 : (bc.length ? Math.max(...bc.map(c => c.position)) + 1 : 1)
    if (type === 'status' && !settings.labels) {
      settings = { ...settings, labels: [
        { id: newId(), label: 'Done', color: '#00C875' },
        { id: newId(), label: 'Working on it', color: '#FDAB3D' },
        { id: newId(), label: 'Stuck', color: '#DF2F4A' },
      ] }
    }
    const width = type === 'text' ? 200 : type === 'location' ? 200 : type === 'checkbox' ? 90 : 140
    const end = bc.length ? Math.max(...bc.map(c => c.position)) + 1 : 1
    const { data, error } = await supabase.from('crm_board_columns').insert({ board_id: boardId, user_id: accountId, title, type, settings, position: end, width }).select().single()
    if (error) { fail(error); return null }
    let col = data as Column
    // slot it in where it was asked for, then renumber so positions stay whole numbers
    const ordered = [...bc, { ...col, position }].sort(byPos)
    for (let i = 0; i < ordered.length; i++) {
      if (ordered[i].position !== i + 1) {
        ordered[i] = { ...ordered[i], position: i + 1 }
        await supabase.from('crm_board_columns').update({ position: i + 1 }).eq('id', ordered[i].id)
      }
    }
    col = ordered.find(c => c.id === col.id)!
    // two-way connect: create the paired column on the other board
    if (type === 'link' && settings.board_id && settings.two_way) {
      const other = boards.find(b => b.id === settings.board_id)
      const here = boards.find(b => b.id === boardId)
      if (other && here && other.id !== here.id) {
        const oc = columns.filter(c => c.board_id === other.id)
        const { data: pairCol } = await supabase.from('crm_board_columns').insert({
          board_id: other.id, user_id: accountId, title: here.name, type: 'link',
          settings: { board_id: boardId, pair_column_id: col.id }, position: oc.length ? Math.max(...oc.map(c => c.position)) + 1 : 1, width: 140,
        }).select().single()
        if (pairCol) {
          const s = { board_id: settings.board_id, pair_column_id: (pairCol as Column).id }
          await supabase.from('crm_board_columns').update({ settings: s }).eq('id', col.id)
          col = { ...col, settings: s }
          ordered.push(pairCol as Column)
        }
      }
    }
    setColumns(prev => [...prev.filter(c => !ordered.some(o => o.id === c.id)), ...ordered.map(o => o.id === col.id ? col : o)])
    return col
  }, [columns, boards, accountId])

  const updateColumn = useCallback(async (id: string, patch: Partial<Column>) => {
    setColumns(prev => prev.map(c => c.id === id ? { ...c, ...patch, settings: patch.settings ?? c.settings } : c))
    const { error } = await supabase.from('crm_board_columns').update(patch).eq('id', id)
    fail(error)
  }, [])

  const deleteColumn = useCallback(async (id: string) => {
    const col = columns.find(c => c.id === id)
    setColumns(prev => prev.filter(c => c.id !== id).map(c => c.settings?.pair_column_id === id ? { ...c, settings: { ...c.settings, pair_column_id: null } } : c))
    const { error } = await supabase.from('crm_board_columns').delete().eq('id', id)
    fail(error)
    const paired = columns.find(c => c.settings?.pair_column_id === id)
    if (paired) await supabase.from('crm_board_columns').update({ settings: { ...paired.settings, pair_column_id: null } }).eq('id', paired.id)
    // strip the column's values from the board's items
    if (col) {
      const affected = itemsRef.current.filter(i => i.board_id === col.board_id && i.values?.[id] !== undefined)
      setItems(prev => prev.map(i => i.values?.[id] !== undefined ? { ...i, values: Object.fromEntries(Object.entries(i.values).filter(([k]) => k !== id)) } : i))
      for (const i of affected) await supabase.rpc('crm_item_set_value', { p_item: i.id, p_key: id, p_value: null })
    }
  }, [columns])

  const moveColumn = useCallback(async (id: string, dir: -1 | 1) => {
    const col = columns.find(c => c.id === id)
    if (!col) return
    const bc = columns.filter(c => c.board_id === col.board_id).sort(byPos)
    const idx = bc.findIndex(c => c.id === id)
    const swap = bc[idx + dir]
    if (!swap) return
    await updateColumn(col.id, { position: swap.position })
    await updateColumn(swap.id, { position: col.position })
  }, [columns, updateColumn])

  // ---------- boards ----------

  const addBoard = useCallback(async (name: string, copyFrom?: string) => {
    const position = boards.length ? Math.max(...boards.map(b => b.position)) + 1 : 1
    const src = boards.find(b => b.id === copyFrom)
    const { data, error } = await supabase.from('crm_boards').insert({ user_id: accountId, name, kind: 'custom', item_label: src?.item_label ?? 'item', position }).select().single()
    if (error) { fail(error); return null }
    const board = data as Board
    const srcCols = columns.filter(c => c.board_id === copyFrom).sort(byPos)
    const newCols: Column[] = []
    if (srcCols.length) {
      const { data: cs } = await supabase.from('crm_board_columns').insert(srcCols.map(c => ({
        board_id: board.id, user_id: accountId, title: c.title, type: c.type, position: c.position, width: c.width,
        settings: c.type === 'link' ? { board_id: c.settings?.board_id } : c.settings, key: null,
      }))).select()
      newCols.push(...((cs ?? []) as Column[]))
    } else {
      const defaults: [ColumnType, string, any][] = [['person', 'Owner', {}], ['status', 'Status', { labels: [
        { id: newId(), label: 'Working on it', color: '#FDAB3D' }, { id: newId(), label: 'Done', color: '#00C875' }, { id: newId(), label: 'Stuck', color: '#DF2F4A' }] }], ['date', 'Date', {}], ['text', 'Notes', {}]]
      const { data: cs } = await supabase.from('crm_board_columns').insert(defaults.map(([type, title, settings], i) => ({ board_id: board.id, user_id: accountId, title, type, settings, position: i + 1, width: type === 'text' ? 220 : 140 }))).select()
      newCols.push(...((cs ?? []) as Column[]))
    }
    const { data: g } = await supabase.from('crm_board_groups').insert([
      { board_id: board.id, user_id: accountId, title: 'Group title', color: '#579BFC', position: 1 },
    ]).select()
    setBoards(prev => [...prev, board])
    setColumns(prev => [...prev, ...newCols])
    setGroups(prev => [...prev, ...((g ?? []) as Group[])])
    return board
  }, [boards, columns, accountId])

  const updateBoard = useCallback(async (id: string, patch: Partial<Board>) => {
    setBoards(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b))
    const { error } = await supabase.from('crm_boards').update(patch).eq('id', id)
    fail(error)
  }, [])

  const deleteBoard = useCallback(async (id: string) => {
    setBoards(prev => prev.filter(b => b.id !== id))
    setColumns(prev => prev.filter(c => c.board_id !== id))
    setGroups(prev => prev.filter(g => g.board_id !== id))
    setItems(prev => prev.filter(i => i.board_id !== id))
    const { error } = await supabase.from('crm_boards').delete().eq('id', id)
    fail(error)
  }, [])

  // ---------- files, updates, geocoding ----------

  const uploadFile = useCallback(async (file: File): Promise<FileRef | null> => {
    const safe = file.name.replace(/[^\w.\-]+/g, '_')
    const path = `${accountId}/${Date.now()}-${safe}`
    const { error } = await supabase.storage.from('crm-files').upload(path, file, { contentType: file.type, upsert: false })
    if (error) { fail(error); return null }
    const { data } = supabase.storage.from('crm-files').getPublicUrl(path)
    return { name: file.name, url: data.publicUrl, path, type: file.type }
  }, [accountId])

  const loadUpdates = useCallback(async (itemId: string) => {
    const { data } = await supabase.from('crm_board_item_updates').select('*').eq('item_id', itemId).order('created_at', { ascending: false })
    return data ?? []
  }, [])

  const addUpdate = useCallback(async (itemId: string, body: string) => {
    const { data, error } = await supabase.from('crm_board_item_updates').insert({ item_id: itemId, user_id: accountId, author: me?.name ?? me?.email ?? 'Staff', body }).select().single()
    if (error) { fail(error); return null }
    setUpdateCounts(prev => ({ ...prev, [itemId]: (prev[itemId] ?? 0) + 1 }))
    return data
  }, [accountId, me])

  const deleteUpdate = useCallback(async (itemId: string, updateId: string) => {
    await supabase.from('crm_board_item_updates').delete().eq('id', updateId)
    setUpdateCounts(prev => ({ ...prev, [itemId]: Math.max(0, (prev[itemId] ?? 1) - 1) }))
  }, [])

  // Returns coordinates, null when the address can't be found, or undefined when the lookup itself failed
  const geocode = useCallback(async (address: string): Promise<{ lat: number; lng: number } | null | undefined> => {
    const a = address.trim()
    // too vague to place reliably (e.g. "B206") — don't guess
    if (a.length < 8 || !/[a-z]{3,}.*[\s,].*[a-z]{2,}/i.test(a)) return null
    try {
      // Portfolio map is Jamaica only
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=jm&accept-language=en&q=${encodeURIComponent(a)}`)
      if (!r.ok) return undefined
      const j = await r.json()
      if (Array.isArray(j) && j[0]) return { lat: Number(j[0].lat), lng: Number(j[0].lon) }
      return null
    } catch { return undefined }
  }, [])

  const itemsById = useMemo(() => new Map(items.map(i => [i.id, i])), [items])

  return {
    loading, error, accountId, me, boards: [...boards].sort(byPos), columns, groups, items, itemsById, people, updateCounts,
    reload: () => load(accountId),
    setValue, updateItem, addItem, deleteItems, duplicateItems, moveItems,
    addGroup, updateGroup, deleteGroup,
    addColumn, updateColumn, deleteColumn, moveColumn,
    addBoard, updateBoard, deleteBoard,
    uploadFile, loadUpdates, addUpdate, deleteUpdate, geocode,
  }
}
