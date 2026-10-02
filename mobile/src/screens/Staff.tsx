import { View, Pressable } from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import { Muted, Card, Row, Section, Header, Empty, Pill, Stat, Button, type ScreenProps } from '@/components/ui'
import Icon, { type IconName } from '@/components/Icon'
import { C, day } from '@/lib/theme'
import { PORTAL_URL } from '@/lib/config'

const KIND: Record<string, IconName> = { checkin: 'in', checkout: 'out', clean: 'brush', repair: 'tool' }
const tone = (s: string) => /done|complete|closed/i.test(s) ? 'green' : s === 'today' ? 'blue' : /urgent|high|new|open/i.test(s) ? 'red' : 'amber'
const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening' }

// Staff: today's check-ins/outs, cleans, repairs and enquiries, plus the full portal.
export function StaffToday({ data, name, go }: ScreenProps) {
  const c = data?.counts ?? { checkins: 0, checkouts: 0, open: 0 }
  return (
    <View>
      <Header small={day(new Date().toISOString(), { weekday: 'long', day: 'numeric', month: 'long' })} title={`${greet()}${name ? `, ${name}` : ''}`}
        right={<Pressable onPress={() => go('enquiries')} style={{ padding: 4 }}><Icon name="bell" size={23} />{data?.enquiries?.some((e: any) => !e.read) ? <View style={{ position: 'absolute', right: 3, top: 3, width: 8, height: 8, borderRadius: 4, backgroundColor: C.red }} /> : null}</Pressable>} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Stat label="Check-ins" value={c.checkins} /><Stat label="Check-outs" value={c.checkouts} /><Stat label="Open tasks" value={c.open} highlight />
      </View>
      <Section>Today</Section>
      <Card pad={false}>{data?.tasks?.length ? data.tasks.slice(0, 6).map((t: any, i: number) => <Row key={t.id} first={i === 0} icon={KIND[t.kind] ?? 'check'} title={t.title} sub={t.sub} right={<Pill tone={tone(t.status) as any}>{t.status === 'today' ? 'Today' : t.status}</Pill>} />) : <Empty title="Nothing scheduled today" />}</Card>
      <Section>Inbox</Section>
      <Card pad={false}>{data?.enquiries?.length ? data.enquiries.slice(0, 3).map((e: any, i: number) => <Row key={e.id} first={i === 0} icon="msg" title={e.title} sub={day(e.created_at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} onPress={() => go('enquiries')} />) : <Empty title="No new enquiries" />}</Card>
      <Button title="Open full portal" kind="outline" icon={<Icon name="portal" size={18} />} style={{ marginTop: 16 }} onPress={() => WebBrowser.openBrowserAsync(`${PORTAL_URL}/staff-centre`)} />
    </View>
  )
}

export function StaffTasks({ data }: ScreenProps) {
  const groups: [string, string[]][] = [['Check-ins and check-outs', ['checkin', 'checkout']], ['Cleaning', ['clean']], ['Repairs', ['repair']]]
  return (
    <View>
      <Header title="Tasks" />
      {groups.map(([label, kinds]) => {
        const list = (data?.tasks ?? []).filter((t: any) => kinds.includes(t.kind))
        return <View key={label}><Section>{label}</Section><Card pad={false}>{list.length ? list.map((t: any, i: number) => <Row key={t.id} first={i === 0} icon={KIND[t.kind] ?? 'check'} title={t.title} sub={t.sub} right={<Pill tone={tone(t.status) as any}>{t.status === 'today' ? 'Today' : t.status}</Pill>} />) : <Empty title="None" />}</Card></View>
      })}
      <Muted style={{ textAlign: 'center', marginTop: 16 }}>Update tasks in the portal. Changes show here when you pull to refresh.</Muted>
    </View>
  )
}

export function StaffEnquiries({ data }: ScreenProps) {
  const list = data?.enquiries ?? []
  return (
    <View>
      <Header title="Enquiries" />
      <Card pad={false}>{list.length ? list.map((e: any, i: number) => <Row key={e.id} first={i === 0} icon="mail" title={e.title} sub={`${day(e.created_at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}${e.message ? ` · ${String(e.message).split('\n')[0]}` : ''}`} onPress={() => WebBrowser.openBrowserAsync(PORTAL_URL + (e.link || '/staff-centre/crm'))} />) : <Empty title="No enquiries yet" />}</Card>
    </View>
  )
}
