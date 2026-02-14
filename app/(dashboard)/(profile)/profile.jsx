import { StyleSheet, Text, View, useColorScheme, Pressable, Image, TextInput, Button, ScrollView } from 'react-native'
import { Colors } from '../../../constants/Colors';
import { useUser } from '../../../hooks/useUser';
import { useState } from 'react';
import { Link, useRouter } from 'expo-router';

import { useProfile } from '../../../contexts/ProfileContext';
import * as ImagePicker from 'expo-image-picker';
import { storage, account, ID, PROFILE_BUCKET_ID, APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID} from '../../../lib/appwrite'
import { Ionicons } from '@expo/vector-icons';

// themed components
import ThemedView from '../../../components/ThemedView';
import ThemedText from '../../../components/ThemedText';
import Spacer from '../../../components/Spacer';
import ThemedButton from '../../../components/ThemedButton';
import ThemedTextInput from '../../../components/ThemedTextInput';
import ThemedProfileScroller from '../../../components/ThemedProfileScroller';
import ThemedProfileSnippets from '../../../components/ThemedProfileSnippets';
import ThemedProfileFeedback from '../../../components/ThemedProfileFeedbacks';

const ProfileInfo = () => {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme] ?? Colors.light

  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('Snippets');
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  const tabOptions = ['Snippets', 'Feedback', 'Likes', 'Collaborations', 'Reposts', 'Saved'];

  const router = useRouter()
  const { user, logout } = useUser()

  console.log('Profile user:', user)

  const { profileImage, setProfileImage } = useProfile();

  // Handle tab changes
  const handleTabChange = (index, value) => {
    setActiveTabIndex(index);
    setActiveTab(value);
  };

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

  // Open system image picker
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
      // Upload to Appwrite Storage
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

      // Save fileId in user prefs
      const current = await account.get()
      const newPrefs = {
        ...current.prefs,
        profileImage: url,
      }
      await account.updatePrefs(newPrefs)

      // Store globally so it shows in UI & after login
      setProfileImage(url)
      // setProfileImage('https://picsum.photos/200')
    } catch (error) {
      console.log('Error uploading profile image:', error)
      alert('Failed to upload image. Please try again.')
    }
  }
  
  return (
    <ThemedView style={styles.container} safe={true}>
      <View style={styles.top}>
        <ThemedText style={styles.username}>{user.prefs?.username}</ThemedText>
        <Ionicons name="menu" size={28} color={theme.textSecondary} />
      </View>
      <Spacer />

      {/* 👇 Image picker */}
      <View style={styles.imageButton}>
        <Image
            source={
                profileImage
                ? { uri: profileImage }
                : require('../../../assets/icon.png') // fallback / default
            }
            style={{
                width: 100,
                height: 100,
                borderRadius: 60,
            }}
        />

        <View style={{ flexGrow: 0 }}>
          <ThemedButton style={[styles.editProfile, {backgroundColor: theme.background, borderBlockColor: theme.divider}]} onPress={() => router.push('profileInfo')}>
            <ThemedText>Edit Profile</ThemedText>
          </ThemedButton>
        </View>
      </View>

      <Spacer />

      <ThemedText style={{ fontSize: 16, fontWeight: '600'}}>{user.name}</ThemedText>
      <ThemedText style={{ fontSize: 16, fontWeight: '600', color: Colors.primary}}>#Lofi #HipHop</ThemedText>
      
      <Spacer />
      
      <View style={{ flexGrow: 0 }}>
        <ThemedProfileScroller 
          options={tabOptions}
          initialIndex={activeTabIndex}
          onChange={handleTabChange}
        />
      </View>

      <Spacer />

      {/* Tab Content - Render appropiate component based on active tab */}
      <ThemedProfileSnippets
        profileUserId={user?.$id}
        currentUser={user}
        theme={theme}
        isActive={activeTab === 'Snippets'}
      />

      <ThemedProfileFeedback
        profileUserId={user?.$id}
        theme={theme}
        isActive={activeTab === 'Feedback'}
      />

    </ThemedView>
  )
}

export default ProfileInfo

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  top: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  username: {
    fontFamily: 'inter',
    fontWeight: 'bold',
    fontSize: 24,
  },
  imageButton: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },  
  editProfile: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 2,
    marginBottom: -24,
    alignSelf: 'flex-end',
  },
})