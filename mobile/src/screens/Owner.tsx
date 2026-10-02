import { View, Linking, Pressable } from 'react-native'
import { Image } from 'expo-image'
import { T, Muted, Card, Row, Section, Header, Empty, Pill, DarkCard, type ScreenProps } from '@/components/ui'
import { C, F, money, day } from '@/lib/theme'
import { PORTAL_URL } from '@/lib/config'

const Line = ({ l, v }: { l: string; v: string }) => <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}><T style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>{l}</T><T style={{ color: '#fff', fontSize: 13 }}>{v}</T></View>

// Property owner: payout breakdown, each property's occupancy and earnings, statements, approvals.
export function OwnerHome({ data, name, go }: ScreenProps) {
  const s = data?.str, pm = data?.pm
  const latest = s?.latest
  return (
    <View>
      <Header small="My properties" title={name ? `Hello, ${name}` : 'Hello'} />
      {latest ? (
        <DarkCard label={`Paid to you · ${day(latest.period_end, { month: 'long' })}`} value={money(latest.owner_amount)}>
          <View style={{ marginTop: 10 }}>
            <Line l="Gross" v={money(latest.gross_revenue)} />
            <Line l="Management" v={money(-Math.abs(Number(latest.management_fee) || 0))} />
            <Line l="Costs" v={money(-Math.abs(Number(latest.expenses) || 0))} />
          </View>
        </DarkCard>
      ) : s ? <Card><Empty title="No statements yet" sub="Your first monthly statement will appear here." /></Card> : null}
      {s?.properties?.length ? <>
        <Section>Your properties</Section>
        <Card pad={false}>{s.properties.map((p: any, i: number) => (
          <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: C.line2 }}>
            {p.image ? <Image source={{ uri: p.image }} style={{ width: 44, height: 44, borderRadius: 10 }} contentFit="cover" /> : <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: C.cream }} />}
            <View style={{ flex: 1 }}><T style={{ fontFamily: F.semi }}>{p.name}</T><Muted>{p.occupancy}% occupied (30 days){p.nextGuest ? ` · next guest ${day(p.nextGuest, { weekday: 'short', day: 'numeric', month: 'short' })}` : ''}</Muted></View>
            <T style={{ fontFamily: F.bold }}>{money(p.revenue30)}</T>
          </View>
        ))}</Card>
      </> : null}
      {pm?.properties?.length ? <>
        <Section>Managed lettings</Section>
        <Card pad={false}>{pm.properties.map((p: any, i: number) => <Row key={p.id} first={i === 0} icon="home" title={p.name} sub={[p.city, p.status].filter(Boolean).join(' · ')} right={p.monthly_income ? <T style={{ fontFamily: F.bold }}>{money(p.monthly_income)}</T> : undefined} />)}</Card>
      </> : null}
      <Card pad={false} style={{ marginTop: 12 }}>
        <Row first icon="doc" title="Statements" sub="Monthly, download PDF" onPress={() => go('statements')} />
        <Row icon="tool" title="Maintenance" sub={s?.maintenance?.length ? `${s.maintenance.length} open job${s.maintenance.length === 1 ? '' : 's'}` : 'No open jobs'} onPress={() => go('maintenance')} />
      </Card>
      {!s && !pm ? <Card><Empty title="No properties linked yet" sub="Ask our team to link your properties to this email address." /></Card> : null}
    </View>
  )
}

export function OwnerStatements({ data }: ScreenProps) {
  const list = data?.str?.statements ?? []
  const pays = data?.pm?.payments ?? []
  return (
    <View>
      <Header title="Statements" />
      <Card pad={false}>{list.length ? list.map((s: any, i: number) => <Row key={s.id} first={i === 0} icon="doc" title={`${day(s.period_start, { day: 'numeric', month: 'short' })} – ${day(s.period_end, { day: 'numeric', month: 'short', year: 'numeric' })}`} sub={s.property_name || 'All properties'} right={<View style={{ alignItems: 'flex-end', gap: 4 }}><T style={{ fontFamily: F.bold }}>{money(s.owner_amount)}</T><Pill tone={s.status === 'paid' ? 'green' : s.status === 'sent' ? 'amber' : 'grey'}>{s.status === 'paid' ? 'Paid' : s.status === 'sent' ? 'Due' : 'Draft'}</Pill></View>} />) : <Empty title="No statements yet" />}</Card>
      {pays.length ? <><Section>Rent payments to you</Section><Card pad={false}>{pays.map((p: any, i: number) => <Row key={p.id} first={i === 0} icon="card" title={money(p.amount)} sub={`${p.category || 'Rent'} · ${day(p.due_date, { day: 'numeric', month: 'short' })}`} right={<Pill tone={p.paid_date ? 'green' : 'amber'}>{p.paid_date ? 'Paid' : 'Due'}</Pill>} />)}</Card></> : null}
      <Pressable onPress={() => Linking.openURL(`${PORTAL_URL}/owner-portal`)} style={{ alignSelf: 'center', marginTop: 16, padding: 4 }}>
        <Muted>Full PDF statements are in your <T style={{ color: C.goldText, fontFamily: F.bold, fontSize: 12.5 }}>Owner Portal</T></Muted>
      </Pressable>
    </View>
  )
}

export function OwnerMaintenance({ data }: ScreenProps) {
  const list = data?.str?.maintenance ?? []
  return (
    <View>
      <Header title="Maintenance" />
      <Card pad={false}>{list.length ? list.map((m: any, i: number) => <Row key={m.id} first={i === 0} icon="tool" title={m.title || m.description || 'Maintenance job'} sub={day(m.created_at, { day: 'numeric', month: 'short' })} right={<Pill tone={/approv/i.test(m.status) ? 'amber' : 'blue'}>{m.status}</Pill>} />) : <Empty title="No open maintenance" sub="Jobs that need your approval appear here." />}</Card>
    </View>
  )
}
