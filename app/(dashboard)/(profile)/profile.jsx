import { StyleSheet, Text, View, useColorScheme, Pressable, Image, TextInput, Button, ScrollView, ActivityIndicator } from 'react-native'
import { Colors } from '../../../constants/Colors';
import { useUser } from '../../../hooks/useUser';
import { useState, useEffect } from 'react';
import { Link, useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { useProfile } from '../../../contexts/ProfileContext';
import * as ImagePicker from 'expo-image-picker';
import { storage, account, databases, ID, PROFILE_BUCKET_ID, APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, DATABASE_ID } from '../../../lib/appwrite'
import { Ionicons } from '@expo/vector-icons';
import { getFollowCounts, isFollowing, followUser, unfollowUser } from '../../../lib/followService';
import { getUserProfileData } from '../../../lib/userService';

// themed components
import ThemedView from '../../../components/ThemedView';
import ThemedText from '../../../components/ThemedText';
import Spacer from '../../../components/Spacer';
import ThemedButton from '../../../components/ThemedButton';
import ThemedTextInput from '../../../components/ThemedTextInput';
import ThemedProfileScroller from '../../../components/ThemedProfileScroller';
import ThemedProfileSnippets from '../../../components/ThemedProfileSnippets';
import ThemedProfileFeedback from '../../../components/ThemedProfileFeedbacks';
import ThemedProfileLikes from '../../../components/ThemedProfileLikes';
import ThemedProfileCollaborations from '../../../components/ThemedProfileCollaborations';

const ProfileInfo = () => {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme] ?? Colors.light

  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('Snippets');
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  const router = useRouter()
  const { userId: routeUserId } = useLocalSearchParams()
  const { user: currentUser, logout } = useUser()

  // Determine if viewing own profile or another user's profile
  const profileUserId = routeUserId || currentUser?.$id
  const isOwner = !routeUserId || routeUserId === currentUser?.$id

  // State for profile data when viewing another user
  const [profileData, setProfileData] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)

  // Genres for own profile
  const [ownGenres, setOwnGenres] = useState([])

  // Follow state
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [isFollowingUser, setIsFollowingUser] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [followActionLoading, setFollowActionLoading] = useState(false)

  console.log('Profile user:, currentUser')
  console.log('Viewing profile:', profileUserId, 'isOwner:', isOwner)

  const { profileImage, setProfileImage } = useProfile();

  // Define tabs based on ownership
  const tabOptions = isOwner
    ? ['Snippets', 'Feedback', 'Likes', 'Collaborations', 'Reposts', 'Saved']
    : ['Snippets', 'Collaborations', 'Reposts'];

  // Fetch profile data if viewing another user's profile
  useEffect(() => {
    const fetchProfileData = async () => {
      if (isOwner || !profileUserId) {
        setProfileData(null)
        return
      }

      setProfileLoading(true)
      try {
        console.log("Fetching profile data for userId", profileUserId)

        // Use userService to fetch profile data
        const userData = await getUserProfileData(profileUserId)

        console.log("Profile data fetched:", userData)

        setProfileData({
          username: userData.username,
          profileImage: userData.profileImage,
          name: userData.name || userData.username,
          genres: userData.genres || []
        })
      } catch (error) {
        console.error("Failed to fetch profile data:", error)
        setProfileData({
          username: 'User',
          profileImage: null,
          name: 'User',
        })
      } finally {
        setProfileLoading(false)
      }
    }
    fetchProfileData()
  }, [profileUserId, isOwner])

  // Fetch follow counts and follow status
  useEffect(() => {
    const fetchFollowData = async () => {
      if (!profileUserId) return

      setFollowLoading(true)
      try {
        // Fetch follow counts
        const counts = await getFollowCounts(profileUserId)
        setFollowersCount(counts.followers)
        setFollowingCount(counts.following)

        // Check if current user is following this profile (only if not owner)
        if (!isOwner && currentUser?.$id) {
          const following = await isFollowing(currentUser.$id, profileUserId)
          setIsFollowingUser(following)
        } else {
          setIsFollowingUser(false)
        }
      } catch (error) {
        console.error('Failed to fetch follow data', error)
      } finally {
        setFollowLoading(false)
      }
    }
    fetchFollowData()
  }, [profileUserId, isOwner, currentUser?.$id])

  // Refresh follow counts when screen comes into focus 
  useFocusEffect(
    useCallback(() => {
      const refreshOnFocus = async () => {
        if (!profileUserId) return

        if (isOwner) {
          try {
            const userData = await getUserProfileData(profileUserId)
            setOwnGenres(Array.isArray(userData.genres) ? userData.genres : [])
          } catch (error) {
          }
        }

        try {
          const counts = await getFollowCounts(profileUserId)
          setFollowersCount(counts.followers)
          setFollowingCount(counts.following)
          
          if (!isOwner && currentUser?.$id) {
            const following = await isFollowing(currentUser.$id, profileUserId)
            setIsFollowingUser(following)
          } else {
            setIsFollowingUser(false)
          }
        } catch (error) {
          console.error('Failed to refresh profile data:', error)
        } 
      }
      refreshOnFocus()
    }, [profileUserId, isOwner, currentUser?.$id])
  )

  // Get display data - either current user or fetched profiel data
  const displayData = isOwner ? currentUser : profileData
  const displayProfileImage = isOwner ? profileImage : profileData?.profileImage

  const userGenres = isOwner ? ownGenres : (profileData?.genres || [])

  // Handle follow action
  const handleFollow = async () => {
    if (!currentUser?.$id || !profileUserId || followActionLoading) return;

    setFollowActionLoading(true)

    setIsFollowingUser(true)
    setFollowersCount(prev => prev + 1)

    try {
      // Pass current user's username and profile image
      const username = currentUser.prefs?.username || currentUser.name || 'User';
      const userProfileImage = profileImage || currentUser.prefs?.profileImage || null;

      await followUser(currentUser.$id, profileUserId, username, userProfileImage)
    } catch (error) {
      console.error("Failed to follow user:", error)

      // Rollback on error
      setIsFollowingUser(false)
      setFollowersCount(prev => Math.max(0, prev - 1))

      alert("Failed to follow user. Please try again.")
    } finally {
      setFollowActionLoading(false)
    }
  }

  // Handle unfollow
  const handleUnfollow = async () => {
    if (!currentUser?.$id || !profileUserId || followActionLoading) return;

    setFollowActionLoading(true)

    setIsFollowingUser(false)
    setFollowersCount(prev => Math.max(0, prev - 1))

    try {
      await unfollowUser(currentUser.$id, profileUserId)
    } catch (error) {
      console.error("Failed to unfollow user:", error)

      // Rollback on error
      setIsFollowingUser(true)
      setFollowersCount(prev => prev + 1)

      alert("Failed to unfollow user. Please try again.")
    } finally {
      setFollowActionLoading(false)
    }
  }

  // Handle message action
  const handleMessage = () => {
    alert('Messaging feature coming soon!')
  }

  // Handle tab changes
  const handleTabChange = (index, value) => {
    setActiveTabIndex(index);
    setActiveTab(value);
  };

  const handleSubmit = async () => {
    if (!isOwner) return 

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
    if (!isOwner) return

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
      `${currentUser.email}-${Date.now()}.${extension}`

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
        <ThemedText style={styles.username}>
          {profileLoading ? '...' : (displayData?.prefs?.username || displayData?.username || 'User')}
        </ThemedText>
        {isOwner && <Ionicons name="menu" size={28} color={theme.textSecondary} />}
      </View>
      <Spacer />

      {/* Profile Image and Stats Row */}
      <View style={styles.profileRow}>
        {/* Profile Image */}
        {profileLoading && !isOwner ? (
          <View style={{ width: 100, height: 100, borderRadius: 60, backgroundColor: theme.uiBackground, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="small" color={theme.textSecondary} />
          </View>
        ) : (
          <Image
              source={
                  displayProfileImage
                  ? { uri: displayProfileImage }
                  : require('../../../assets/icon.png') // fallback / default
              }
              style={{
                  width: 100,
                  height: 100,
                  borderRadius: 60,
              }}
          />
        )}

        {/* Follow Stats */}
        <View style={styles.statsContainer}>
          <Pressable
            style={styles.statItem}
            onPress={() => {
              router.push({
                pathname: '/followList',
                params: {
                  userId: profileUserId,
                  type: 'followers',
                  username: displayData?.prefs?.username || displayData?.username || 'User'
                }
              });
            }}
            >
              <ThemedText style={styles.statNumber}>
                {followLoading ? '-' : followersCount}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                Followers
              </ThemedText>
            </Pressable>

            <Pressable
              style={styles.statItem}
              onPress={() => {
                router.push({
                  pathname: '/followList',
                  params: {
                    userId: profileUserId,
                    type: 'following',
                    username: displayData?.prefs?.username || displayData?.username || 'User'
                  }
                });
              }}
            >
              <ThemedText style={styles.statNumber}>
                {followLoading ? '-' : followingCount}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                Following
              </ThemedText>
            </Pressable>
        </View>
      </View>

      <Spacer />

            {/* Edit Profile Button - Only for owner */}
      {isOwner && (
        <>
          <Pressable 
            style={[styles.editProfileButton, {backgroundColor: theme.background, borderColor: theme.divider}]} 
            onPress={() => router.push('profileInfo')}
          >
            <ThemedText style={styles.buttonText}>Edit Profile</ThemedText>
          </Pressable>
          <Spacer />
        </>
      )}

      {/* Follow/Unfollow/Message Buttons - Only for non-owners */}
      {!isOwner && (
        <>
          {followLoading || followActionLoading ? (
            <View style={[styles.buttonSkeleton, { backgroundColor: theme.uiBackground }]}>
              <ActivityIndicator size="small" color={theme.textSecondary} />
            </View>
          ) : isFollowingUser ? (
            <View style={styles.actionButtons}>
              <Pressable 
                style={[styles.actionButton, styles.unfollowButton, { backgroundColor: theme.uiBackground, borderColor: theme.divider }]} 
                onPress={handleUnfollow}
                disabled={followActionLoading}
              >
                <ThemedText style={[styles.buttonText, { color: theme.textPrimary }]}>Unfollow</ThemedText>
              </Pressable>
              <Pressable 
                style={[styles.actionButton, styles.messageButton, { backgroundColor: Colors.primary }]} 
                onPress={handleMessage}
              >
                <ThemedText style={[styles.buttonText, { color: '#ffffff' }]}>Message</ThemedText>
              </Pressable>
            </View>
          ) : (
            <Pressable 
              style={[styles.followButtonFull, { backgroundColor: Colors.primary }]} 
              onPress={handleFollow}
              disabled={followActionLoading}
            >
              <ThemedText style={[styles.buttonText, { color: '#ffffff' }]}>Follow</ThemedText>
            </Pressable>
          )}
          <Spacer />
        </>
      )}

      <ThemedText style={{ fontSize: 16, fontWeight: '600'}}>{displayData?.name || 'User'}</ThemedText>
      {userGenres.length > 0 && (
        <ThemedText style={{ fontSize: 16, fontWeight: '600', color: Colors.primary}}>
          {userGenres.map(g => `#${g}`).join('  ')}
        </ThemedText>
      )}
      
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
        profileUserId={profileUserId}
        currentUser={currentUser}
        theme={theme}
        isActive={activeTab === 'Snippets'}
      />

      {isOwner && (
        <>
          <ThemedProfileFeedback
            profileUserId={profileUserId}
            theme={theme}
            isActive={activeTab === 'Feedback'}
          />

          <ThemedProfileLikes
            profileUserId={profileUserId}
            currentUser={currentUser}
            theme={theme}
            isActive={activeTab === 'Likes'}
          />
        </>
      )}

      {/* Collaborations Tab - Available to all */}
      <ThemedProfileCollaborations
        profileUserId={profileUserId}
        currentUser={currentUser}
        theme={theme}
        isActive={activeTab === 'Collaborations'}
      />

      {/* Reposts Tab - Available to all */}
      {activeTab === 'Reposts' && (
        <View style={styles.tabPlaceholder}>
          <View style={styles.placeholderContent}>
            <Ionicons name="repeat-outline" size={48} color={theme.textSecondary} />
            <ThemedText style={styles.placeholderTitle}>No reposts yet</ThemedText>
            <ThemedText style={[styles.placeholderSubtext, { color: theme.textSecondary }]}>
              {isOwner ? 'Snippets you repost will appear here' : 'Reposted snippets will appear here'}
            </ThemedText>
          </View>
        </View>
      )}

      {/* Saved Tab - Only for owner */}
      {isOwner && activeTab === 'Saved' && (
        <View style={styles.tabPlaceholder}>
          <View style={styles.placeholderContent}>
            <Ionicons name="bookmark-outline" size={48} color={theme.textSecondary} />
            <ThemedText style={styles.placeholderTitle}>No saved snippets yet</ThemedText>
            <ThemedText style={[styles.placeholderSubtext, { color: theme.textSecondary }]}>
              Snippets you save will appear here
            </ThemedText>
          </View>
        </View>
      )}
      
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
  profileRow: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    gap: 24,
  },
  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statNumber: {
    fontFamily: 'inter',
    fontWeight: 'bold',
    fontSize: 20,
  },
  statLabel: {
    fontFamily: 'inter',
    fontWeight: '500',
    fontSize: 13,
  },
  editProfileButton: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  followButtonFull: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  unfollowButton: {
    borderWidth: 2,
  },
  messageButton: {
    // No additional styles needed
  },
  buttonText: {
    fontFamily: 'inter',
    fontWeight: '600',
    fontSize: 15,
  },
  buttonSkeleton: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  tabPlaceholder: {
    flex: 1,
    width: '100%',
  },
  placeholderContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    gap: 12,
  },
  placeholderTitle: {
    fontFamily: 'inter',
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
  },
  placeholderSubtext: {
    fontFamily: 'inter',
    fontWeight: '400',
    fontSize: 14,
    textAlign: 'center',
  },
})