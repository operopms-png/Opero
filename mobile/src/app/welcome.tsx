import { View, Pressable, StyleSheet } from 'react-native'
import { Image } from 'expo-image'
import { StatusBar } from 'expo-status-bar'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { T, Button } from '@/components/ui'
import { F } from '@/lib/theme'

// Full-photo welcome screen (pool at Rose Hall), logo and the brand line.
export default function Welcome() {
  const insets = useSafeAreaInsets()
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar style="light" />
      <Image source={require('../../assets/images/pool.jpg')} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="top" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(25,24,21,0.25)' }]} />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%', backgroundColor: 'transparent' }}>
        {/* gradient made of stacked bands keeps this dependency-free */}
        {Array.from({ length: 12 }).map((_, i) => <View key={i} style={{ flex: 1, backgroundColor: `rgba(25,24,21,${(i / 11) * 0.85})` }} />)}
      </View>
      <View style={{ position: 'absolute', left: 24, right: 24, bottom: insets.bottom + 28, alignItems: 'center' }}>
        <Image source={require('../../assets/images/logo.png')} style={{ width: 68, height: 68, borderRadius: 15 }} />
        <T style={{ color: '#fff', fontFamily: F.head, fontSize: 28, lineHeight: 33, textAlign: 'center', marginTop: 18 }}>Your stay. Your home.{'\n'}Your property.</T>
        <T style={{ color: 'rgba(255,255,255,0.82)', fontSize: 14, marginTop: 10, textAlign: 'center' }}>For our guests, tenants, owners and partners</T>
        <Button title="Get started" kind="gold" style={{ alignSelf: 'stretch', marginTop: 26 }} onPress={() => router.push('/sign-in')} />
        <Pressable onPress={() => router.push('/sign-in')} style={{ marginTop: 16, padding: 4 }}>
          <T style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13.5 }}>Already have an account? <T style={{ color: '#fff', fontFamily: F.bold, fontSize: 13.5 }}>Sign in</T></T>
        </Pressable>
      </View>
    </View>
  )
}
