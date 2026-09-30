'use client'
import { useState } from 'react'
import { BRAND } from '@/lib/crm-board'
import { APPLICATIONS_BOARD } from '@/lib/marketing-boards'
import { useApplications } from '@/components/applications/useApplications'
import MkBoardView from '@/components/marketing/MkBoardView'
import MkPanel from '@/components/marketing/MkPanel'

// Staff Centre → Applications: job applicants (including the website careers form),
// shown as a CRM-style board with table, Kanban and interview calendar views.
export default function ApplicationsPage() {
  const store = useApplications()
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
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: '#fff' }}>
        {store.loading
          ? <div style={{ padding: 60, color: BRAND.muted, textAlign: 'center' }}>Loading applications…</div>
          : store.error
            ? <div style={{ padding: 60, color: '#DF2F4A' }}>Couldn’t load applications: {store.error}</div>
            : <MkBoardView mk={store} board={APPLICATIONS_BOARD} onOpen={setOpen}
                headerRight={<span style={{ fontSize: 12.5, color: BRAND.muted, marginRight: 8 }}>Website job applications land here automatically</span>} />}
      </main>
      {open && <MkPanel key={open} mk={store} board={APPLICATIONS_BOARD} id={open} onClose={() => setOpen(null)} onOpenOther={(_b, id) => setOpen(id)} />}
    </div>
  )
}
