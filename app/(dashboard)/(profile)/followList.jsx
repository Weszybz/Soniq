import { StyleSheet, View, useColorScheme, FlatList, Image, Pressable, ActivityIndicator } from 'react-native';
import { Colors } from '../../../constants/Colors';
import { useUser } from '../../../hooks/useUser';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProfile } from '../../../contexts/ProfileContext';

// Service imports
import { getFollowersList, getFollowingList, getUsersData, isFollowing, followUser, unfollowUser } from '../../../lib/followService';

// Themed components
import ThemedView from '../../../components/ThemedView';
import ThemedText from '../../../components/ThemedText';
import ThemedButton from '../../../components/ThemedButton';

/**
 * FollowList - Display followers or following list for a user
 * 
 * Route params:
 * - userId: The user whose followers/following to display
 * - type: 'followers' or 'following'
 * - username: Optional username for display
 */
const FollowList = () => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;
  const router = useRouter();
  
  // Get params
  const { userId, type, username } = useLocalSearchParams();
  const { user: currentUser } = useUser();
  const { profileImage } = useProfile();
  
  // State
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [followStates, setFollowStates] = useState({}); // Track follow state for each user
  const [actionLoading, setActionLoading] = useState({}); // Track loading state per user
  
  const limit = 25;
  const isFollowersView = type === 'followers';
  
  // Fetch initial list
  useEffect(() => {
    fetchUsers(0, false);
  }, [userId, type]);
  
  const fetchUsers = async (newOffset = 0, isLoadingMore = false) => {
    if (!userId) return;
    
    if (isLoadingMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    
    try {
      if (isFollowersView) {
        // Fetch followers list - data is already denormalized in the follow documents
        const result = await getFollowersList(userId, limit, newOffset);
        const usersData = result.followers;
        
        // Check follow status for each user (only if current user is logged in)
        if (currentUser?.$id) {
          const followStatusPromises = usersData.map(async (user) => {
            // Don't check if it's the current user
            if (user.userId === currentUser.$id) {
              return { userId: user.userId, isFollowing: false };
            }
            const following = await isFollowing(currentUser.$id, user.userId);
            return { userId: user.userId, isFollowing: following };
          });
          
          const followStatuses = await Promise.all(followStatusPromises);
          const followStatesMap = {};
          followStatuses.forEach(status => {
            followStatesMap[status.userId] = status.isFollowing;
          });
          setFollowStates(prev => ({ ...prev, ...followStatesMap }));
        }
        
        // Update users list
        if (isLoadingMore) {
          setUsers(prev => [...prev, ...usersData]);
        } else {
          setUsers(usersData);
        }
        
        setHasMore(result.hasMore);
      } else {
        // Fetch following list - need to fetch user data
        const result = await getFollowingList(userId, limit, newOffset);
        const userIds = result.followingIds;
        
        // Fetch user data for these IDs
        const usersData = await getUsersData(userIds);
        
        // Check follow status for each user (only if current user is logged in)
        if (currentUser?.$id) {
          const followStatusPromises = usersData.map(async (user) => {
            // Don't check if it's the current user
            if (user.userId === currentUser.$id) {
              return { userId: user.userId, isFollowing: false };
            }
            const following = await isFollowing(currentUser.$id, user.userId);
            return { userId: user.userId, isFollowing: following };
          });
          
          const followStatuses = await Promise.all(followStatusPromises);
          const followStatesMap = {};
          followStatuses.forEach(status => {
            followStatesMap[status.userId] = status.isFollowing;
          });
          setFollowStates(prev => ({ ...prev, ...followStatesMap }));
        }
        
        // Update users list
        if (isLoadingMore) {
          setUsers(prev => [...prev, ...usersData]);
        } else {
          setUsers(usersData);
        }
        
        setHasMore(result.hasMore);
      }
      
      setOffset(newOffset);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };
  
  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUsers(0, false);
  };
  
  // Handle load more
  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchUsers(offset + limit, true);
    }
  };
  
  // Handle follow action
  const handleFollow = async (targetUserId) => {
    if (!currentUser?.$id || actionLoading[targetUserId]) return;
    
    setActionLoading(prev => ({ ...prev, [targetUserId]: true }));
    
    // Optimistic update
    setFollowStates(prev => ({ ...prev, [targetUserId]: true }));
    
    try {
      // Pass current user's username and profile image
      const username = currentUser.prefs?.username || currentUser.name || 'User';
      const userProfileImage = profileImage || currentUser.prefs?.profileImage || null;
      
      await followUser(currentUser.$id, targetUserId, username, userProfileImage);
    } catch (err) {
      console.error('Failed to follow user:', err);
      // Rollback
      setFollowStates(prev => ({ ...prev, [targetUserId]: false }));
      alert('Failed to follow user. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, [targetUserId]: false }));
    }
  };
  
  // Handle unfollow action
  const handleUnfollow = async (targetUserId) => {
    if (!currentUser?.$id || actionLoading[targetUserId]) return;
    
    setActionLoading(prev => ({ ...prev, [targetUserId]: true }));
    
    // Optimistic update
    setFollowStates(prev => ({ ...prev, [targetUserId]: false }));
    
    try {
      await unfollowUser(currentUser.$id, targetUserId);
    } catch (err) {
      console.error('Failed to unfollow user:', err);
      // Rollback
      setFollowStates(prev => ({ ...prev, [targetUserId]: true }));
      alert('Failed to unfollow user. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, [targetUserId]: false }));
    }
  };
  
  // Navigate to user profile
  const handleUserPress = (targetUserId) => {
    if (targetUserId === currentUser?.$id) {
      router.push('/profile');
    } else {
      router.push(`/profile?userId=${targetUserId}`);
    }
  };
  
  // Render user item
  const renderUserItem = ({ item }) => {
    const isCurrentUser = item.userId === currentUser?.$id;
    const isFollowingUser = followStates[item.userId] || false;
    const isActionLoading = actionLoading[item.userId] || false;
    
    return (
      <Pressable
        style={[styles.userItem, { backgroundColor: theme.cardBackground }]}
        onPress={() => handleUserPress(item.userId)}
      >
        <View style={styles.userInfo}>
          <Image
            source={
              item.profileImage
                ? { uri: item.profileImage }
                : require('../../../assets/icon.png')
            }
            style={styles.avatar}
          />
          <View style={styles.userText}>
            <ThemedText style={styles.username}>{item.username}</ThemedText>
            {isCurrentUser && (
              <ThemedText style={[styles.badge, { color: theme.textSecondary }]}>You</ThemedText>
            )}
          </View>
        </View>
        
        {!isCurrentUser && (
          <View style={styles.actionButton}>
            {isActionLoading ? (
              <ActivityIndicator size="small" color={theme.textSecondary} />
            ) : isFollowingUser ? (
              <ThemedButton
                style={[styles.followButton, styles.followingButton, { backgroundColor: theme.uiBackground, borderColor: theme.divider }]}
                onPress={() => handleUnfollow(item.userId)}
              >
                <ThemedText style={{ color: theme.textPrimary, fontSize: 14 }}>Following</ThemedText>
              </ThemedButton>
            ) : (
              <ThemedButton
                style={[styles.followButton, { backgroundColor: Colors.primary }]}
                onPress={() => handleFollow(item.userId)}
              >
                <ThemedText style={{ color: '#fff', fontSize: 14 }}>Follow</ThemedText>
              </ThemedButton>
            )}
          </View>
        )}
      </Pressable>
    );
  };
  
  // Render empty state
  const renderEmpty = () => {
    if (loading) return null;
    
    return (
      <View style={styles.emptyState}>
        <Ionicons
          name={isFollowersView ? 'people-outline' : 'person-add-outline'}
          size={48}
          color={theme.textSecondary}
        />
        <ThemedText style={styles.emptyText}>
          {isFollowersView ? 'No followers yet' : 'Not following anyone yet'}
        </ThemedText>
      </View>
    );
  };
  
  // Render footer (loading more indicator)
  const renderFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color={theme.textSecondary} />
      </View>
    );
  };
  
  return (
    <ThemedView style={styles.container} safe={true}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </Pressable>
        <View style={styles.headerTitle}>
          <ThemedText style={styles.title}>
            {isFollowersView ? 'Followers' : 'Following'}
          </ThemedText>
          {username && (
            <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
              @{username}
            </ThemedText>
          )}
        </View>
        <View style={styles.headerSpacer} />
      </View>
      
      {/* Users List */}
      {loading && users.length === 0 ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={theme.textSecondary} />
          <ThemedText style={{ marginTop: 12, color: theme.textSecondary }}>Loading...</ThemedText>
        </View>
      ) : (
        <FlatList
          data={users}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.userId}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
        />
      )}
    </ThemedView>
  );
};

export default FollowList;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    alignItems: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  title: {
    fontFamily: 'inter',
    fontWeight: 'bold',
    fontSize: 18,
  },
  subtitle: {
    fontFamily: 'inter',
    fontWeight: '500',
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  userText: {
    marginLeft: 12,
    flex: 1,
  },
  username: {
    fontFamily: 'inter',
    fontWeight: '600',
    fontSize: 16,
  },
  badge: {
    fontFamily: 'inter',
    fontWeight: '500',
    fontSize: 12,
    marginTop: 2,
  },
  actionButton: {
    marginLeft: 12,
  },
  followButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  followingButton: {
    borderWidth: 2,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    gap: 12,
  },
  emptyText: {
    fontFamily: 'inter',
    fontWeight: '500',
    fontSize: 16,
    textAlign: 'center',
  },
  loadingMore: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
