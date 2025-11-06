import { Stack } from "expo-router"
import { StatusBar, useColorScheme, Pressable, Text } from "react-native"
import { Colors } from "../../constants/Colors"
import { useRouter } from "expo-router"
import ThemedNavBar from '../../components/ThemedNavBar';
import UserOnly from "../../components/auth/UserOnly";

export default function AuthLayout() {
    const colorScheme = useColorScheme()
    const theme = Colors[colorScheme] ?? Colors.light
    const router = useRouter()
  return (
    <>
      <UserOnly>
        <StatusBar style="auto" />
        <Stack screenOptions={{ 
          headerShown: false, animation: "none",
          headerStyle: { backgroundColor: theme.navBackground },
          headerTintColor: theme.title,
        }} />
        <ThemedNavBar />
      </UserOnly>
    </>
  )
}