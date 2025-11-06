import { Stack } from "expo-router"
import { StatusBar, useColorScheme, Pressable, Text } from "react-native"
import { Colors } from "../../constants/Colors"
import { useRouter } from "expo-router"
import { useUser } from "../../hooks/useUser"

export default function SignUpLayout() {
    const colorScheme = useColorScheme()
    const theme = Colors[colorScheme] ?? Colors.light
    const router = useRouter()
    
    const user = useUser()
    console.log(user)
  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ 
        headerShown: false, animation: "none",
        headerStyle: { backgroundColor: theme.navBackground },
        headerTintColor: theme.title,
      }} />
    </>
  )
}