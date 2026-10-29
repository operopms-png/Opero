'use client'
// Staff Centre → Dashboard → AI Command Centre → Ask Grok.
// Same read-only Grok panel as the bottom of the AI Command Centre page.
import GrokPanel from '../../../../components/GrokPanel'

export default function AskGrokTab() {
  return (
    <div style={{ background: '#F5F7FB', minHeight: '100vh', padding: '20px 24px', fontFamily: 'Figtree, Arial, sans-serif' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#1B2F6E', marginBottom: 14 }}>Ask Grok</div>
      <GrokPanel />
    </div>
  )
}
