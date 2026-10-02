import { useState } from 'react'
import { Pressable, KeyboardAvoidingView, Platform, Linking, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { T, H, Muted, Button, Field, ErrorText } from '@/components/ui'
import Icon from '@/components/Icon'
import { supabase } from '@/lib/supabase'
import { PORTAL_URL } from '@/lib/config'
import { C, F } from '@/lib/theme'

// Email + password (staff, and anyone who already has a portal password).
export default function Password() {
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{ email?: string }>()
  const [email, setEmail] = useState(String(params.email ?? ''))
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function signIn() {
    setErr(null)
    if (!email.trim() || !password) { setErr('Please enter your email and password.'); return }
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
    setBusy(false)
    if (error) { setErr(error.message === 'Invalid login credentials' ? 'That email and password do not match.' : error.message); return }
    router.replace('/home')
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: '#fff', paddingTop: insets.top + 8, paddingHorizontal: 22 }}>
      <Pressable onPress={() => router.back()} style={{ width: 38, height: 38, justifyContent: 'center' }}><Icon name="back" size={22} /></Pressable>
      <H size={26} style={{ marginTop: 14 }}>Sign in with password</H>
      <Muted style={{ fontSize: 14, marginTop: 6 }}>Use the same details as the portal.</Muted>
      <View style={{ gap: 14, marginTop: 24 }}>
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="username" />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" textContentType="password" returnKeyType="go" onSubmitEditing={signIn} />
      </View>
      <ErrorText>{err}</ErrorText>
      <Button title="Sign in" onPress={signIn} loading={busy} style={{ marginTop: 20 }} />
      <Pressable onPress={() => Linking.openURL(`${PORTAL_URL}/reset-password`)} style={{ alignSelf: 'center', marginTop: 16, padding: 4 }}>
        <T style={{ color: C.goldText, fontFamily: F.bold, fontSize: 13.5 }}>Forgot password?</T>
      </Pressable>
    </KeyboardAvoidingView>
  )
}
