import { View } from 'react-native'
import { Image } from 'expo-image'
import Svg, { Polyline, Polygon } from 'react-native-svg'
import { useState } from 'react'
import { T, Muted, Card, Row, Section, Header, Empty, DarkCard, type ScreenProps } from '@/components/ui'
import { C, F, money, day } from '@/lib/theme'

function Returns({ months }: { months: { label: string; value: number }[] }) {
  const [w, setW] = useState(300)
  const h = 70, vals = months.map(m => m.value), mx = Math.max(...vals, 1)
  const pts = vals.map((v, i) => `${(i * (w / Math.max(1, vals.length - 1))).toFixed(1)},${(h - 4 - (v / mx) * (h - 12)).toFixed(1)}`).join(' ')
  const empty = vals.every(v => v === 0)
  return (
    <View onLayout={e => setW(e.nativeEvent.layout.width)}>
      <Svg width={w} height={h}>
        {!empty && <Polygon points={`0,${h} ${pts} ${w},${h}`} fill="#B08A2E" opacity={0.1} />}
        <Polyline points={pts} fill="none" stroke={empty ? '#d9d4c8' : '#B08A2E'} strokeWidth={2} strokeLinejoin="round" />
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        {[months[0], months[Math.floor(months.length / 2)], months[months.length - 1]].map((m, i) => <Muted key={i} style={{ fontSize: 11 }}>{m?.label}</Muted>)}
      </View>
    </View>
  )
}

// Partner: invested, returned, next payout, returns chart, investments, broadcast.
export function PartnerHome({ data, name, go }: ScreenProps) {
  const p = data?.partner
  if (!p) return <View><Header small="Partner" title={name ? `Welcome, ${name}` : 'Welcome'} /><Card><Empty title="No investment linked yet" /></Card></View>
  return (
    <View>
      <Header small="Partner" title={name ? `Welcome, ${name}` : 'Welcome'} />
      <DarkCard label="Total invested" value={money(p.invested)}>
        <View style={{ flexDirection: 'row', gap: 22, marginTop: 12 }}>
          <View><T style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Returned</T><T style={{ color: '#fff', fontFamily: F.bold }}>{money(p.returned)}</T></View>
          <View><T style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Next payout</T><T style={{ color: '#fff', fontFamily: F.bold }}>{p.nextPayout ? money(p.nextPayout) : '—'}</T></View>
          <View><T style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Repaid</T><T style={{ color: '#fff', fontFamily: F.bold }}>{p.repaidPct}%</T></View>
        </View>
      </DarkCard>
      <Card style={{ marginTop: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}><T style={{ fontFamily: F.semi }}>Monthly returns</T><Muted>12 months</Muted></View>
        <Returns months={p.months} />
      </Card>
      {p.broadcasts?.[0] ? <><Section>Latest update</Section><Card pad={false}><Row first icon="mega" title={p.broadcasts[0].is_opportunity ? 'New opportunity' : 'Partner update'} sub={p.broadcasts[0].body} onPress={() => go('updates')} /></Card></> : null}
    </View>
  )
}

export function PartnerInvestments({ data }: ScreenProps) {
  const p = data?.partner
  return (
    <View>
      <Header title="Investments" />
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Muted>Repaid so far</Muted><T style={{ fontFamily: F.bold }}>{money(p?.returned)} of {money(p?.invested)}</T></View>
        <View style={{ height: 8, backgroundColor: '#f0ede6', borderRadius: 4, marginTop: 10, overflow: 'hidden' }}><View style={{ height: 8, width: `${Math.min(100, p?.repaidPct ?? 0)}%`, backgroundColor: '#B08A2E' }} /></View>
        <Muted style={{ marginTop: 8 }}>{money(p?.outstanding)} still to be returned</Muted>
      </Card>
      <Section>Properties</Section>
      <Card pad={false}>{p?.properties?.length ? p.properties.map((x: any, i: number) => (
        <View key={x.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: C.line2 }}>
          {x.image_url ? <Image source={{ uri: x.image_url }} style={{ width: 44, height: 44, borderRadius: 10 }} contentFit="cover" /> : <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: C.cream }} />}
          <View style={{ flex: 1 }}><T style={{ fontFamily: F.semi }}>{x.name}</T><Muted>{[x.city, x.country].filter(Boolean).join(', ') || 'Live'}</Muted></View>
        </View>
      )) : <Empty title="No properties linked yet" />}</Card>
    </View>
  )
}

export function PartnerUpdates({ data }: ScreenProps) {
  const list = data?.partner?.broadcasts ?? []
  return (
    <View>
      <Header title="Updates" />
      {list.length ? list.map((b: any) => (
        <Card key={b.id} style={{ marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T style={{ fontFamily: F.bold }}>{b.is_opportunity ? 'New opportunity' : 'Update'}</T><Muted>{day(b.created_at, { day: 'numeric', month: 'short' })}</Muted></View>
          {b.image_urls?.[0] ? <Image source={{ uri: b.image_urls[0] }} style={{ height: 160, borderRadius: 10, marginTop: 10 }} contentFit="cover" /> : null}
          <T style={{ color: C.ink2, marginTop: 8, lineHeight: 20 }}>{b.body}</T>
          {!!b.author_name && <Muted style={{ marginTop: 8 }}>{b.author_name}</Muted>}
        </Card>
      )) : <Card><Empty title="No updates yet" sub="New opportunities and partner news appear here." /></Card>}
    </View>
  )
}
