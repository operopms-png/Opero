'use client'
// Staff Centre → Dashboard → Ask Grok: ask questions about arrears, compliance,
// maintenance and bookings. Read only; it cannot change records or send messages.
import React from 'react'
import GrokPanel from '../../../components/GrokPanel'

export default function AskGrokPage() {
  return (
    <div style={{ minHeight: '100%', background: '#F7F6F2', fontFamily: 'Figtree, Inter, -apple-system, sans-serif', color: '#323338' }}>
      <div style={{ padding: '24px 30px 8px' }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#1D4E89' }}>Ask Grok</h1>
        <div style={{ fontSize: 13, color: '#667085', marginTop: 6, lineHeight: 1.6, maxWidth: 760 }}>
          <strong>What this is for:</strong> ask a question about the business in plain words and get a short answer from the portal's records. Grok is read only. It cannot change records, send messages to tenants or make payments. Any draft it writes must be read and sent by a member of staff.
        </div>
      </div>
      <GrokPanel />
    </div>
  )
}
