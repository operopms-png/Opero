'use client'
// Staff Centre → Scale: how far this company's master lease and co-host business has grown, from its own records.
// Master leases come from Property Management → Head Leases, co-hosting from Staff Centre → Co-hosts and the bookings on
// the properties they host. Only this company's records are read. "Preview example" shows labelled sample figures.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, getAccountId } from '../../../lib/supabase'
import { CrmPage, CrmHeader, Body, Stat, Pill, Empty, Loading, btn, C } from '../../../components/crm/Page'
import { buildScale, EXAMPLE, moneyLine, type Scale } from '../../../lib/scale'

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not set')
const STATE: Record<string, [string, string]> = { ok: [C.green, 'Current'], soon: [C.orange, 'Ends soon'], expired: [C.red, 'Ended'], none: [C.grey, 'No end date'] }

function Panel({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section style={{ background: '#fff', border: '1px solid ' + C.row, borderRadius: 8, padding: 16, minWidth: 0 }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: C.ink }}>{title}</div>
      {sub && <div style={{ fontSize: 12.5, color: C.muted, margin: '2px 0 12px' }}>{sub}</div>}
      {children}
    </section>
  )
}

function Growth({ series }: { series: Scale['series'] }) {
  const max = Math.max(1, ...series.map(s => s.masters + s.cohost))
  const H = 130
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: H + 22 }} role="img" aria-label="Doors under management over the last 12 months">
        {series.map((s, i) => (
          <div key={i} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }} title={`${s.label}: ${s.masters + s.cohost} doors`}>
            <div style={{ width: '70%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: H }}>
              <div style={{ height: (s.cohost / max) * H, background: C.blue }} />
              <div style={{ height: (s.masters / max) * H, background: C.brown }} />
            </div>
            <div style={{ fontSize: 11, color: C.faint, marginTop: 6, height: 16 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 16, fontSize: 12.5, color: C.muted, marginTop: 8, flexWrap: 'wrap' }}>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, background: C.brown, marginRight: 6 }} />Master leases</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, background: C.blue, marginRight: 6 }} />Co-hosted properties</span>
      </div>
    </div>
  )
}

