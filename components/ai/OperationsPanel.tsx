'use client'
// AI Command Centre → Operations. Live counts from the Operations tabs; each card opens its tab.
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { staffApi } from '../../lib/staff-api'

const LINE = '#D9E2F0', NAVY = '#1B2F6E', MUTED = '#667085', TXT = '#101828', RED = '#B42318', AMBER = '#B54708'

type Feed = {
  asOf: string
  maintenance: { open: number; href: string }
  cleaning: { open: number; href: string }
  turnovers: { open: number; href: string }
  compliance: { expired: number; dueWithin30Days: number; href: string }
}

export default function OperationsPanel() {
  const [d, setD] = useState<Feed | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    staffApi('/api/command-centre/operations').then(setD).catch((e: any) => setErr(e.message))
  }, [])

  const card = (title: string, value: React.ReactNode, sub: string, href: string, alert = false) => (
    <Link href={href} key={title} style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 12, padding: '12px 14px', textDecoration: 'none', color: TXT, display: 'block', minWidth: 0 }}>
      <div style={{ fontSize: 12, color: MUTED }}>{title}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: alert ? RED : NAVY, marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: 11, color: alert ? AMBER : MUTED, marginTop: 2 }}>{sub}</div>
    </Link>
  )

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: TXT, marginBottom: 8 }}>Operations</div>
      {err && <div style={{ color: RED, fontSize: 12, marginBottom: 8 }}>Could not load operations: {err}</div>}
      {!d && !err && <div style={{ color: MUTED, fontSize: 12, marginBottom: 8 }}>Loading…</div>}
      {d && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10 }}>
          {card('Open maintenance', d.maintenance.open, d.maintenance.open ? 'Tickets not yet resolved' : 'Nothing open', d.maintenance.href)}
          {card('Open cleaning', d.cleaning.open, d.cleaning.open ? 'Tasks not yet done' : 'Nothing open', d.cleaning.href)}
          {card('Open turnovers', d.turnovers.open, d.turnovers.open ? 'Changeovers not yet done' : 'Nothing open', d.turnovers.href)}
          {card('Compliance expired', d.compliance.expired, `${d.compliance.dueWithin30Days} due in the next 30 days`, d.compliance.href, d.compliance.expired > 0)}
        </div>
      )}
    </div>
  )
}
