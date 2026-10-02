import { useState } from 'react'
import { View, Linking, Pressable } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { T, Muted, Card, Row, Section, Header, Empty, Button, Field, ErrorText, Pill, DarkCard, type ScreenProps } from '@/components/ui'
import { api } from '@/lib/api'
import { C, F, money, day } from '@/lib/theme'
import { PORTAL_URL } from '@/lib/config'

const statusTone = (s: string) => /done|complete|closed|resolved/i.test(s) ? 'green' : /progress|assigned|scheduled/i.test(s) ? 'blue' : 'amber'

// Tenant: next rent, repairs, lease, documents, Wi-Fi and bins.
export function TenantHome({ data, name, go }: ScreenProps) {
  const [copied, setCopied] = useState(false)
  if (!data?.tenant) return <View><Header small="My home" title={name ? `Hello, ${name}` : 'Hello'} /><Card><Empty title="No tenancy found" sub="Ask our team to link your tenancy to this email address." /></Card></View>
  const p = data.property, due = data.nextDue, lease = data.lease
  const where = [p?.name, p?.city].filter(Boolean).join(', ')
  return (
    <View>
      <Header small="My home" title={name ? `Hello, ${name}` : 'Hello'} />
      {!!where && <Muted style={{ marginTop: -10, marginBottom: 14 }}>{where}{data.unit?.unit_number ? ` · Unit ${data.unit.unit_number}` : ''}</Muted>}
      {due ? (
        <DarkCard label={`${due.overdue ? 'Overdue since' : 'Next rent due'} · ${day(due.due_date, { day: 'numeric', month: 'long' })}`} value={money(due.amount)}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
            <T style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12.5 }}>{data.lastPaid ? `Last paid ${day(data.lastPaid.paid_date || data.lastPaid.due_date, { day: 'numeric', month: 'short' })}` : 'Pay by card or bank transfer'}</T>
            <Pressable onPress={() => go('payments')} style={{ backgroundColor: C.gold, borderRadius: 9, paddingHorizontal: 14, paddingVertical: 8 }}><T style={{ fontFamily: F.bold, fontSize: 13 }}>Pay now</T></Pressable>
          </View>
        </DarkCard>
      ) : null}
      <Card pad={false} style={{ marginTop: 12 }}>
        <Row first icon="tool" title="Report a repair" sub="Add details, track progress" onPress={() => go('repairs')} />
        <Row icon="doc" title="My lease" sub={lease ? `${day(lease.start_date, { day: 'numeric', month: 'short', year: 'numeric' })} – ${day(lease.end_date, { day: 'numeric', month: 'short', year: 'numeric' })}` : 'No lease on file yet'} onPress={lease?.signed_document_url || lease?.document_url ? () => Linking.openURL(lease.signed_document_url || lease.document_url) : undefined} />
        <Row icon="book" title="Documents" sub={data.documents?.length ? `${data.documents.length} document${data.documents.length === 1 ? '' : 's'}` : 'None yet'} onPress={() => go('payments')} />
        {(p?.wifi_ssid || p?.bin_collection_notes) ? <Row icon="wifi" title="Wi-Fi and bins" sub={[p?.wifi_ssid && `Wi-Fi ${p.wifi_ssid}${copied ? ' (password copied)' : ''}`, p?.bin_collection_notes].filter(Boolean).join(' · ')} onPress={p?.wifi_password ? async () => { await Clipboard.setStringAsync(p.wifi_password); setCopied(true) } : undefined} /> : null}
      </Card>
      {data.repairs?.length ? <><Section>Recent repairs</Section><Card pad={false}>{data.repairs.slice(0, 3).map((r: any, i: number) => <Row key={r.id} first={i === 0} icon="tool" title={r.title} sub={day(r.created_at, { day: 'numeric', month: 'short' })} right={<Pill tone={statusTone(r.status) as any}>{r.status}</Pill>} />)}</Card></> : null}
    </View>
  )
}

export function TenantPayments({ data }: ScreenProps) {
  const payments = data?.payments ?? []
  return (
    <View>
      <Header title="Payments" />
      {data?.nextDue ? <DarkCard label={`Next rent due · ${day(data.nextDue.due_date, { day: 'numeric', month: 'long' })}`} value={money(data.nextDue.amount)}>
        <Button title="Pay rent" kind="gold" style={{ marginTop: 14 }} onPress={() => Linking.openURL(`${PORTAL_URL}/pm-tenant-portal`)} />
      </DarkCard> : null}
      <Section>History</Section>
      <Card pad={false}>{payments.length ? payments.map((p: any, i: number) => <Row key={p.id} first={i === 0} icon="card" title={money(p.amount)} sub={`Due ${day(p.due_date, { day: 'numeric', month: 'short', year: 'numeric' })}${p.paid_date ? ` · paid ${day(p.paid_date, { day: 'numeric', month: 'short' })}` : ''}`} right={<Pill tone={p.paid_date || p.status === 'paid' ? 'green' : p.due_date < new Date().toISOString().slice(0, 10) ? 'red' : 'amber'}>{p.paid_date || p.status === 'paid' ? 'Paid' : 'Due'}</Pill>} />) : <Empty title="No payments yet" />}</Card>
      <Section>Documents</Section>
      <Card pad={false}>{data?.documents?.length ? data.documents.map((d: any, i: number) => <Row key={d.id} first={i === 0} icon="doc" title={d.name || 'Document'} sub={d.category || day(d.created_at, { day: 'numeric', month: 'short', year: 'numeric' })} onPress={(d.file_url || d.url) ? () => Linking.openURL(d.file_url || d.url) : undefined} />) : <Empty title="No documents yet" />}</Card>
    </View>
  )
}

export function TenantRepairs({ data, reload }: ScreenProps) {
  const [title, setTitle] = useState(''), [desc, setDesc] = useState('')
  const [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null), [ok, setOk] = useState(false)
  async function send() {
    setErr(null); setOk(false)
    if (!title.trim()) { setErr('Please say what needs fixing.'); return }
    setBusy(true)
    try { await api.post({ action: 'repair', title, description: desc }); setTitle(''); setDesc(''); setOk(true); reload() } catch (x: any) { setErr(x.message) } finally { setBusy(false) }
  }
  return (
    <View>
      <Header title="Repairs" />
      <Card>
        <T style={{ fontFamily: F.bold, fontSize: 15, marginBottom: 12 }}>Report a repair</T>
        <View style={{ gap: 12 }}>
          <Field placeholder="What needs fixing? e.g. Leaking kitchen tap" value={title} onChangeText={setTitle} />
          <Field placeholder="Any details that help (where, since when)" value={desc} onChangeText={setDesc} multiline style={{ minHeight: 90, textAlignVertical: 'top' }} />
        </View>
        <ErrorText>{err}</ErrorText>
        {ok && <T style={{ color: C.green, marginTop: 10, fontSize: 13 }}>Thank you. Our team has your request.</T>}
        <Button title="Send request" onPress={send} loading={busy} style={{ marginTop: 14 }} />
      </Card>
      <Section>Your requests</Section>
      <Card pad={false}>{data?.repairs?.length ? data.repairs.map((r: any, i: number) => <Row key={r.id} first={i === 0} icon="tool" title={r.title} sub={`${day(r.created_at, { day: 'numeric', month: 'short' })}${r.description ? ` · ${r.description}` : ''}`} right={<Pill tone={statusTone(r.status) as any}>{r.status}</Pill>} />) : <Empty title="No repairs reported" />}</Card>
    </View>
  )
}