export default function ScalePage() {
  const [rows, setRows] = useState<Parameters<typeof buildScale>[0] | null>(null)
  const [example, setExample] = useState(false)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const acct = await getAccountId(user)
      const [l, p, c] = await Promise.all([
        supabase.from('pm_head_leases').select('id,property_id,landlord_name,rent_payable,start_date,expiry_date,break_date,sublet_consent,created_at').eq('user_id', acct),
        supabase.from('pm_properties').select('id,name,monthly_income,currency').eq('user_id', acct),
        supabase.from('cohosts').select('id,name,property_ids,payment_model,currency,agreement_start,agreement_end,created_at').eq('user_id', acct),
      ])
      if (l.error || p.error || c.error) { setErr((l.error || p.error || c.error)!.message); return }
      const ids = Array.from(new Set((c.data ?? []).flatMap((x: any) => x.property_ids ?? []))) as string[]
      const since = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10)
      const b = ids.length ? await supabase.from('bookings').select('property_id,check_in,status,total_amount').in('property_id', ids).gte('check_in', since).limit(5000) : { data: [] as any[] }
      setRows({ leases: l.data ?? [], pmProps: p.data ?? [], cohosts: c.data ?? [], bookings: (b as any).data ?? [] }); setErr('')
    } catch (e: any) { setErr(e?.message || 'Could not load.') }
  }, [])

  // Everyone on the team reads the same company records. Reload when the page is opened again or the tab regains focus.
  useEffect(() => {
    load()
    const again = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', again); window.addEventListener('focus', again)
    return () => { document.removeEventListener('visibilitychange', again); window.removeEventListener('focus', again) }
  }, [load])

  const live = useMemo(() => (rows ? buildScale(rows) : null), [rows])
  const empty = !!live && live.masters.count === 0 && live.cohosts.count === 0
  const s = example ? EXAMPLE : live

  if (!s) return <CrmPage><CrmHeader title="Scale" subtitle="" />{err ? <Body><div style={{ color: C.red }}>{err}</div></Body> : <Loading />}</CrmPage>
  const go = (href: string) => { window.location.href = href }
  return (
    <CrmPage>
      <CrmHeader title="Scale" subtitle={example ? 'Example figures for preview only. These are not your records.' : 'How big your master lease and co-host business is, and what needs attention to keep growing it. Read from your own Head Leases and Co-hosts.'}
        actions={<>{!example && <button style={btn('ghost')} onClick={() => load()}>Refresh</button>}<button style={btn(example ? 'gold' : 'ghost')} onClick={() => setExample(!example)}>{example ? 'Back to my data' : 'Preview example'}</button></>} />
      <Body>
        {empty && !example && (
          <div style={{ marginBottom: 14 }}><Empty>Nothing to show yet. Add a head lease in Property Management, Head Leases, or a co-host in Human Intelligence Hub, Owners &amp; Tenants, Co-hosts. Press Preview example to see what this page will look like.</Empty></div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12, marginBottom: 14 }}>
          <Stat label="Doors under management" value={s.doors} sub="Master leases plus co-hosted properties" highlight />
          <Stat label="Master leases" value={s.masters.count} sub={s.masters.expiring90 ? `${s.masters.expiring90} end within 90 days` : 'None ending in 90 days'} />
          <Stat label="Co-hosts" value={s.cohosts.count} sub={`${s.cohosts.properties} propert${s.cohosts.properties === 1 ? 'y' : 'ies'} hosted`} />
          <Stat label="Margin after head rent" value={<span style={{ fontSize: 18 }}>{moneyLine(s.masters.margin)}</span>} sub={s.masters.marginLeases ? `Per month, ${s.masters.marginLeases} lease${s.masters.marginLeases === 1 ? '' : 's'} with both figures` : 'Needs rent payable and property income'} />
          <Stat label="Co-host bookings, 90 days" value={<span style={{ fontSize: 18 }}>{moneyLine(s.cohosts.revenue90)}</span>} sub="Booked stays on co-hosted properties" />
        </div>

        {s.attention.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <Panel title="What needs attention">
              <div style={{ display: 'grid', gap: 8 }}>
                {s.attention.map((a, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, color: C.ink }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: a.tone === 'warn' ? C.orange : C.blue, marginTop: 6, flexShrink: 0 }} />{a.text}
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 14, marginBottom: 14 }}>
          <Panel title="Growth, last 12 months" sub="Doors under management at the end of each month, from lease and agreement start dates.">
            <Growth series={s.series} />
          </Panel>
          <Panel title="Money in and out" sub="Per month, master leases only.">
            <div style={{ display: 'grid', gap: 10, fontSize: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><span style={{ color: C.muted }}>Head rent payable</span><b>{moneyLine(s.masters.rent)}</b></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><span style={{ color: C.muted }}>Property income entered</span><b>{moneyLine(s.masters.income)}</b></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, borderTop: '1px solid ' + C.row, paddingTop: 10 }}><span style={{ color: C.muted }}>Margin</span><b>{moneyLine(s.masters.margin)}</b></div>
            </div>
            <div style={{ fontSize: 12, color: C.faint, marginTop: 10 }}>Margin only counts leases where both the rent payable and the property income are entered.</div>
          </Panel>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: 14 }}>
          <Panel title="Master leases" sub="Soonest expiry first.">
            {s.masters.rows.length === 0 ? <Empty>No head leases yet.</Empty> : (
              <div style={{ display: 'grid', gap: 8 }}>
                {s.masters.rows.slice(0, 12).map(r => (
                  <div key={r.id} onClick={example ? undefined : () => go('/pm?tab=Head%20Leases')} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', padding: '8px 0', borderTop: '1px solid ' + C.row, cursor: example ? 'default' : 'pointer', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: C.ink, overflowWrap: 'anywhere' }}>{r.property}</div>
                      <div style={{ fontSize: 12.5, color: C.muted }}>{r.landlord || 'Landlord not entered'} · Ends {fmtDate(r.expiry)}{r.rent != null ? ` · ${moneyLine({ [r.currency]: r.rent })} a month` : ''}</div>
                      <div style={{ fontSize: 12, color: C.faint }}>Sublet consent: {r.consent}</div>
                    </div>
                    <Pill color={STATE[r.state][0]} width={96}>{STATE[r.state][1]}</Pill>
                  </div>
                ))}
                {s.masters.rows.length > 12 && <div style={{ fontSize: 12.5, color: C.muted }}>And {s.masters.rows.length - 12} more in Property Management, Head Leases.</div>}
              </div>
            )}
          </Panel>
          <Panel title="Co-host management" sub="Agreements ending soonest first.">
            {s.cohosts.rows.length === 0 ? <Empty>No co-hosts yet.</Empty> : (
              <div style={{ display: 'grid', gap: 8 }}>
                {s.cohosts.rows.slice(0, 12).map(r => (
                  <div key={r.id} onClick={example ? undefined : () => go('/staff-centre/cohosts')} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', padding: '8px 0', borderTop: '1px solid ' + C.row, cursor: example ? 'default' : 'pointer', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: C.ink, overflowWrap: 'anywhere' }}>{r.name}</div>
                      <div style={{ fontSize: 12.5, color: C.muted }}>{r.properties} propert{r.properties === 1 ? 'y' : 'ies'} · {r.model} · {r.end ? `Agreement ends ${fmtDate(r.end)}` : 'No agreement end date'}</div>
                      <div style={{ fontSize: 12, color: C.faint }}>Bookings, last 90 days: {r.revenue90 ? moneyLine({ [r.currency]: r.revenue90 }) : 'None'}</div>
                    </div>
                    <Pill color={STATE[r.state][0]} width={96}>{STATE[r.state][1]}</Pill>
                  </div>
                ))}
                {s.cohosts.rows.length > 12 && <div style={{ fontSize: 12.5, color: C.muted }}>And {s.cohosts.rows.length - 12} more in Co-hosts.</div>}
              </div>
            )}
          </Panel>
        </div>
      </Body>
    </CrmPage>
  )
}
