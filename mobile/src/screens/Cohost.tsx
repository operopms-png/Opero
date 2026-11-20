import { View } from 'react-native'
import { Image } from 'expo-image'
import { T, Muted, Card, Row, Section, Header, Empty, Pill, DarkCard, Stat, type ScreenProps } from '@/components/ui'
import { C, F, money, day } from '@/lib/theme'

const CUR: Record<string, string> = { GBP: '£', USD: '$', JMD: 'J$', AED: 'AED ', EUR: '€' }
const cur = (c?: string) => CUR[String(c || '').toUpperCase()] ?? ''
const statusTone = (s: string) => /confirm|complete|resolved|closed/i.test(s) ? 'green' : /cancel/i.test(s) ? 'red' : /pending|open|new/i.test(s) ? 'amber' : 'blue'

// Co-host: the properties managed for them, bookings, earnings and maintenance. Read only.
export function CohostHome({ data, name, go }: ScreenProps) {
  const c = data?.cohost
  if (!c) return <View><Header small="Co-host" title={name ? `Hello, ${name}` : 'Hello'} /><Card><Empty title="No co-host record found" sub="Ask our team to link your co-host record to this email address." /></Card></View>
  const sym = cur(c.currency)
  const t = data.totals ?? {}
  return (
    <View>
      <Header small={c.company ? `Co-host · ${c.company}` : 'Co-host'} title={name ? `Hello, ${name}` : 'Hello'} />
      <DarkCard label="Booked on your properties" value={money(t.gross, sym)}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
          <T style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>{t.bookings ?? 0} booking{t.bookings === 1 ? '' : 's'}</T>
          {t.your_share != null ? <T style={{ color: '#fff', fontSize: 13 }}>Your share {money(t.your_share, sym)}</T> : <T style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>Share as per your agreement</T>}
        </View>
      </DarkCard>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        <Stat label="Properties" value={data.properties?.length ?? 0} /><Stat label="Upcoming stays" value={data.upcoming?.length ?? 0} /><Stat label="Open repairs" value={(data.maintenance ?? []).filter((m: any) => !/resolved|closed|completed/i.test(String(m.status))).length} highlight />
      </View>
      <Section>Your properties</Section>
      <Card pad={false}>{data.properties?.length ? data.properties.map((p: any, i: number) => (
        <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: C.line2 }}>
          {p.image_url ? <Image source={{ uri: p.image_url }} style={{ width: 44, height: 44, borderRadius: 10 }} contentFit="cover" /> : <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: C.cream }} />}
          <View style={{ flex: 1 }}><T style={{ fontFamily: F.semi }}>{p.name}</T><Muted>{[p.address, p.city].filter(Boolean).join(', ')}</Muted></View>
        </View>
      )) : <Empty title="No properties assigned yet" sub="Your property manager assigns properties to your record." />}</Card>
      <Card pad={false} style={{ marginTop: 12 }}>
        <Row first icon="cal" title="Bookings" sub={data.upcoming?.length ? `${data.upcoming.length} upcoming` : 'No upcoming stays'} onPress={() => go('bookings')} />
        <Row icon="tool" title="Maintenance" sub="Jobs on your properties" onPress={() => go('maintenance')} />
      </Card>
      {c.agreement_end ? <Muted style={{ textAlign: 'center', marginTop: 14 }}>Agreement ends {day(c.agreement_end, { day: 'numeric', month: 'long', year: 'numeric' })}</Muted> : null}
    </View>
  )
}

export function CohostBookings({ data }: ScreenProps) {
  const sym = cur(data?.cohost?.currency)
  const name = (id: string) => data?.properties?.find((p: any) => p.id === id)?.name ?? 'Property'
  const list = data?.bookings ?? []
  return (
    <View>
      <Header title="Bookings" />
      <Card pad={false}>{list.length ? list.map((b: any, i: number) => (
        <Row key={b.id} first={i === 0} icon="cal" title={`${day(b.check_in, { day: 'numeric', month: 'short' })} – ${day(b.check_out, { day: 'numeric', month: 'short', year: 'numeric' })}`}
          sub={[name(b.property_id), b.guest_name, b.platform].filter(Boolean).join(' · ')}
          right={<View style={{ alignItems: 'flex-end', gap: 4 }}><T style={{ fontFamily: F.bold }}>{money(Number(b.total_amount) || 0, sym)}</T><Pill tone={statusTone(String(b.status)) as any}>{String(b.status || 'booked')}</Pill></View>} />
      )) : <Empty title="No bookings yet" />}</Card>
    </View>
  )
}

export function CohostMaintenance({ data }: ScreenProps) {
  const name = (id: string) => data?.properties?.find((p: any) => p.id === id)?.name ?? 'Property'
  const list = data?.maintenance ?? []
  return (
    <View>
      <Header title="Maintenance" />
      <Card pad={false}>{list.length ? list.map((m: any, i: number) => (
        <Row key={m.id} first={i === 0} icon="tool" title={m.title || m.description || 'Maintenance job'} sub={`${name(m.property_id)} · ${day(m.created_at, { day: 'numeric', month: 'short' })}`} right={<Pill tone={statusTone(String(m.status)) as any}>{String(m.status)}</Pill>} />
      )) : <Empty title="No maintenance jobs" sub="Jobs on your properties appear here." />}</Card>
    </View>
  )
}
