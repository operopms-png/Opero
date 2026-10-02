import { Redirect } from 'expo-router'
import { View, ActivityIndicator } from 'react-native'
import { useAuth } from '@/lib/auth'
import { C } from '@/lib/theme'

export default function Index() {
  const { session, ready } = useAuth()
  if (!ready) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={C.goldDark} /></View>
  return <Redirect href={session ? '/home' : '/welcome'} />
}
