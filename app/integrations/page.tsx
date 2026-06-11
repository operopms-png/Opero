
'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const integrations = [
  {
    id: 'pricelabs',
    name: 'PriceLabs',
    description: 'Dynamic pricing recommendations. Connect your account to see live pricing data for all your properties.',
    logo: '📊',
    color: '#1a56db',
    bg: '#eff6ff',
    type: 'api_key',
    placeholder: 'Enter your PriceLabs API key',
    docsUrl: 'https://pricelabs.co/users/api_keys',
    docsLabel: 'Get your API key →',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Process payments and subscriptions. Already configured for your Opero subscription.',
    logo: '💳',
    color: '#635bff',
    bg: '#f5f3ff',
    type: 'built_in',
  },
  {
    id: 'paypal',
    name: 'PayPal',
    description: 'Accept PayPal and PayPal.me payments from guests and owners.',
    logo: '🅿️',
    color: '#003087',
    bg: '#eff6ff',
    type: 'api_key',
    placeholder: 'Enter your PayPal Client ID',
    docsUrl: 'https://developer.paypal.com/dashboard/',
    docsLabel: 'Get your Client ID →',
  },
  {
    id: 'airbnb',
    name: 'Airbnb iCal',
    description: 'Sync your Airbnb bookings automatically via iCal URL.',
    logo: '🏠',
    color: '#ff5a5f',
    bg: '#fff1f2',
    type: 'url',
    placeholder: 'Paste your Airbnb iCal URL',
  },
  {
    id: 'vrbo',
    name: 'VRBO iCal',
    description: 'Sync your VRBO bookings automatically via iCal URL.',
    logo: '🏡',
    color: '#1e6ef4',
    bg: '#eff6ff',
    type: 'url',
    placeholder: 'Paste your VRBO iCal URL',
  },
  {
    id: 'booking',
    name: 'Booking.com iCal',
    description: 'Sync your Booking.com reservations automatically.',
    logo: '🌐',
    color: '#003580',
    bg: '#eff6ff',
    type: 'url',
    placeholder: 'Paste your Booking.com iCal URL',
  },
]

