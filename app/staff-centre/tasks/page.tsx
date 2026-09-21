'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

const ACCENT = '#3B4AFF'

// Standalone Tasks page -- was previously only reachable via
// Settings > Tasks (buried inside the Settings shell, with the full
// Settings left-nav visible around it). Sidebar's "Tasks" entry now
// points straight here instead of /settings?section=Tasks, so it
// shows just the task board on its own, same pattern as every other
// Staff Centre page (Performance, Training, etc).
export default function TasksPage() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [team, setTeam] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [taskForm, setTaskForm] = useState({ title: '', assigned_to: '', status: 'On track', due_date: '', notes: '' })
  const [savingTask, setSavingTask] = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    setUser(user)
    const { data: teamData } = await supabase.from('team_members').select('*').eq('user_id', user.id).order('name')
    setTeam(teamData ?? [])
    await loadTasks(user.id)
    setLoading(false)
  }

  async function loadTasks(userId: string) {
    const { data } = await supabase.from('staff_tasks').select('*').eq('user_id', userId).order('due_date', { ascending: true })
    setTasks(data ?? [])
  }

  async function saveTask() {
    if (!taskForm.title || !user) return
    setSavingTask(true)
    const { error } = await supabase.from('staff_tasks').insert({ ...taskForm, user_id: user.id, assigned_to: taskForm.assigned_to || null, due_date: taskForm.due_date || null })
    setSavingTask(false)
    if (error) { alert(error.message); return }
    setTaskForm({ title: '', assigned_to: '', status: 'On track', due_date: '', notes: '' })
    setShowTaskForm(false)
    await loadTasks(user.id)
  }

  async function updateTaskStatus(id: string, status: string) {
    const { error } = await supabase.from('staff_tasks').update({ status }).eq('id', id)
    if (error) { alert(error.message); return }
    setTasks(prev => prev.map((t: any) => t.id === id ? { ...t, status } : t))
  }

  async function deleteTask(id: string) {
    await supabase.from('staff_tasks').delete().eq('id', id)
    setTasks(prev => prev.filter((t: any) => t.id !== id))
  }

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#98A2B3' }}>Loading...</div>

  return (
    <div style={{ minHeight: '100vh', background: '#F7F8FA', fontFamily: "'Inter',sans-serif" }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #E4E7EC', padding: '0 28px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#98A2B3', textTransform: 'uppercase', letterSpacing: '0.06em' }}>STAFF CENTRE</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#101828' }}>Tasks</div>
        </div>
        <button onClick={() => { setTaskForm({ title: '', assigned_to: '', status: 'On track', due_date: '', notes: '' }); setShowTaskForm(true) }} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>+ New Task</button>
      </div>

      <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
        <p style={{ fontSize: 13, color: '#667085', margin: '0 0 20px' }}>Assign tasks to your team and track progress. Each staff member sees their own on their staff dashboard.</p>

        {showTaskForm && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid ' + ACCENT, padding: 24, marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 16px' }}>New Task</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div style={{ gridColumn: 'span 2' as const }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 4, display: 'block' }}>Title *</label>
                <input value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="e.g. Landlord Onboarding — 12 Ocean Drive" style={{ width: '100%', padding: '9px 12px', border: '1px solid #D0D5DD', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' as const }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 4, display: 'block' }}>Assign To</label>
                <select value={taskForm.assigned_to} onChange={e => setTaskForm({ ...taskForm, assigned_to: e.target.value })} style={{ width: '100%', padding: '9px 12px', border: '1px solid #D0D5DD', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' as const }}>
                  <option value="">Unassigned</option>
                  {team.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 4, display: 'block' }}>Due Date</label>
                <input type="date" value={taskForm.due_date} onChange={e => setTaskForm({ ...taskForm, due_date: e.target.value })} style={{ width: '100%', padding: '9px 12px', border: '1px solid #D0D5DD', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' as const }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 4, display: 'block' }}>Status</label>
                <select value={taskForm.status} onChange={e => setTaskForm({ ...taskForm, status: e.target.value })} style={{ width: '100%', padding: '9px 12px', border: '1px solid #D0D5DD', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' as const }}>
                  {['On track', 'At risk', 'Off track', 'Done'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: 'span 2' as const }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 4, display: 'block' }}>Notes</label>
                <textarea value={taskForm.notes} onChange={e => setTaskForm({ ...taskForm, notes: e.target.value })} rows={2} style={{ width: '100%', padding: '9px 12px', border: '1px solid #D0D5DD', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', resize: 'vertical' as const, boxSizing: 'border-box' as const }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={saveTask} disabled={savingTask || !taskForm.title} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: savingTask || !taskForm.title ? 0.6 : 1 }}>{savingTask ? 'Saving…' : 'Create Task'}</button>
              <button onClick={() => setShowTaskForm(false)} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #D0D5DD', background: '#fff', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', color: '#344054' }}>Cancel</button>
            </div>
          </div>
        )}

        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr 60px', padding: '10px 20px', background: '#F9FAFB', borderBottom: '1px solid #E4E7EC', fontSize: 11, fontWeight: 600, color: '#667085', textTransform: 'uppercase' as const, gap: 8 }}>
            <span>Task</span><span>Assigned To</span><span>Status</span><span>Due Date</span><span></span>
          </div>
          {tasks.length === 0 ? (
            <div style={{ textAlign: 'center' as const, padding: 60, color: '#98A2B3' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#101828', marginBottom: 4 }}>No tasks yet</div>
              <div style={{ fontSize: 13 }}>Create your first task above.</div>
            </div>
          ) : tasks.map((t: any) => {
            const assignee = team.find((m: any) => m.id === t.assigned_to)
            const statusColors: Record<string, { bg: string, fg: string }> = { 'On track': { bg: '#ECFDF5', fg: '#10B981' }, 'At risk': { bg: '#FFFBEB', fg: '#F59E0B' }, 'Off track': { bg: '#FEF2F2', fg: '#EF4444' }, 'Done': { bg: '#F2F4F7', fg: '#667085' } }
            const c = statusColors[t.status] ?? statusColors['On track']
            return (
              <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr 60px', padding: '13px 20px', borderBottom: '1px solid #F2F4F7', alignItems: 'center', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#101828' }}>{t.title}</div>
                  {t.notes && <div style={{ fontSize: 11, color: '#98A2B3', marginTop: 2 }}>{t.notes}</div>}
                </div>
                <span style={{ fontSize: 13, color: '#344054' }}>{assignee?.name ?? 'Unassigned'}</span>
                <select value={t.status} onChange={e => updateTaskStatus(t.id, e.target.value)} style={{ background: c.bg, color: c.fg, fontSize: 12, fontWeight: 600, padding: '6px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'inherit', width: 'fit-content' }}>
                  {['On track', 'At risk', 'Off track', 'Done'].map(s => <option key={s}>{s}</option>)}
                </select>
                <span style={{ fontSize: 13, color: '#667085' }}>{t.due_date ?? '—'}</span>
                <button onClick={() => deleteTask(t.id)} style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: '#FEE2E2', fontSize: 11, cursor: 'pointer', color: '#EF4444' }}>×</button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
