'use client'
// Blue banner at the top of a tab: its name and what it does (same look as the Workflows page).
import React from 'react'
import { describeTab } from '@/lib/tab-descriptions'

export default function TabBanner({ module, name }: { module: 'pm' | 'estate' | 'str' | 'dev'; name: string }) {
  const text = describeTab(module, name)
  return (
    <div style={{ padding: '22px 28px', background: 'linear-gradient(135deg,#EAF3FC,#C9DEF3)', borderBottom: '1px solid #C9DEF3', flexShrink: 0 }}>
      <h1 style={{ fontSize: 26, fontWeight: 500, color: '#1D4E89', margin: '0 0 2px' }}>{name}</h1>
      {text && <div style={{ fontSize: 13, color: '#4A6F98', maxWidth: 760, lineHeight: 1.5 }}>{text}</div>}
    </div>
  )
}
