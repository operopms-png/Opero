import { useState } from 'react'
import { View, Alert, Platform, Linking } from 'react-native'
import { router } from 'expo-router'
import { T, Muted, Card, Row, Section, Header, ErrorText, Pill } from '@/components/ui'
import { api, ROLE_LABEL, type Role } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { PORTAL_URL } from '@/lib/config'
import { C, F } from '@/lib/theme'

const confirm = (title: string, msg: string, ok: string): Promise<boolean> => new Promise(res => {
  if (Platform.OS === 'web') { res(typeof window !== 'undefined' && window.confirm(`${title}\n\n${msg}`)); return }
  Alert.alert(title, msg, [{ text: 'Cancel', style: 'cancel', onPress: () => res(false) }, { text: ok, style: 'destructive', onPress: () => res(true) }])
})

// Account: switch view (when someone is e.g. both owner and partner), sign out, delete account.
export function Account({ data, role, onSwitch }: { data: any; role: Role; onSwitch: (r: Role) => void }) {
  const [err, setErr] = useState<string | null>(null)
  async function signOut() { await supabase.auth.signOut(); router.replace('/welcome') }
  async function del() {
    if (!(await confirm('Delete your account?', 'This removes your app login. Your bookings, tenancy and statements stay on file with our team. This cannot be undone.', 'Delete'))) return
    try { await api.post({ action: 'delete-account' }); await supabase.auth.signOut(); router.replace('/welcome') } catch (x: any) { setErr(x.message) }
  }
  return (
    <View>
      <Header title="Account" />
      <Card>
        <T style={{ fontFamily: F.bold, fontSize: 16 }}>{data.name || 'Your account'}</T>
        <Muted style={{ marginTop: 2 }}>{data.email}</Muted>
        <View style={{ flexDirection: 'row', marginTop: 10 }}><Pill tone="gold">{ROLE_LABEL[role]}</Pill></View>
      </Card>
      {data.roles.length > 1 ? <>
        <Section>Switch view</Section>
        <Card pad={false}>{data.roles.map((r: Role, i: number) => <Row key={r} first={i === 0} icon="swap" title={ROLE_LABEL[r]} sub={r === role ? 'Current view' : undefined} chevron={r !== role} onPress={r === role ? undefined : () => onSwitch(r)} />)}</Card>
      </> : null}
      <Section>More</Section>
      <Card pad={false}>
        <Row first icon="doc" title="Privacy policy" onPress={() => Linking.openURL(`${PORTAL_URL}/privacy`)} />
        <Row icon="logout" title="Sign out" onPress={signOut} />
        <Row icon="trash" title="Delete my account" sub="Removes your app login" onPress={del} />
      </Card>
      <ErrorText>{err}</ErrorText>
      <Muted style={{ textAlign: 'center', marginTop: 20, color: C.faint }}>Sangsters · version 1.0.0</Muted>
    </View>
  )
}
