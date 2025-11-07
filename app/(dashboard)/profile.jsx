import { StyleSheet, Text, View, useColorScheme, Pressable, Image, TextInput } from 'react-native'
import { Colors } from '../../constants/Colors';
import { useUser } from '../../hooks/useUser';
import { useState } from 'react';
import { Link, useRouter } from 'expo-router';

import { useProfile } from '../../contexts/ProfileContext';
import * as ImagePicker from 'expo-image-picker';
import { storage, account, ID, PROFILE_BUCKET_ID, APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID} from '../../lib/appwrite'


// themed components
import ThemedView from '../../components/ThemedView';
import ThemedText from '../../components/ThemedText';
import Spacer from '../../components/Spacer';
import ThemedButton from '../../components/ThemedButton';
import ThemedTextInput from '../../components/ThemedTextInput';

const profileIcon = require('../../assets/icon.png');

const Profile = () => {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme] ?? Colors.light

  const [error, setError] = useState(null)
  const router = useRouter()
  const { user, logout } = useUser()

  console.log('Profile user:', user)

  const { profileImage, setProfileImage } = useProfile();

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
  
  function makeProfileImageUrl(fileId) {
    return `${APPWRITE_ENDPOINT}/storage/buckets/${PROFILE_BUCKET_ID}/files/${fileId}/view?project=${APPWRITE_PROJECT_ID}`
    // you can add &mode=admin here if you really want,
    // but for a logged-in user it's not required
  }

  // 📸 Open system image picker
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permissionResult.granted) {
      alert('Permission to access gallery is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    })

    if (result.canceled) return

    const asset = result.assets[0]

    // Infer mime type and extension safely
    const mimeType = asset.mimeType || 'image/png'

    // Try to get extension from fileName or uri
    let extension = 'png'
    if (asset.fileName && asset.fileName.includes('.')) {
      extension = asset.fileName.split('.').pop()
    } else if (asset.uri && asset.uri.includes('.')) {
      extension = asset.uri.split('.').pop().split('?')[0]
    }

    const filename =
      // asset.fileName || `profile-${user.pref?.username}-${Date.now()}.${extension}`
      `${user.email}-${Date.now()}.${extension}`
      

    const file = {
      name: filename,
      type: mimeType,               // <- can be image/png or image/jpeg etc.
      size: asset.fileSize ?? 0,
      uri: asset.uri,
    }

    try {
      // 1️⃣ Upload to Appwrite Storage
      const uploaded = await storage.createFile(
        PROFILE_BUCKET_ID,
        ID.unique(),
        file
      )

      if (!uploaded || !uploaded.$id) {
        throw new Error('Upload failed — no file returned from Appwrite.')
      }

      const fileId = uploaded.$id
      const url = makeProfileImageUrl(fileId)

      // 2️⃣ Save fileId in user prefs
      await account.updatePrefs({
        profileImage: url,
      })

      // 4️⃣ Store globally so it shows in UI & after login
      setProfileImage(url)
      // setProfileImage('https://picsum.photos/200')
    } catch (error) {
      console.log('Error uploading profile image:', error)
      alert('Failed to upload image. Please try again.')
    }
  }
  
  return (
    <ThemedView style={styles.container} safe={true}>
      <Text>Profile</Text>

      {/* 👇 Image picker */}
      <Pressable onPress={pickImage}>
          <Image
              source={
                  profileImage
                  ? { uri: profileImage }
                  : require('../../assets/icon.png') // fallback / default
              }
              style={{
                  width: 120,
                  height: 120,
                  borderRadius: 60,
              }}
          />
      </Pressable>

      <ThemedText title={true}>Email: {user.email}</ThemedText>
      <ThemedText>Name: {user.name}</ThemedText>
      <ThemedText>Birthday: {user.prefs.birthday}</ThemedText>
      <ThemedText>Username: {user.prefs.username}</ThemedText>

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