import { ActivityIndicator, Pressable, Text, TextInput, View, StyleSheet, type TextInputProps, type ViewStyle, type StyleProp, type TextStyle } from 'react-native'
import Icon, { type IconName } from './Icon'
import { C, F } from '@/lib/theme'

export function T({ style, children, ...p }: { style?: StyleProp<TextStyle>; children: React.ReactNode; numberOfLines?: number; selectable?: boolean }) {
  return <Text {...p} style={[{ fontFamily: F.body, color: C.ink, fontSize: 14 }, style]}>{children}</Text>
}
export const H = ({ children, size = 22, style }: { children: React.ReactNode; size?: number; style?: StyleProp<TextStyle> }) =>
  <T style={[{ fontFamily: F.head, fontSize: size, lineHeight: size * 1.18, letterSpacing: -0.2 }, style]}>{children}</T>
export const Muted = ({ children, style, numberOfLines }: { children: React.ReactNode; style?: StyleProp<TextStyle>; numberOfLines?: number }) =>
  <T numberOfLines={numberOfLines} style={[{ color: C.mute, fontSize: 12.5 }, style]}>{children}</T>
export const Section = ({ children }: { children: React.ReactNode }) =>
  <T style={{ fontFamily: F.semi, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: C.mute, marginTop: 20, marginBottom: 8 }}>{children}</T>

export function Card({ children, style, pad = true }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; pad?: boolean }) {
  return <View style={[{ borderWidth: 1, borderColor: C.line, borderRadius: 14, backgroundColor: '#fff', padding: pad ? 14 : 0, paddingHorizontal: 14 }, style]}>{children}</View>
}

export function DarkCard({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: C.ink, borderRadius: 16, padding: 18 }}>
      <T style={{ color: C.goldLight, fontFamily: F.semi, fontSize: 11, letterSpacing: 1.3, textTransform: 'uppercase' }}>{label}</T>
      <T style={{ color: '#fff', fontFamily: F.head, fontSize: 32, marginTop: 4 }}>{value}</T>
      {children}
    </View>
  )
}

export function IconBox({ name, size = 17 }: { name: IconName; size?: number }) {
  return <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center' }}><Icon name={name} size={size} color={C.goldText} /></View>
}

export function Row({ icon, title, sub, right, onPress, first, chevron = !!onPress }: { icon?: IconName; title: string; sub?: string | null; right?: React.ReactNode; onPress?: () => void; first?: boolean; chevron?: boolean }) {
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: first ? 0 : 1, borderTopColor: C.line2 }}>
      {icon && <IconBox name={icon} />}
      <View style={{ flex: 1, minWidth: 0 }}>
        <T style={{ fontFamily: F.semi, fontSize: 14 }} numberOfLines={2}>{title}</T>
        {!!sub && <Muted numberOfLines={2}>{sub}</Muted>}
      </View>
      {right}
      {chevron && <Icon name="arrow" size={16} color={C.faint} />}
    </View>
  )
  return onPress ? <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>{body}</Pressable> : body
}

export function Pill({ tone = 'grey', children }: { tone?: 'gold' | 'green' | 'amber' | 'blue' | 'red' | 'grey'; children: React.ReactNode }) {
  const t = { gold: [C.cream, C.goldText], green: [C.greenBg, C.green], amber: [C.amberBg, C.amber], blue: [C.blueBg, C.blue], red: [C.redBg, C.red], grey: ['#f0efec', C.ink2] }[tone]
  return <View style={{ backgroundColor: t[0], borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}><T style={{ color: t[1], fontFamily: F.bold, fontSize: 11 }}>{children}</T></View>
}

export function Button({ title, onPress, kind = 'dark', loading, icon, disabled, style }: { title: string; onPress?: () => void; kind?: 'dark' | 'gold' | 'outline' | 'light'; loading?: boolean; icon?: React.ReactNode; disabled?: boolean; style?: StyleProp<ViewStyle> }) {
  const bg = kind === 'dark' ? C.ink : kind === 'gold' ? C.gold : '#fff'
  const fg = kind === 'dark' ? '#fff' : C.ink
  return (
    <Pressable onPress={onPress} disabled={disabled || loading} style={({ pressed }) => [{ backgroundColor: bg, borderRadius: 12, paddingVertical: 15, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, borderWidth: kind === 'outline' || kind === 'light' ? 1 : 0, borderColor: kind === 'outline' ? C.ink : '#d9d4c8', opacity: disabled ? 0.5 : pressed ? 0.85 : 1 }, style]}>
      {loading ? <ActivityIndicator color={fg} /> : <>{icon}<T style={{ color: fg, fontFamily: F.bold, fontSize: 15 }}>{title}</T></>}
    </Pressable>
  )
}

export function Field(props: TextInputProps & { label?: string }) {
  const { label, style, ...rest } = props
  return (
    <View>
      {!!label && <T style={{ fontFamily: F.semi, fontSize: 13, marginBottom: 6 }}>{label}</T>}
      <TextInput placeholderTextColor={C.faint} {...rest} style={[{ borderWidth: 1, borderColor: '#d9d4c8', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, fontFamily: F.body, color: C.ink, backgroundColor: '#fff' }, style]} />
    </View>
  )
}

export function ErrorText({ children }: { children?: string | null }) {
  return children ? <T style={{ color: C.red, fontSize: 13, marginTop: 10 }}>{children}</T> : null
}

export function Empty({ title, sub }: { title: string; sub?: string }) {
  return <View style={{ paddingVertical: 18, alignItems: 'center' }}><T style={{ fontFamily: F.semi }}>{title}</T>{!!sub && <Muted style={{ textAlign: 'center', marginTop: 4 }}>{sub}</Muted>}</View>
}

export function Stat({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <View style={{ flex: 1, borderWidth: 1, borderColor: highlight ? C.creamLine : C.line, backgroundColor: highlight ? C.cream : '#fff', borderRadius: 12, padding: 11 }}>
      <Muted style={{ fontSize: 11.5, color: highlight ? '#8A6B2E' : C.mute }}>{label}</Muted>
      <T style={{ fontFamily: F.head, fontSize: 22, marginTop: 2 }}>{String(value)}</T>
    </View>
  )
}

export const s = StyleSheet.create({ screen: { flex: 1, backgroundColor: '#fff' } })

export function Header({ small, title, right }: { small?: string; title: string; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
      <View style={{ flex: 1 }}>
        {!!small && <Muted style={{ fontSize: 13 }}>{small}</Muted>}
        <H size={25} style={{ marginTop: 2 }}>{title}</H>
      </View>
      {right}
    </View>
  )
}

export type ScreenProps = { data: any; name: string; role: string; reload: () => void; go: (tab: string) => void }
