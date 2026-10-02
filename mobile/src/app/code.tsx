import { useRef, useState } from 'react'
import { View, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { T, H, Muted, Button, ErrorText, Card } from '@/components/ui'
import Icon from '@/components/Icon'
import { api } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { C, F } from '@/lib/theme'

// "Check your email" — 6-digit code, then the app opens the right home screen.
export default function Code() {
  const insets = useSafeAreaInsets()
  const { email = '' } = useLocalSearchParams<{ email: string }>()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const input = useRef<TextInput>(null)

  async function verify(c = code) {
    setErr(null)
    if (c.length !== 6) { setErr('Please enter the 6-digit code.'); return }
    setBusy(true)
    try {
      const { token_hash } = await api.verifyCode(String(email), c)
      const { error } = await supabase.auth.verifyOtp({ token_hash, type: 'email' })
      if (error) throw error
      router.replace('/home')
    } catch (x: any) { setErr(x.message || 'That did not work. Please try again.') }
    finally { setBusy(false) }
  }
  async function resend() {
    setErr(null); setNote(null)
    try { await api.sendCode(String(email)); setNote('A new code is on its way.') } catch (x: any) { setErr(x.message) }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: '#fff', paddingTop: insets.top + 8, paddingHorizontal: 22 }}>
      <Pressable onPress={() => router.back()} style={{ width: 38, height: 38, justifyContent: 'center' }}><Icon name="back" size={22} /></Pressable>
      <H size={26} style={{ marginTop: 14 }}>Check your email</H>
      <Muted style={{ fontSize: 14, marginTop: 6, lineHeight: 20 }}>We sent a 6-digit code to{'\n'}<T style={{ fontFamily: F.bold, fontSize: 14 }}>{email}</T></Muted>
      <Pressable onPress={() => input.current?.focus()} style={{ flexDirection: 'row', gap: 8, marginTop: 26 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View key={i} style={{ flex: 1, height: 56, borderWidth: 1, borderColor: code.length > i || code.length === i ? C.ink : '#d9d4c8', borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
            <T style={{ fontFamily: F.head, fontSize: 24 }}>{code[i] ?? ''}</T>
          </View>
        ))}
      </Pressable>
      <TextInput ref={input} value={code} autoFocus keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" maxLength={6}
        onChangeText={v => { const d = v.replace(/\D/g, '').slice(0, 6); setCode(d); if (d.length === 6) verify(d) }}
        style={{ position: 'absolute', opacity: 0, height: 1, width: 1 }} />
      <ErrorText>{err}</ErrorText>
      {!!note && <T style={{ color: C.green, fontSize: 13, marginTop: 10 }}>{note}</T>}
      <Button title="Verify" onPress={() => verify()} loading={busy} style={{ marginTop: 22 }} />
      <Pressable onPress={resend} style={{ alignSelf: 'center', marginTop: 16, padding: 4 }}>
        <Muted style={{ fontSize: 13.5 }}>Didn't get it? <T style={{ color: C.goldText, fontFamily: F.bold, fontSize: 13.5 }}>Resend code</T></Muted>
      </Pressable>
      <Card style={{ marginTop: 28, backgroundColor: C.soft }}>
        <T style={{ fontSize: 13, color: C.ink2, lineHeight: 19 }}>After signing in, the app opens the right area for you automatically: <T style={{ fontFamily: F.bold, fontSize: 13 }}>guest, tenant, owner, partner or staff.</T></T>
      </Card>
      <Pressable onPress={() => router.replace({ pathname: '/password', params: { email: String(email) } })} style={{ alignSelf: 'center', marginTop: 14, padding: 4 }}>
        <Muted style={{ fontSize: 13 }}>Prefer a password? <T style={{ fontFamily: F.bold, fontSize: 13 }}>Use password instead</T></Muted>
      </Pressable>
    </KeyboardAvoidingView>
  )
}
