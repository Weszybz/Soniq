import { Stack } from "expo-router"
import { StatusBar, useColorScheme, Pressable, Text } from "react-native"
import { Colors } from "../../constants/Colors"
import { useRouter } from "expo-router"
import ThemedNavBar from '../../components/ThemedNavBar';
import UserOnly from "../../components/auth/UserOnly";
import ThemedBottomSheet from "../../components/ThemedBottomSheet";
import { useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetProvider } from "../../contexts/BottomSheetContext";
import { UnreadProvider } from "../../contexts/UnreadContext";
import { NotificationProvider } from "../../contexts/NotificationContext";
import ThemedText from "../../components/ThemedText";

export default function AuthLayout() {
    const colorScheme = useColorScheme()
    const theme = Colors[colorScheme] ?? Colors.light
    const bottomSheetRef = useRef(null)
    const router = useRouter()
  return (
    <>
      <GestureHandlerRootView style={{ flex: 1, overflow: "visible" }}>
        <BottomSheetProvider>
          <UnreadProvider>
            <NotificationProvider>
          <UserOnly>
            <StatusBar style="auto" />
            <Stack screenOptions={{ 
              headerShown: false, animation: "none",
              headerStyle: { backgroundColor: theme.navBackground },
              headerTintColor: theme.title,
            }} />
            <ThemedNavBar />
            {/* <ThemedBottomSheet ref={bottomSheetRef} /> */}
          </UserOnly>
          </NotificationProvider>
          </UnreadProvider>
        </BottomSheetProvider>
      </GestureHandlerRootView>
    </>
  )
}