'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

const TYPE_ICON: Record<string, string> = {
  maintenance: '🔧', cleaning: '🧹', booking: '📅', guest_message: '💬',
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const ref = useRef<HTMLDivElement>(null)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20)
    setNotifications(data ?? [])
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  async function markAllRead() {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id)
    if (unreadIds.length === 0) return
    await supabase.from('notifications').update({ read: true }).in('id', unreadIds)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const unreadCount = notifications.filter(n => !n.read).length

  function timeAgo(dateStr: string) {
    const diffMs = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diffMs / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => { setOpen(o => !o); if (!open) markAllRead() }}
        title="Notifications"
        style={{ position: 'relative', width: 32, height: 32, borderRadius: '50%', border: 'none', background: '#F2F4F7', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#667085" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>
        {unreadCount > 0 && (
          <span style={{ position: 'absolute', top: 2, right: 2, width: 8, height: 8, borderRadius: '50%', background: '#EF4444', border: '1.5px solid #fff' }} />
        )}
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 38, right: 0, width: 320, maxHeight: 400, overflowY: 'auto', background: '#fff', border: '1px solid #E4E7EC', borderRadius: 10, boxShadow: '0 8px 24px rgba(16,24,40,0.12)', zIndex: 100 }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #F2F4F7', fontSize: 13, fontWeight: 600, color: '#101828' }}>Notifications</div>
          {notifications.length === 0 ? (
            <div style={{ padding: '30px 14px', textAlign: 'center', color: '#98A2B3', fontSize: 13 }}>No notifications yet</div>
          ) : notifications.map(n => (
            <a key={n.id} href={n.link || '#'} style={{ display: 'flex', gap: 10, padding: '10px 14px', borderBottom: '1px solid #F9FAFB', textDecoration: 'none', background: n.read ? '#fff' : '#F5F7FF' }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{TYPE_ICON[n.type] ?? '🔔'}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, color: '#101828', lineHeight: 1.4 }}>{n.title}</div>
                <div style={{ fontSize: 11, color: '#98A2B3', marginTop: 2 }}>{n.property_name ? `${n.property_name} · ` : ''}{timeAgo(n.created_at)}</div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
