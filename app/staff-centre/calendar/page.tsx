'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

const ACCENT = '#3B4AFF'
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7) // 7am - 8pm
const STATUS_COLORS: Record<string, { bg: string; fg: string; border: string }> = {
  Working: { bg: '#ECFDF5', fg: '#10B981', border: '#A7F3D0' },
  Leave: { bg: '#FFFBEB', fg: '#F59E0B', border: '#FDE68A' },
  Off: { bg: '#F2F4F7', fg: '#98A2B3', border: '#E4E7EC' },
}

function initials(name: string) {
  return (name || '?').split(' ').filter(Boolean).slice(0, 2).map((w: string) => w[0]?.toUpperCase()).join('')
}

const AVATAR_COLORS = ['#3B4AFF', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#2D6A4F', '#DC2626', '#0891B2']
function avatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export default function CalendarPage() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
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
  useEffect(() => { if (user) loadShifts() }, [user, weekStart])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    setUser(user)
    const { data: teamData } = await supabase.from('team_members').select('*').eq('user_id', user.id).order('name')
    setTeam(teamData ?? [])
    setVisibleStaff((teamData ?? []).map((m: any) => m.id))
    setLoading(false)
  }

  async function loadShifts() {
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6)
    const fmt = (d: Date) => d.toISOString().slice(0, 10)
    const { data } = await supabase.from('staff_shifts').select('*').eq('user_id', user.id).gte('date', fmt(weekStart)).lte('date', fmt(weekEnd))
    setShifts(data ?? [])
  }

  async function setShift(staffId: string, date: string, type: string, startTime?: string, endTime?: string) {
    const { error } = await supabase.from('staff_shifts').upsert(
      { user_id: user.id, staff_id: staffId, date, type, start_time: startTime || null, end_time: endTime || null },
      { onConflict: 'staff_id,date' }
    )
    if (error) { alert(error.message); return }
    setEditingCell(null)
    await loadShifts()
  }

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#98A2B3' }}>Loading...</div>

  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(d.getDate() + i); return d })
  const shownStaff = team.filter((m: any) => visibleStaff.includes(m.id))
  const today = new Date(); today.setHours(0, 0, 0, 0)

  function timeToRow(t: string | null, fallback: number) {
    if (!t) return fallback
    const [h, m] = t.split(':').map(Number)
    return h + (m || 0) / 60
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F7F8FA', fontFamily: "'Inter',sans-serif" }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #E4E7EC', padding: '0 28px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#98A2B3', textTransform: 'uppercase', letterSpacing: '0.06em' }}>STAFF CENTRE</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#101828' }}>Calendar</div>
        </div>
      </div>

      <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 10, background: '#fff', borderBottom: '1px solid #E4E7EC' }}>
        <button onClick={() => { const d = new Date(); const day = d.getDay(); d.setDate(d.getDate() - day + (day === 0 ? -6 : 1)); d.setHours(0, 0, 0, 0); setWeekStart(d) }} style={{ background: '#fff', border: '1px solid #D0D5DD', borderRadius: 8, padding: '7px 14px', fontSize: 12.5, fontWeight: 600, color: '#344054', cursor: 'pointer', fontFamily: 'inherit' }}>Today</button>
        <button onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d) }} style={{ background: '#fff', border: '1px solid #D0D5DD', borderRadius: 8, width: 30, height: 30, fontSize: 13, color: '#344054', cursor: 'pointer' }}>←</button>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: '#101828', minWidth: 170 }}>
          {days[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – {days[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
        <button onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d) }} style={{ background: '#fff', border: '1px solid #D0D5DD', borderRadius: 8, width: 30, height: 30, fontSize: 13, color: '#344054', cursor: 'pointer' }}>→</button>
        <div style={{ padding: '7px 14px', border: '1px solid #D0D5DD', borderRadius: 8, fontSize: 12.5, fontWeight: 600, color: '#344054' }}>Week view</div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, color: '#667085' }}>
          <span><span style={{ width: 9, height: 9, borderRadius: 2, background: '#10B981', display: 'inline-block', marginRight: 5 }} />Working</span>
          <span><span style={{ width: 9, height: 9, borderRadius: 2, background: '#F59E0B', display: 'inline-block', marginRight: 5 }} />Leave</span>
          <span><span style={{ width: 9, height: 9, borderRadius: 2, background: '#D0D5DD', display: 'inline-block', marginRight: 5 }} />Off</span>
        </div>
      </div>

      <div style={{ display: 'flex', height: 'calc(100vh - 113px)' }}>
        {team.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#98A2B3', flexDirection: 'column' as const, gap: 8 }}>
            <div style={{ fontSize: 32 }}>📅</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#101828' }}>No team members yet</div>
            <div style={{ fontSize: 13 }}>Add staff in Team Management first, then schedule their shifts here.</div>
          </div>
        ) : (
          <>
            <div style={{ flex: 1, overflow: 'auto' as const, position: 'relative' as const }}>
              <div style={{ display: 'grid', gridTemplateColumns: '56px repeat(7, 1fr)', minWidth: 900 }}>
                <div style={{ position: 'sticky' as const, top: 0, background: '#fff', zIndex: 2, borderBottom: '1px solid #E4E7EC' }} />
                {days.map((d, i) => {
                  const isToday = d.getTime() === today.getTime()
                  return (
                    <div key={i} style={{ position: 'sticky' as const, top: 0, background: '#fff', zIndex: 2, borderBottom: '1px solid #E4E7EC', borderLeft: '1px solid #F2F4F7', padding: '10px 8px', textAlign: 'center' as const }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#98A2B3', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>{d.toLocaleDateString('en-GB', { weekday: 'short' })}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: isToday ? ACCENT : '#101828', marginTop: 2 }}>{d.getDate()}</div>
                    </div>
                  )
                })}

                {HOURS.map(h => (
                  <>
                    <div key={'h' + h} style={{ fontSize: 11, color: '#98A2B3', textAlign: 'right' as const, paddingRight: 8, paddingTop: 2, borderTop: '1px solid #F2F4F7', height: 56 }}>
                      {h % 12 === 0 ? 12 : h % 12}{h < 12 ? 'AM' : 'PM'}
                    </div>
                    {days.map((d, di) => (
                      <div key={h + '-' + di} style={{ borderTop: '1px solid #F2F4F7', borderLeft: '1px solid #F2F4F7', height: 56, position: 'relative' as const }} />
                    ))}
                  </>
                ))}
              </div>

              <div style={{ position: 'absolute' as const, top: 41, left: 56, right: 0, bottom: 0, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', pointerEvents: 'none' as const }}>
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
                          <div key={s.id ?? si} onClick={() => setEditingCell({ staffId: s.staff_id, date: dateStr })} style={{ position: 'absolute' as const, top, height, left: si * 4, right: 4, background: c.bg, border: '1px solid ' + c.border, borderRadius: 6, padding: '4px 6px', fontSize: 10.5, color: c.fg, fontWeight: 600, overflow: 'hidden', pointerEvents: 'auto' as const, cursor: 'pointer' }}>
                            {staff?.name ?? '—'}
                            {s.start_time && <div style={{ fontWeight: 400, fontSize: 9.5 }}>{s.start_time.slice(0, 5)}–{s.end_time?.slice(0, 5)}</div>}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>

            <div style={{ width: 260, borderLeft: '1px solid #E4E7EC', background: '#fff', padding: 20, overflowY: 'auto' as const }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#101828', marginBottom: 14 }}>Manage view</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#98A2B3', textTransform: 'uppercase' as const, marginBottom: 8 }}>Staff</div>
              {team.map((m: any) => (
                <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={visibleStaff.includes(m.id)} onChange={e => setVisibleStaff(prev => e.target.checked ? [...prev, m.id] : prev.filter(id => id !== m.id))} />
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: avatarColor(m.name), color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{initials(m.name)}</div>
                  <span style={{ color: '#344054' }}>{m.name}</span>
                </label>
              ))}

              <div style={{ height: 1, background: '#F2F4F7', margin: '16px 0' }} />
              <div style={{ fontSize: 11, fontWeight: 700, color: '#98A2B3', textTransform: 'uppercase' as const, marginBottom: 8 }}>Set a shift</div>
              <div style={{ fontSize: 12, color: '#667085', marginBottom: 10 }}>Click a staff member's block on the calendar to edit it, or pick a day below.</div>
              {shownStaff.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                  <select id="cal-staff-picker" style={{ padding: '7px 10px', border: '1px solid #D0D5DD', borderRadius: 8, fontSize: 12.5, fontFamily: 'inherit' }}>
                    {shownStaff.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  <select id="cal-day-picker" style={{ padding: '7px 10px', border: '1px solid #D0D5DD', borderRadius: 8, fontSize: 12.5, fontFamily: 'inherit' }}>
                    {days.map((d, i) => <option key={i} value={d.toISOString().slice(0, 10)}>{d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</option>)}
                  </select>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['Working', 'Leave', 'Off'].map(type => (
                      <button key={type} onClick={() => {
                        const staffId = (document.getElementById('cal-staff-picker') as HTMLSelectElement).value
                        const date = (document.getElementById('cal-day-picker') as HTMLSelectElement).value
                        if (type === 'Working') setShift(staffId, date, 'Working', '09:00', '17:00')
                        else setShift(staffId, date, type)
                      }} style={{ flex: 1, padding: '7px 0', borderRadius: 6, border: 'none', background: STATUS_COLORS[type].bg, color: STATUS_COLORS[type].fg, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{type}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
