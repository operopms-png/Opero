'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type CleaningTask = {
  id: string
  property_id: string
  assigned_to: string | null
  status: 'pending' | 'in_progress' | 'completed' | 'skipped'
  scheduled_date: string
  notes: string | null
  created_at: string
  properties?: { name: string }
}

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: '#F59E0B', bg: '#FEF3C7' },
  in_progress: { label: 'In Progress', color: '#3B82F6', bg: '#DBEAFE' },
  completed: { label: 'Completed', color: '#10B981', bg: '#D1FAE5' },
  skipped: { label: 'Skipped', color: '#6B7280', bg: '#F3F4F6' },
}

export default function CleaningTasksPage() {
  const [tasks, setTasks] = useState<CleaningTask[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [properties, setProperties] = useState<{ id: string; name: string }[]>([])
  const [form, setForm] = useState({
    property_id: '',
    assigned_to: '',
    scheduled_date: '',
    notes: '',
    status: 'pending',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchTasks()
    fetchProperties()
  }, [])

  async function fetchTasks() {
    setLoading(true)
    const { data, error } = await supabase
      .from('cleaning_tasks')
      .select('*, properties(name)')
      .order('scheduled_date', { ascending: true })

    if (!error && data) setTasks(data as CleaningTask[])
    setLoading(false)
  }

  async function fetchProperties() {
    const { data } = await supabase.from('properties').select('id, name')
    if (data) setProperties(data)
  }

  async function updateStatus(id: string, status: CleaningTask['status']) {
    await supabase.from('cleaning_tasks').update({ status }).eq('id', id)
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)))
  }

  async function handleCreate() {
    if (!form.property_id || !form.scheduled_date) return
    setSaving(true)
    const { error } = await supabase.from('cleaning_tasks').insert([form])
    if (!error) {
      setShowModal(false)
      setForm({ property_id: '', assigned_to: '', scheduled_date: '', notes: '', status: 'pending' })
      fetchTasks()
    }
    setSaving(false)
  }

  async function deleteTask(id: string) {
    await supabase.from('cleaning_tasks').delete().eq('id', id)
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  const filtered = filter === 'all' ? tasks : tasks.filter((t) => t.status === filter)

  const counts = {
    all: tasks.length,
    pending: tasks.filter((t) => t.status === 'pending').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FA', fontFamily: "'DM Sans', sans-serif" }}>
      {/* Google Fonts */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');`}</style>

      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '0 32px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20 }}>🧹</span>
            <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: '#111827' }}>Cleaning Tasks</h1>
          </div>
          <button
            onClick={() => setShowModal(true)}
            style={{ background: '#111827', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            + New Task
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px' }}>
        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {(['all', 'pending', 'in_progress', 'completed'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                padding: '7px 16px',
                borderRadius: 20,
                border: '1px solid',
                borderColor: filter === s ? '#111827' : '#E5E7EB',
                background: filter === s ? '#111827' : '#fff',
                color: filter === s ? '#fff' : '#6B7280',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {s === 'all' ? 'All' : s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
              <span style={{ marginLeft: 6, opacity: 0.7 }}>
                {counts[s as keyof typeof counts] ?? tasks.filter(t => t.status === s).length}
              </span>
            </button>
          ))}
        </div>

        {/* Task list */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#9CA3AF' }}>Loading tasks…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#9CA3AF' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✨</div>
            <div style={{ fontSize: 16, fontWeight: 500 }}>No tasks here</div>
            <div style={{ fontSize: 14, marginTop: 4 }}>Create a cleaning task to get started</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map((task) => {
              const cfg = STATUS_CONFIG[task.status]
              return (
                <div
                  key={task.id}
                  style={{
                    background: '#fff',
                    borderRadius: 12,
                    border: '1px solid #E5E7EB',
                    padding: '16px 20px',
                    display: 'grid',
                    gridTemplateColumns: '1fr auto auto',
                    alignItems: 'center',
                    gap: 16,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 15, color: '#111827' }}>
                        {task.properties?.name ?? 'Unknown Property'}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 500, padding: '2px 10px', borderRadius: 20, color: cfg.color, background: cfg.bg }}>
                        {cfg.label}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#6B7280' }}>
                      <span>📅 {new Date(task.scheduled_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                      {task.assigned_to && <span>👤 {task.assigned_to}</span>}
                      {task.notes && <span>📝 {task.notes}</span>}
                    </div>
                  </div>

                  {/* Status selector */}
                  <select
                    value={task.status}
                    onChange={(e) => updateStatus(task.id, e.target.value as CleaningTask['status'])}
                    style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer', background: '#fff' }}
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="skipped">Skipped</option>
                  </select>

                  <button
                    onClick={() => deleteTask(task.id)}
                    style={{ background: 'none', border: 'none', color: '#D1D5DB', cursor: 'pointer', fontSize: 18, padding: 4, lineHeight: 1 }}
                    title="Delete task"
                  >
                    ×
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create modal */}
      {showModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 480, margin: '0 16px' }}>
            <h2 style={{ margin: '0 0 24px', fontSize: 18, fontWeight: 600 }}>New Cleaning Task</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Property *</label>
                <select
                  value={form.property_id}
                  onChange={(e) => setForm({ ...form, property_id: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }}
                >
                  <option value="">Select a property…</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Scheduled Date *</label>
                <input
                  type="date"
                  value={form.scheduled_date}
                  onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Assigned To</label>
                <input
                  type="text"
                  placeholder="Cleaner name or email"
                  value={form.assigned_to}
                  onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Notes</label>
                <textarea
                  placeholder="Any special instructions…"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 14, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button
                onClick={() => setShowModal(false)}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !form.property_id || !form.scheduled_date}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#111827', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1 }}
              >
                {saving ? 'Saving…' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
