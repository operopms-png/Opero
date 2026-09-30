'use client'
import { useState } from 'react'
import { BRAND } from '@/lib/crm-board'
import { TASKS_BOARD, TEAM_SOURCE } from '@/lib/hr-boards'
import { useMultiBoards } from '@/components/boards/useMultiBoards'
import MkBoardView from '@/components/marketing/MkBoardView'
import MkPanel from '@/components/marketing/MkPanel'

// Staff Centre → Tasks: assign tasks to the team. Each person sees theirs on their staff dashboard.
export default function TasksPage() {
  const store = useMultiBoards([TASKS_BOARD, TEAM_SOURCE], {
    refs: rows => ({ team: (rows.team ?? []).filter(t => t.name?.trim()).map(t => ({ value: t.id, label: t.name, color: '#D0AE4C' })).sort((a, b) => a.label.localeCompare(b.label)) }),
  })
  const [open, setOpen] = useState<string | null>(null)
  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', contain: 'inline-size', fontFamily: 'Figtree, Inter, -apple-system, sans-serif', color: BRAND.ink, background: '#fff' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&display=swap');
        .crm-hover-show { opacity: 0; transition: opacity .1s }
        .crm-row:hover .crm-hover-show, .crm-colhead:hover .crm-hover-show { opacity: 1 }
        .crm-row:hover, .crm-row:hover .crm-sticky { background: ${BRAND.hover} !important }
        .crm-nav:hover { background: ${BRAND.hover} }
        .crm-tb:hover { background: ${BRAND.hover} }
      `}</style>
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {store.loading ? <div style={{ padding: 60, color: BRAND.muted, textAlign: 'center' }}>Loading tasks…</div>
          : store.error ? <div style={{ padding: 60, color: '#DF2F4A' }}>Couldn’t load tasks: {store.error}</div>
          : <MkBoardView mk={store} board={TASKS_BOARD} onOpen={setOpen}
              headerRight={<span style={{ fontSize: 12.5, color: BRAND.muted, marginRight: 8 }}>Each person sees their own tasks on their staff dashboard</span>} />}
      </main>
      {open && <MkPanel key={open} mk={store} board={TASKS_BOARD} id={open} onClose={() => setOpen(null)} onOpenOther={(_b, id) => setOpen(id)} />}
    </div>
  )
}
