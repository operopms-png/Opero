import { View, Pressable } from 'react-native'
import { Image } from 'expo-image'
import { StatusBar } from 'expo-status-bar'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { T, Button } from '@/components/ui'
import { F } from '@/lib/theme'

// NOVOURQ navy welcome screen: logo and the brand line.
export default function Welcome() {
  const insets = useSafeAreaInsets()
  return (
    <View style={{ flex: 1, backgroundColor: '#1B2F6E' }}>
      <StatusBar style="light" />
      <View style={{ position: 'absolute', left: 24, right: 24, bottom: insets.bottom + 28, alignItems: 'center' }}>
        <Image source={require('../../assets/images/logo.png')} style={{ width: 68, height: 68, borderRadius: 15 }} />
        <T style={{ color: '#fff', fontFamily: F.head, fontSize: 28, lineHeight: 33, textAlign: 'center', marginTop: 18 }}>Your property,{'\n'}in your hands.</T>
        <T style={{ color: 'rgba(255,255,255,0.82)', fontSize: 14, marginTop: 10, textAlign: 'center' }}>For guests, tenants, landlords, co-hosts, partners and teams</T>
        <Button title="Get started" kind="gold" style={{ alignSelf: 'stretch', marginTop: 26 }} onPress={() => router.push('/sign-in')} />
        <Pressable onPress={() => router.push('/sign-in')} style={{ marginTop: 16, padding: 4 }}>
          <T style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13.5 }}>Already have an account? <T style={{ color: '#fff', fontFamily: F.bold, fontSize: 13.5 }}>Sign in</T></T>
        </Pressable>
      </View>
    </View>
  )
}
