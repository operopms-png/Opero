'use client'
import { Fragment, useEffect, useState } from 'react'
import { supabase, getAccountId } from '../../../lib/supabase'
import { C, CrmPage, CrmHeader, Avatar, Loading, btn } from '../../../components/crm/Page'

const HEAD_H = 62
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7) // 7am - 8pm
const STATUS_COLORS: Record<string, string> = { Working: '#00C875', Leave: '#FDAB3D', Off: '#C4C4C4' }

const AVATAR_COLORS = ['#D0AE4C', '#579BFC', '#00C875', '#9D50DD', '#FDAB3D', '#DF2F4A', '#66CCFF', '#784BD1']
function avatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export default function CalendarPage() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [accountId, setAccountId] = useState<string>('')
  const [team, setTeam] = useState<any[]>([])
  const [shifts, setShifts] = useState<any[]>([])
  const [visibleStaff, setVisibleStaff] = useState<string[]>([])
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date()
    const day = d.getDay()
    d.setDate(d.getDate() - day + (day === 0 ? -6 : 1))
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [editingCell, setEditingCell] = useState<{ staffId: string; date: string } | null>(null)

  useEffect(() => { init() }, [])
  useEffect(() => { if (accountId) loadShifts() }, [accountId, weekStart])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    setUser(user)
    const acctId = await getAccountId(user)
    setAccountId(acctId)
    const { data: teamData } = await supabase.from('team_members').select('*').eq('user_id', acctId).order('name')
    setTeam(teamData ?? [])
    setVisibleStaff((teamData ?? []).map((m: any) => m.id))
    setLoading(false)
  }

  async function loadShifts() {
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6)
    const fmt = (d: Date) => d.toISOString().slice(0, 10)
    const { data } = await supabase.from('staff_shifts').select('*').eq('user_id', accountId).gte('date', fmt(weekStart)).lte('date', fmt(weekEnd))
    setShifts(data ?? [])
  }

  async function setShift(staffId: string, date: string, type: string, startTime?: string, endTime?: string) {
    const { error } = await supabase.from('staff_shifts').upsert(
      { user_id: accountId, staff_id: staffId, date, type, start_time: startTime || null, end_time: endTime || null },
      { onConflict: 'staff_id,date' }
    )
    if (error) { alert(error.message); return }
    setEditingCell(null)
    await loadShifts()
  }

  if (loading) return <Loading />

  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(d.getDate() + i); return d })
  const shownStaff = team.filter((m: any) => visibleStaff.includes(m.id))
  const today = new Date(); today.setHours(0, 0, 0, 0)

  function timeToRow(t: string | null, fallback: number) {
    if (!t) return fallback
    const [h, m] = t.split(':').map(Number)
    return h + (m || 0) / 60
  }

  return (
    <CrmPage fill>
      <CrmHeader title="Calendar" subtitle="Who's working, on leave or off this week. Click a block to edit it, or set a shift from the panel on the right." />
      <div style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 8, background: '#fff', borderBottom: '1px solid ' + C.row, flexShrink: 0, flexWrap: 'wrap' }}>
        <button onClick={() => { const d = new Date(); const day = d.getDay(); d.setDate(d.getDate() - day + (day === 0 ? -6 : 1)); d.setHours(0, 0, 0, 0); setWeekStart(d) }} style={btn('ghost', true)}>Today</button>
        <button onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d) }} style={{ ...btn('ghost', true), width: 30, height: 30, padding: 0, justifyContent: 'center' }}>‹</button>
        <button onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d) }} style={{ ...btn('ghost', true), width: 30, height: 30, padding: 0, justifyContent: 'center' }}>›</button>
        <div style={{ fontSize: 15, fontWeight: 600, color: C.ink, marginLeft: 6 }}>
          {days[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – {days[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 13, color: C.muted }}>
          {Object.entries(STATUS_COLORS).map(([k, c]) => <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: c }} />{k}</span>)}
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {team.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#98A2B3', flexDirection: 'column' as const, gap: 8 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: C.ink }}>No team members yet</div>
            <div style={{ fontSize: 13 }}>Add staff in Team Management first, then schedule their shifts here.</div>
          </div>
        ) : (
          <>
            <div style={{ flex: 1, overflow: 'auto' as const, position: 'relative' as const }}>
              <div style={{ display: 'grid', gridTemplateColumns: '56px repeat(7, 1fr)', minWidth: 900 }}>
                <div style={{ position: 'sticky' as const, top: 0, background: '#fff', zIndex: 2, borderBottom: '1px solid ' + C.row, height: HEAD_H, boxSizing: 'border-box' as const }} />
                {days.map((d, i) => {
                  const isToday = d.getTime() === today.getTime()
                  return (
                    <div key={i} style={{ position: 'sticky' as const, top: 0, background: '#fff', zIndex: 2, borderBottom: '1px solid ' + C.row, borderLeft: '1px solid ' + C.row, padding: '8px 8px', textAlign: 'center' as const, height: HEAD_H, boxSizing: 'border-box' as const }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: isToday ? C.goldDark : C.muted }}>{d.toLocaleDateString('en-GB', { weekday: 'short' })}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: isToday ? '#fff' : C.ink, background: isToday ? C.goldDark : 'transparent', borderRadius: '50%', width: 30, height: 30, lineHeight: '30px', margin: '2px auto 0' }}>{d.getDate()}</div>
                    </div>
                  )
                })}

                {HOURS.map(h => (
                  <Fragment key={h}>
                    <div key={'h' + h} style={{ fontSize: 11, color: C.faint, textAlign: 'right' as const, paddingRight: 8, paddingTop: 2, borderTop: '1px solid ' + C.row, height: 56 }}>
                      {h % 12 === 0 ? 12 : h % 12}{h < 12 ? 'AM' : 'PM'}
                    </div>
                    {days.map((d, di) => (
                      <div key={h + '-' + di} style={{ borderTop: '1px solid ' + C.row, borderLeft: '1px solid ' + C.row, height: 56, position: 'relative' as const }} />
                    ))}
                  </Fragment>
                ))}
              </div>

              <div style={{ position: 'absolute' as const, top: HEAD_H, left: 56, right: 0, bottom: 0, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', pointerEvents: 'none' as const }}>
                {days.map((d, di) => {
                  const dateStr = d.toISOString().slice(0, 10)
                  const dayShifts = shifts.filter((s: any) => s.date === dateStr && visibleStaff.includes(s.staff_id) && s.type !== 'Off')
                  return (
                    <div key={di} style={{ position: 'relative' as const }}>
                      {dayShifts.map((s: any, si: number) => {
                        const startH = timeToRow(s.start_time, HOURS[0])
                        const endH = timeToRow(s.end_time, HOURS[0] + 8)
                        const top = Math.max(0, (startH - HOURS[0]) * 56)
                        const height = Math.max(28, (endH - startH) * 56)
                        const staff = team.find((m: any) => m.id === s.staff_id)
                        const c = STATUS_COLORS[s.type] ?? STATUS_COLORS.Off
                        return (
                          <div key={s.id ?? si} onClick={() => setEditingCell({ staffId: s.staff_id, date: dateStr })} style={{ position: 'absolute' as const, top, height, left: si * 4, right: 4, background: c, borderRadius: 4, padding: '5px 7px', fontSize: 12, color: '#fff', fontWeight: 500, boxShadow: '0 1px 2px rgba(0,0,0,0.12)', overflow: 'hidden', pointerEvents: 'auto' as const, cursor: 'pointer' }}>
                            {staff?.name ?? '—'}
                            {s.type === 'Leave' && <div style={{ fontWeight: 400, fontSize: 11, opacity: 0.9 }}>On leave</div>}
                            {s.start_time && <div style={{ fontWeight: 400, fontSize: 11, opacity: 0.9 }}>{s.start_time.slice(0, 5)}–{s.end_time?.slice(0, 5)}</div>}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>

            <div style={{ width: 270, borderLeft: '1px solid ' + C.row, background: '#fff', padding: 20, overflowY: 'auto' as const, flexShrink: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: C.ink, marginBottom: 14 }}>Manage view</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: C.muted, marginBottom: 8 }}>Staff</div>
              {team.map((m: any) => (
                <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" style={{ accentColor: C.goldDark }} checked={visibleStaff.includes(m.id)} onChange={e => setVisibleStaff(prev => e.target.checked ? [...prev, m.id] : prev.filter(id => id !== m.id))} />
                  <Avatar name={m.name} color={avatarColor(m.name)} size={24} />
                  <span style={{ color: C.ink, fontSize: 14 }}>{m.name}</span>
                </label>
              ))}

              <div style={{ height: 1, background: C.row, margin: '16px 0' }} />
              <div style={{ fontSize: 13, fontWeight: 500, color: C.muted, marginBottom: 8 }}>Set a shift</div>
              <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 10, lineHeight: 1.45 }}>Click a staff member's block on the calendar to edit it, or pick a day below.</div>
              {shownStaff.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                  <select id="cal-staff-picker" style={{ padding: '7px 10px', border: '1px solid ' + C.border, borderRadius: 4, fontSize: 13, fontFamily: 'inherit', color: C.ink, background: '#fff' }}>
                    {shownStaff.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  <select id="cal-day-picker" style={{ padding: '7px 10px', border: '1px solid ' + C.border, borderRadius: 4, fontSize: 13, fontFamily: 'inherit', color: C.ink, background: '#fff' }}>
                    {days.map((d, i) => <option key={i} value={d.toISOString().slice(0, 10)}>{d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</option>)}
                  </select>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['Working', 'Leave', 'Off'].map(type => (
                      <button key={type} onClick={() => {
                        const staffId = (document.getElementById('cal-staff-picker') as HTMLSelectElement).value
                        const date = (document.getElementById('cal-day-picker') as HTMLSelectElement).value
                        if (type === 'Working') setShift(staffId, date, 'Working', '09:00', '17:00')
                        else setShift(staffId, date, type)
                      }} style={{ flex: 1, padding: '7px 0', borderRadius: 4, border: 'none', background: STATUS_COLORS[type], color: '#fff', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>{type}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </CrmPage>
  )
}
