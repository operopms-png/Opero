import { useEffect, useState } from 'react'
import { View, Pressable, StyleSheet, Platform, KeyboardAvoidingView, ScrollView } from 'react-native'
import { Image } from 'expo-image'
import { StatusBar } from 'expo-status-bar'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as AppleAuthentication from 'expo-apple-authentication'
import * as Crypto from 'expo-crypto'
import { T, H, Muted, Button, Field, ErrorText } from '@/components/ui'
import Icon from '@/components/Icon'
import { api } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { C, F } from '@/lib/theme'

// One sign-in for everyone. Email code by default; Apple on iPhone; password for staff.
export default function SignIn() {
  const insets = useSafeAreaInsets()
  const { staff } = useLocalSearchParams<{ staff?: string }>()
  const isStaff = staff === '1'
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [apple, setApple] = useState(false)
  useEffect(() => { if (Platform.OS === 'ios') AppleAuthentication.isAvailableAsync().then(setApple).catch(() => {}) }, [])

  async function sendCode() {
    setErr(null)
    const e = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { setErr('Please enter a valid email address.'); return }
    if (isStaff) { router.push({ pathname: '/password', params: { email: e } }); return }
    setBusy(true)
    try { await api.sendCode(e); router.push({ pathname: '/code', params: { email: e } }) }
    catch (x: any) { setErr(x.message) }
    finally { setBusy(false) }
  }

  async function signInWithApple() {
    setErr(null)
    try {
      const raw = Crypto.randomUUID()
      const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw)
      const cred = await AppleAuthentication.signInAsync({ requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL], nonce: hashed })
      if (!cred.identityToken) throw new Error('Apple did not return a sign-in token.')
      const { error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: cred.identityToken, nonce: raw })
      if (error) throw error
      router.replace('/home')
    } catch (x: any) {
      if (x?.code === 'ERR_REQUEST_CANCELED') return
      setErr(x?.message || 'Apple sign-in did not work. Please use your email instead.')
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar style="light" />
      <Image source={require('../../assets/images/pool.jpg')} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="top" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(25,24,21,0.38)' }]} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 14, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} style={{ position: 'absolute', top: insets.top + 8, left: 14, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="back" size={20} />
          </Pressable>
          <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 22 }}>
            <Image source={require('../../assets/images/logo.png')} style={{ width: 42, height: 42, borderRadius: 10 }} />
            <H size={26} style={{ marginTop: 14 }}>{isStaff ? 'Staff sign in' : 'Welcome to Sangsters'}</H>
            <Muted style={{ fontSize: 14, marginTop: 5 }}>{isStaff ? 'Use your portal email and password' : 'Sign in to your account'}</Muted>

            {!isStaff && apple && (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={12} style={{ height: 50, marginTop: 20 }} onPress={signInWithApple} />
            )}
            {!isStaff && apple && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 16 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: C.line }} /><T style={{ color: C.faint, fontSize: 11.5, fontFamily: F.semi, letterSpacing: 1.2 }}>OR</T><View style={{ flex: 1, height: 1, backgroundColor: C.line }} />
              </View>
            )}
            <View style={{ marginTop: !isStaff && apple ? 0 : 20 }}>
              <Field label="Email" value={email} onChangeText={setEmail} placeholder="Enter your email address" autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" returnKeyType="go" onSubmitEditing={sendCode} />
            </View>
            <ErrorText>{err}</ErrorText>
            <Button title="Continue" onPress={sendCode} loading={busy} style={{ marginTop: 14 }} />
            {!isStaff && <Muted style={{ textAlign: 'center', marginTop: 14, fontSize: 13 }}>New here? Enter your email and we'll set you up.</Muted>}
          </View>
          <Pressable onPress={() => router.replace({ pathname: '/sign-in', params: isStaff ? {} : { staff: '1' } })} style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 22, padding: 6 }}>
            <Icon name={isStaff ? 'user' : 'brief'} size={15} color="#fff" />
            <T style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13.5 }}>{isStaff ? 'Guest, tenant, owner or partner sign in' : 'Staff sign in'}</T>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}
