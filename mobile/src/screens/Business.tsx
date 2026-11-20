import { View } from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import { T, Muted, Card, Row, Section, Header, Empty, Pill, Stat, Button, type ScreenProps } from '@/components/ui'
import Icon from '@/components/Icon'
import { C, F, day } from '@/lib/theme'
import { PORTAL_URL } from '@/lib/config'

const when = (d: string) => day(d, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

// NOVOURQ Cloud AI for a company: what the AI did, what is waiting for a person. Approving
// happens in the portal (Novourq Cloud AI, Approvals) so nothing is sent from a phone by accident.
export function BusinessHome({ data, name, go }: ScreenProps) {
  const c = data?.counts ?? { actions7: 0, chats7: 0, waiting: 0, followUp: 0 }
  return (
    <View>
      <Header small="NOVOURQ Cloud AI" title={name ? `Hello, ${name}` : 'Hello'} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Stat label="Chats handled (7 days)" value={c.chats7} /><Stat label="AI actions (7 days)" value={c.actions7} /><Stat label="Waiting for you" value={c.waiting} highlight />
      </View>
      {c.followUp ? <Card style={{ marginTop: 12 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Icon name="bell" size={20} color={C.red} /><T style={{ flex: 1, fontFamily: F.semi }}>{c.followUp} customer chat{c.followUp === 1 ? '' : 's'} need{c.followUp === 1 ? 's' : ''} a person to follow up</T></View></Card> : null}
      <Section>Waiting for you</Section>
      <Card pad={false}>{data?.pending?.length ? data.pending.slice(0, 4).map((p: any, i: number) => <Row key={p.id} first={i === 0} icon="check" title={p.title || p.action_type} sub={[p.property_name, when(p.created_at)].filter(Boolean).join(' · ')} right={p.status === 'failed' ? <Pill tone="red">Failed</Pill> : undefined} onPress={() => go('approvals')} />) : <Empty title="Nothing waiting" sub="Anything that needs a person to approve appears here." />}</Card>
      <Section>Latest AI activity</Section>
      <Card pad={false}>{data?.activity?.length ? data.activity.slice(0, 5).map((a: any, i: number) => <Row key={a.id} first={i === 0} icon="msg" title={a.title} sub={[a.sub, when(a.at)].filter(Boolean).join(' · ')} right={a.flag ? <Pill tone="red">Follow up</Pill> : undefined} onPress={() => go('activity')} />) : <Empty title="No AI activity yet" />}</Card>
      <Button title="Open Novourq Cloud AI" kind="outline" icon={<Icon name="portal" size={18} />} style={{ marginTop: 16 }} onPress={() => WebBrowser.openBrowserAsync(`${PORTAL_URL}/staff-centre/ai-approvals`)} />
    </View>
  )
}

export function BusinessApprovals({ data }: ScreenProps) {
  const list = data?.pending ?? []
  return (
    <View>
      <Header title="Approvals" />
      <Card pad={false}>{list.length ? list.map((p: any, i: number) => (
        <View key={p.id} style={{ padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: C.line2 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}><T style={{ fontFamily: F.bold, flex: 1 }}>{p.title || p.action_type}</T>{p.status === 'failed' ? <Pill tone="red">Failed</Pill> : <Pill tone="amber">Waiting</Pill>}</View>
          <Muted style={{ marginTop: 2 }}>{[p.property_name, when(p.created_at)].filter(Boolean).join(' · ')}</Muted>
          {p.draft_body ? <T numberOfLines={4} style={{ color: C.ink2, marginTop: 8, lineHeight: 20 }}>{String(p.draft_body)}</T> : null}
        </View>
      )) : <Empty title="Nothing waiting" sub="Anything that needs a person to approve appears here." />}</Card>
      <Button title="Approve in the portal" kind="dark" style={{ marginTop: 16 }} onPress={() => WebBrowser.openBrowserAsync(`${PORTAL_URL}/staff-centre/ai-approvals`)} />
      <Muted style={{ textAlign: 'center', marginTop: 10 }}>Anything that sends money or a contract is always approved by a person in the portal.</Muted>
    </View>
  )
}

export function BusinessActivity({ data }: ScreenProps) {
  const list = data?.activity ?? []
  return (
    <View>
      <Header title="AI activity" />
      <Card pad={false}>{list.length ? list.map((a: any, i: number) => <Row key={a.id} first={i === 0} icon="msg" title={a.title} sub={[a.sub, when(a.at)].filter(Boolean).join(' · ')} right={a.flag ? <Pill tone="red">Follow up</Pill> : undefined} />) : <Empty title="No AI activity yet" />}</Card>
    </View>
  )
}
