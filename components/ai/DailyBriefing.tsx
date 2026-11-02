'use client'
// "What needs you today": counts from the records across every module, most urgent first.
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { staffApi } from '../../lib/staff-api'

type Item = { key: string; label: string; count: number; href: string; level: 'urgent' | 'soon' | 'info' }
const TONE = { urgent: { bg: '#FDECEC', c: '#B42318' }, soon: { bg: '#FFF4DE', c: '#8A5A00' }, info: { bg: '#E8F0FB', c: '#1B2F6E' } }

export default function DailyBriefing() {
  const [items, setItems] = useState<Item[] | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => { staffApi<{ items: Item[] }>('/api/ai-briefing').then(d => setItems(d.items)).catch(e => setErr(e.message)) }, [])

  return (
    <div style={{ background: '#fff', border: '1px solid #D9E2F0', borderRadius: 12, padding: 16, marginBottom: 14 }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: '#101828', marginBottom: 2 }}>Today&apos;s briefing</div>
      <div style={{ fontSize: 12, color: '#667085', marginBottom: 12 }}>What needs a person today, most urgent first. Each line opens the place to deal with it.</div>
      {err ? <div style={{ color: '#B42318', fontSize: 13 }}>{err}</div>
        : !items ? <div style={{ color: '#667085', fontSize: 13 }}>Loading…</div>
        : items.length === 0 ? <div style={{ color: '#0E7C55', fontSize: 13 }}>Nothing needs attention today.</div>
        : <div style={{ display: 'grid', gap: 6 }}>
            {items.map(i => (
              <Link key={i.key} href={i.href} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', borderRadius: 8, border: '1px solid #EAECF0', textDecoration: 'none', color: '#101828', fontSize: 13.5 }}>
                <span style={{ minWidth: 34, textAlign: 'center', fontWeight: 700, borderRadius: 12, padding: '2px 8px', background: TONE[i.level].bg, color: TONE[i.level].c }}>{i.count}</span>
                <span>{i.label}</span>
              </Link>
            ))}
          </div>}
    </div>
  )
}
