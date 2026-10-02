import { useEffect, useRef, useState } from 'react'
import { View, ScrollView, KeyboardAvoidingView, Platform, TextInput, Pressable, ActivityIndicator } from 'react-native'
import { T, H, Muted, ErrorText } from '@/components/ui'
import Icon from '@/components/Icon'
import { api, type Role } from '@/lib/api'
import { C, F, day } from '@/lib/theme'

// Chat with the team. Tenants and owners see the same thread as their portal;
// guests, partners and staff send a message straight to the team.
export function Messages({ role }: { role: Role }) {
  const threaded = role === 'tenant' || role === 'owner' || role === 'partner'
  const [msgs, setMsgs] = useState<any[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(threaded)
  const [sending, setSending] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const scroll = useRef<ScrollView>(null)
  const load = () => api.post({ action: 'messages', role }).then(r => setMsgs(r.messages ?? [])).catch(e => setErr(e.message)).finally(() => setLoading(false))
  useEffect(() => { if (threaded) load() }, [role])

  async function send() {
    const t = text.trim(); if (!t) return
    setSending(true); setErr(null)
    try { await api.post({ action: 'message', role, text: t }); setText(''); setSent(true); if (threaded) await load() }
    catch (x: any) { setErr(x.message) } finally { setSending(false) }
  }
  const mine = (m: any) => m.sender !== 'admin' && m.sender !== 'staff' && m.sender !== 'team'

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <View style={{ padding: 20, paddingBottom: 8 }}><H size={25}>Messages</H><Muted style={{ marginTop: 4 }}>Our team usually replies within a few hours.</Muted></View>
      <ScrollView ref={scroll} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })} contentContainerStyle={{ padding: 20, paddingTop: 8, gap: 8 }}>
        {loading ? <ActivityIndicator color={C.goldDark} /> : null}
        {threaded && !loading && !msgs.length ? <Muted style={{ textAlign: 'center', marginTop: 20 }}>No messages yet. Say hello below.</Muted> : null}
        {msgs.map(m => (
          <View key={m.id} style={{ alignSelf: mine(m) ? 'flex-end' : 'flex-start', maxWidth: '82%', backgroundColor: mine(m) ? C.ink : C.soft, borderWidth: mine(m) ? 0 : 1, borderColor: C.line, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9 }}>
            <T style={{ color: mine(m) ? '#fff' : C.ink, lineHeight: 20 }}>{m.message}</T>
            <T style={{ color: mine(m) ? 'rgba(255,255,255,0.55)' : C.mute, fontSize: 10.5, marginTop: 3 }}>{day(m.created_at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</T>
          </View>
        ))}
        {!threaded && sent ? <T style={{ color: C.green, textAlign: 'center' }}>Thank you, your message has been sent. We will reply by email.</T> : null}
        <ErrorText>{err}</ErrorText>
      </ScrollView>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: C.line }}>
        <TextInput value={text} onChangeText={setText} placeholder="Write a message" placeholderTextColor={C.faint} multiline style={{ flex: 1, maxHeight: 120, borderWidth: 1, borderColor: '#d9d4c8', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontFamily: F.body, fontSize: 15, color: C.ink }} />
        <Pressable onPress={send} disabled={sending} style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
          {sending ? <ActivityIndicator color="#fff" /> : <Icon name="send" size={19} color="#fff" />}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}