export default function IntegrationsPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [connected, setConnected] = useState<Record<string, boolean>>({})
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [messages, setMessages] = useState<Record<string, { type: 'success' | 'error'; text: string }>>({})
  const [pricelabsData, setPricelabsData] = useState<any[]>([])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUserId(data.user.id)
        loadIntegrations(data.user.id)
      }
    })
  }, [])

  async function loadIntegrations(uid: string) {
    const { data } = await supabase
      .from('integrations')
      .select('*')
      .eq('user_id', uid)
      .single()

    if (data) {
      const c: Record<string, boolean> = {}
      if (data.pricelabs_api_key) c.pricelabs = true
      if (data.paypal_client_id) c.paypal = true
      if (data.airbnb_ical_url) c.airbnb = true
      if (data.vrbo_ical_url) c.vrbo = true
      if (data.booking_ical_url) c.booking = true
      setConnected(c)
      if (data.pricelabs_api_key) fetchPricelabs(uid)
    }
    setConnected(prev => ({ ...prev, stripe: true }))
  }

  async function fetchPricelabs(uid: string) {
    const res = await fetch(`/api/pricelabs?userId=${uid}`)
    if (res.ok) {
      const data = await res.json()
      setPricelabsData(data?.listings || data || [])
    }
  }

  async function handleConnect(id: string) {
    if (!userId || !inputs[id]) return
    setLoading(prev => ({ ...prev, [id]: true }))

    try {
      if (id === 'pricelabs') {
        const res = await fetch('/api/pricelabs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, apiKey: inputs[id] }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setConnected(prev => ({ ...prev, pricelabs: true }))
        setMessages(prev => ({ ...prev, pricelabs: { type: 'success', text: 'PriceLabs connected!' } }))
        fetchPricelabs(userId)
      } else {
        const col = id === 'paypal' ? 'paypal_client_id'
          : id === 'airbnb' ? 'airbnb_ical_url'
          : id === 'vrbo' ? 'vrbo_ical_url'
          : 'booking_ical_url'

        const { error } = await supabase
          .from('integrations')
          .upsert({ user_id: userId, [col]: inputs[id] }, { onConflict: 'user_id' })

        if (error) throw new Error(error.message)
        setConnected(prev => ({ ...prev, [id]: true }))
        setMessages(prev => ({ ...prev, [id]: { type: 'success', text: 'Connected!' } }))
      }
    } catch (err: any) {
      setMessages(prev => ({ ...prev, [id]: { type: 'error', text: err.message } }))
    }
    setLoading(prev => ({ ...prev, [id]: false }))
  }

  async function handleDisconnect(id: string) {
    if (!userId) return
    const col = id === 'pricelabs' ? 'pricelabs_api_key'
      : id === 'paypal' ? 'paypal_client_id'
      : id === 'airbnb' ? 'airbnb_ical_url'
      : id === 'vrbo' ? 'vrbo_ical_url'
      : 'booking_ical_url'

    await supabase
      .from('integrations')
      .upsert({ user_id: userId, [col]: null }, { onConflict: 'user_id' })

    setConnected(prev => ({ ...prev, [id]: false }))
    if (id === 'pricelabs') setPricelabsData([])
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 900, margin: '0 auto', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');`}</style>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111', marginBottom: 4 }}>Integrations</h1>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 32 }}>Connect your tools to get the most out of Opero.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {integrations.map(int => (
          <div key={int.id} style={{ background: '#fff', border: `1px solid ${connected[int.id] ? '#22c55e' : '#e5e7eb'}`, borderRadius: 12, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 40, height: 40, background: int.bg, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{int.logo}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#111' }}>{int.name}</div>
                  {connected[int.id] && <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 500 }}>● Connected</div>}
                </div>
              </div>
              {connected[int.id] && int.type !== 'built_in' && (
                <button onClick={() => handleDisconnect(int.id)} style={{ fontSize: 11, color: '#ef4444', background: 'none', border: '1px solid #fca5a5', borderRadius: 6, padding: '3px 10px', cursor: 'pointer' }}>Disconnect</button>
              )}
            </div>
            <p style={{ fontSize: 12, color: '#666', lineHeight: 1.6 }}>{int.description}</p>
            {int.type !== 'built_in' && !connected[int.id] && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {int.docsUrl && (
                  <a href={int.docsUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: int.color, textDecoration: 'none' }}>{int.docsLabel}</a>
                )}
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="text"
                    placeholder={int.placeholder}
                    value={inputs[int.id] || ''}
                    onChange={e => setInputs(prev => ({ ...prev, [int.id]: e.target.value }))}
                    style={{ flex: 1, padding: '7px 10px', borderRadius: 7, border: '1px solid #e5e7eb', fontSize: 12, fontFamily: 'inherit' }}
                  />
                  <button
                    onClick={() => handleConnect(int.id)}
                    disabled={loading[int.id] || !inputs[int.id]}
                    style={{ padding: '7px 14px', background: int.color, color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontWeight: 500, opacity: loading[int.id] ? 0.7 : 1 }}
                  >
                    {loading[int.id] ? '...' : 'Connect'}
                  </button>
                </div>
                {messages[int.id] && (
                  <div style={{ fontSize: 11, color: messages[int.id].type === 'success' ? '#16a34a' : '#ef4444' }}>{messages[int.id].text}</div>
                )}
              </div>
            )}
            {int.type === 'built_in' && (
              <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 500 }}>✓ Active on your account</div>
            )}
          </div>
        ))}
      </div>

      {pricelabsData.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111', marginBottom: 16 }}>PriceLabs — Live Pricing</h2>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 120px', background: '#f8f9fa', padding: '10px 16px', fontSize: 12, fontWeight: 600, color: '#666' }}>
              <span>Property</span><span>Min Price</span><span>Max Price</span><span>Base Price</span>
            </div>
            {pricelabsData.slice(0, 10).map((listing: any, i: number) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 120px', padding: '10px 16px', borderTop: '1px solid #f0f0f0', fontSize: 13, color: '#333', alignItems: 'center' }}>
                <span style={{ fontWeight: 500 }}>{listing.name || listing.listing_name || 'Property ' + (i + 1)}</span>
                <span style={{ color: '#16a34a' }}>£{listing.min_price || '--'}</span>
                <span style={{ color: '#ef4444' }}>£{listing.max_price || '--'}</span>
                <span style={{ fontWeight: 600 }}>£{listing.base_price || '--'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
