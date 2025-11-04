import { Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

const RootLayout = () => {
  return (
    <Stack screenOptions={{
      headerStyle: { backgroundColor: '#ddd' },
      headerTintColor: '#333',
    }}>
      <Stack.Screen name ="index" options={{ title: 'Home'}}/>
      <Stack.Screen name ="email" options={{ title: 'Email', headerShown: false }}/>
    </Stack>
  );
}

export default RootLayout

const styles = StyleSheet.create({})