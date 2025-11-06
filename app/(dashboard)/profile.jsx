import { StyleSheet, Text, View, useColorScheme, Pressable, Image, TextInput } from 'react-native'
import { Colors } from '../../constants/Colors';
import { useUser } from '../../hooks/useUser';
import { useState } from 'react';
import { Link, useRouter } from 'expo-router';


// themed components
import ThemedView from '../../components/ThemedView';
import ThemedText from '../../components/ThemedText';
import Spacer from '../../components/Spacer';
import ThemedButton from '../../components/ThemedButton';
import ThemedTextInput from '../../components/ThemedTextInput';

const Profile = () => {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme] ?? Colors.light

  const [error, setError] = useState(null)
  const router = useRouter()
  const { user, logout } = useUser()

  console.log('Profile user:', user)

  const handleSubmit = async () => {
        setError(null)
        try {
            await logout()
            // console.log('Current user is:', user)
        } catch (error) {
            setError(error.message)
        }
        router.push('/')
        // console.log('Current User:', user)
        // console.log('Log In:', email, password)
    }

  return (
    <ThemedView style={styles.container} safe={true}>
      <Text>Profile</Text>

      <ThemedText title={true}>{user.email}</ThemedText>

      <View style={{
          position: 'absolute',
          bottom: '15%',
          alignItems: 'center',
      }}>
          <ThemedButton style={{ paddingHorizontal: 32}} onPress={handleSubmit}>
              <ThemedText style = {styles.buttonText}>Log out</ThemedText>
          </ThemedButton>
      </View>
    </ThemedView>
  )
}

export default Profile

const styles = StyleSheet.create({
  container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
})