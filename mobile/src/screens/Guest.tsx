import { View, Linking, Platform } from 'react-native'
import { Image } from 'expo-image'
import * as Clipboard from 'expo-clipboard'
import * as WebBrowser from 'expo-web-browser'
import { useState } from 'react'
import { T, Muted, Card, Row, Section, Header, Empty, Button, type ScreenProps } from '@/components/ui'

import { C, F, day } from '@/lib/theme'
import { WEBSITE_URL } from '@/lib/config'

// Guest: the next stay — dates, arrival, Wi-Fi, directions, house guide.
export function GuestHome({ data, name, go }: ScreenProps) {
  const stay = data?.stay
  const p = stay?.property
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  if (!stay) return (
    <View>
      <Header small="Your stay" title={name ? `Hello, ${name}` : 'Hello'} />
      <Card><Empty title="No upcoming stays" sub="When you book with us, your stay details appear here: dates, Wi-Fi, directions and the house guide." /></Card>
      <Button title="Find a place to stay" kind="dark" style={{ marginTop: 14 }} onPress={() => WebBrowser.openBrowserAsync(WEBSITE_URL)} />
      {data?.past?.length ? <><Section>Past stays</Section><Card pad={false}>{data.past.map((b: any, i: number) => <Row key={b.id} first={i === 0} icon="cal" title={b.property?.name ?? 'Stay'} sub={`${day(b.check_in)} – ${day(b.check_out)}`} />)}</Card></> : null}
    </View>
  )
  const addr = [p?.address, p?.city, p?.country].filter(Boolean).join(', ')
  const maps = () => { const q = encodeURIComponent(addr || p?.name || ''); Linking.openURL(Platform.OS === 'ios' ? `http://maps.apple.com/?q=${q}` : `https://www.google.com/maps/search/?api=1&query=${q}`) }
  const copyWifi = async () => { if (p?.wifi_password) { await Clipboard.setStringAsync(p.wifi_password); setCopied(true); setTimeout(() => setCopied(false), 2000) } }
  const guide = [
    p?.checkin_instructions && ['Arrival', p.checkin_instructions],
    p?.house_rules && ['House rules', p.house_rules],
    p?.checkout_instructions && ['Check-out', p.checkout_instructions],
  ].filter(Boolean) as [string, string][]
  return (
    <View>
      <Header small="Your stay" title={name ? `Hello, ${name}` : 'Hello'} />
      <Card pad={false} style={{ overflow: 'hidden', paddingHorizontal: 0 }}>
        {p?.image_url ? <Image source={{ uri: p.image_url }} style={{ height: 150 }} contentFit="cover" /> : <View style={{ height: 8 }} />}
        <View style={{ padding: 14 }}>
          <T style={{ fontFamily: F.bold, fontSize: 16 }}>{p?.name ?? 'Your stay'}</T>
          {!!addr && <Muted>{addr}</Muted>}
          <View style={{ flexDirection: 'row', marginTop: 12, borderTopWidth: 1, borderTopColor: C.line2, paddingTop: 12 }}>
            <View style={{ flex: 1 }}><Muted style={{ fontSize: 11.5 }}>Check-in</Muted><T style={{ fontFamily: F.bold }}>{day(stay.check_in)}</T></View>
            <View style={{ flex: 1, borderLeftWidth: 1, borderLeftColor: C.line2, paddingLeft: 12 }}><Muted style={{ fontSize: 11.5 }}>Check-out</Muted><T style={{ fontFamily: F.bold }}>{day(stay.check_out)}</T></View>
          </View>
        </View>
      </Card>
      <Card pad={false} style={{ marginTop: 12 }}>
        {p?.wifi_name || p?.wifi_password ? <Row first icon="wifi" title={`Wi-Fi${p.wifi_name ? ` · ${p.wifi_name}` : ''}`} sub={copied ? 'Password copied' : p.wifi_password ? 'Tap to copy password' : 'Ask our team for the password'} onPress={copyWifi} /> : null}
        <Row first={!(p?.wifi_name || p?.wifi_password)} icon="pin" title="Directions" sub="Open in Maps" onPress={maps} />
        <Row icon="book" title="House guide" sub={guide.length ? guide.map(g => g[0]).join(', ') : 'Arrival, rules and check-out'} onPress={() => setOpen(open ? null : 'guide')} />
        <Row icon="msg" title="Message us" sub="Our team replies fast" onPress={() => go('messages')} />
      </Card>
      {open === 'guide' && (
        <Card style={{ marginTop: 12 }}>
          {guide.length ? guide.map(([t, body], i) => <View key={t} style={{ marginTop: i ? 14 : 0 }}><T style={{ fontFamily: F.bold }}>{t}</T><T style={{ color: C.ink2, marginTop: 4, lineHeight: 20 }}>{body}</T></View>)
            : <Muted>The house guide for this home is being prepared. Message us with any questions.</Muted>}
        </Card>
      )}
      {data.upcoming?.length ? <><Section>Also booked</Section><Card pad={false}>{data.upcoming.map((b: any, i: number) => <Row key={b.id} first={i === 0} icon="cal" title={b.property?.name ?? 'Stay'} sub={`${day(b.check_in)} – ${day(b.check_out)}`} />)}</Card></> : null}
    </View>
  )
}
