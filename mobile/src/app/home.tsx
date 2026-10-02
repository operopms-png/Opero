import { useCallback, useEffect, useState } from 'react'
import { View, Pressable, ScrollView, RefreshControl, ActivityIndicator } from 'react-native'
import { Redirect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as WebBrowser from 'expo-web-browser'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { T, H, Button, ErrorText } from '@/components/ui'
import Icon, { type IconName } from '@/components/Icon'
import { api, type Role } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { C, F } from '@/lib/theme'
import { PORTAL_URL, WEBSITE_URL } from '@/lib/config'
import { GuestHome } from '@/screens/Guest'
import { TenantHome, TenantPayments, TenantRepairs } from '@/screens/Tenant'
import { OwnerHome, OwnerStatements, OwnerMaintenance } from '@/screens/Owner'
import { PartnerHome, PartnerInvestments, PartnerUpdates } from '@/screens/Partner'
import { StaffToday, StaffTasks, StaffEnquiries } from '@/screens/Staff'
import { Messages } from '@/screens/Messages'
import { Account } from '@/screens/Account'

type Tab = { key: string; label: string; icon: IconName; link?: string }
const TABS: Record<Role, Tab[]> = {
  guest: [{ key: 'home', label: 'My stay', icon: 'cal' }, { key: 'explore', label: 'Explore', icon: 'search', link: `${WEBSITE_URL}` }, { key: 'messages', label: 'Messages', icon: 'msg' }, { key: 'account', label: 'Account', icon: 'user' }],
  tenant: [{ key: 'home', label: 'My home', icon: 'home' }, { key: 'payments', label: 'Payments', icon: 'card' }, { key: 'repairs', label: 'Repairs', icon: 'tool' }, { key: 'messages', label: 'Messages', icon: 'msg' }, { key: 'account', label: 'Account', icon: 'user' }],
  owner: [{ key: 'home', label: 'Overview', icon: 'chart' }, { key: 'statements', label: 'Statements', icon: 'doc' }, { key: 'maintenance', label: 'Maintenance', icon: 'tool' }, { key: 'messages', label: 'Messages', icon: 'msg' }, { key: 'account', label: 'Account', icon: 'user' }],
  partner: [{ key: 'home', label: 'Overview', icon: 'chart' }, { key: 'investments', label: 'Investments', icon: 'home' }, { key: 'updates', label: 'Updates', icon: 'mega' }, { key: 'messages', label: 'Messages', icon: 'msg' }, { key: 'account', label: 'Account', icon: 'user' }],
  staff: [{ key: 'home', label: 'Today', icon: 'grid' }, { key: 'tasks', label: 'Tasks', icon: 'check' }, { key: 'enquiries', label: 'Enquiries', icon: 'mail' }, { key: 'portal', label: 'Portal', icon: 'portal', link: PORTAL_URL + '/staff-centre' }, { key: 'account', label: 'Account', icon: 'user' }],
}
const ROLE_KEY = 'sangsters.role'

export default function Home() {
  const { session, ready } = useAuth()
  const insets = useSafeAreaInsets()
  const [data, setData] = useState<any>(null)
  const [role, setRole] = useState<Role | null>(null)
  const [tab, setTab] = useState('home')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async (want?: Role | null) => {
    setErr(null)
    try {
      const saved = want ?? ((await AsyncStorage.getItem(ROLE_KEY).catch(() => null)) as Role | null)
      const d = await api.home(saved ?? undefined)
      setData(d); setRole(d.role)
    } catch (x: any) { setErr(x.message) }
    finally { setLoading(false); setRefreshing(false) }
  }, [])
  useEffect(() => { if (session) load() }, [session, load])

  if (ready && !session) return <Redirect href="/welcome" />
  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}><ActivityIndicator color={C.goldDark} /></View>
  if (err || !data || !role) return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' }}>
      <H>We could not load your account</H><ErrorText>{err}</ErrorText>
      <Button title="Try again" onPress={() => { setLoading(true); load() }} style={{ marginTop: 18 }} />
    </View>
  )

  const switchRole = async (r: Role) => { await AsyncStorage.setItem(ROLE_KEY, r).catch(() => {}); setLoading(true); setTab('home'); load(r) }
  const h = data.home
  const first = String(data.name || '').split(' ')[0]
  const props = { data: h, name: first, role, reload: () => load(role), go: setTab }
  const screen = (() => {
    if (tab === 'account') return <Account data={data} role={role} onSwitch={switchRole} />
    if (tab === 'messages') return <Messages role={role} />
    switch (role) {
      case 'guest': return <GuestHome {...props} />
      case 'tenant': return tab === 'payments' ? <TenantPayments {...props} /> : tab === 'repairs' ? <TenantRepairs {...props} /> : <TenantHome {...props} />
      case 'owner': return tab === 'statements' ? <OwnerStatements {...props} /> : tab === 'maintenance' ? <OwnerMaintenance {...props} /> : <OwnerHome {...props} />
      case 'partner': return tab === 'investments' ? <PartnerInvestments {...props} /> : tab === 'updates' ? <PartnerUpdates {...props} /> : <PartnerHome {...props} />
      case 'staff': return tab === 'tasks' ? <StaffTasks {...props} /> : tab === 'enquiries' ? <StaffEnquiries {...props} /> : <StaffToday {...props} />
    }
  })()
  const scrolls = tab !== 'messages'

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ flex: 1, paddingTop: insets.top }}>
        {scrolls ? (
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(role) }} tintColor={C.goldDark} />}>
            {screen}
          </ScrollView>
        ) : screen}
      </View>
      <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.line, paddingTop: 9, paddingBottom: Math.max(insets.bottom, 10), backgroundColor: '#fff' }}>
        {TABS[role].map(t => {
          const on = tab === t.key
          return (
            <Pressable key={t.key} onPress={() => t.link ? WebBrowser.openBrowserAsync(t.link) : setTab(t.key)} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
              <Icon name={t.icon} size={22} color={on ? C.ink : C.faint} />
              <T style={{ fontSize: 10.5, color: on ? C.ink : C.faint, fontFamily: on ? F.bold : F.medium }}>{t.label}</T>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}
