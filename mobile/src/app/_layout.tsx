import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useFonts, Archivo_600SemiBold, Archivo_700Bold } from '@expo-google-fonts/archivo'
import { Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold } from '@expo-google-fonts/figtree'
import { View, ActivityIndicator } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider } from '@/lib/auth'
import { C } from '@/lib/theme'

export default function RootLayout() {
  const [loaded] = useFonts({ Archivo_600SemiBold, Archivo_700Bold, Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold })
  if (!loaded) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}><ActivityIndicator color={C.goldDark} /></View>
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#fff' } }} />
      </AuthProvider>
    </SafeAreaProvider>
  )
}
