import { databases, ID, DATABASE_ID } from './appwrite';
import { Query } from 'react-native-appwrite';
import { getUserProfileData } from './userService';
import { createNotification } from './notificationService';

const FOLLOWS_COLLECTION_ID = 'follows';


export async function getFollowersCount(userId) {
  try {
    const result = await databases.listDocuments(
      DATABASE_ID,
      FOLLOWS_COLLECTION_ID,
      [
        Query.equal('followingId', [userId]),
        Query.limit(1),
      ]
    );
    return result.total || 0;
  } catch (error) {
    console.error('Failed to get followers count:', error);
    return 0;
  }
}

export async function getFollowingCount(userId) {
  try {
    const result = await databases.listDocuments(
      DATABASE_ID,
      FOLLOWS_COLLECTION_ID,
      [
        Query.equal('followerId', [userId]),
        Query.limit(1),
      ]
    );
    return result.total || 0;
  } catch (error) {
    console.error('Failed to get following count:', error);
    return 0;
  }
}


export async function isFollowing(followerId, followingId) {
  try {
    const result = await databases.listDocuments(
      DATABASE_ID,
      FOLLOWS_COLLECTION_ID,
      [
        Query.equal('followerId', [followerId]),
        Query.equal('followingId', [followingId]),
        Query.limit(1),
      ]
    );
    return result.documents.length > 0;
  } catch (error) {
    console.error('Failed to check if following:', error);
    return false;
  }
}

export async function followUser(followerId, followingId, followerUsername = 'User', followerProfileImage = null) {
  try {
    // Prevent following yourself
    if (followerId === followingId) {
      throw new Error('Cannot follow yourself');
    }

    // Check if already following to prevent duplicates
    const alreadyFollowing = await isFollowing(followerId, followingId);
    if (alreadyFollowing) {
      throw new Error('Already following this user');
    }

    // Create the follow relationship with denormalized user data
    const follow = await databases.createDocument(
      DATABASE_ID,
      FOLLOWS_COLLECTION_ID,
      ID.unique(),
      {
        followerId,
        followingId,
        followerUsername,
        followerProfileImage,
        createdAt: new Date().toISOString(),
      }
    );

    createNotification({
      recipientId: followingId,
      senderId: followerId,
      senderUsername: followerUsername,
      senderProfileImage: followerProfileImage,
      type: 'follow',
      content: 'started following you',
    });    

    return follow;
  } catch (error) {
    console.error('Failed to follow user:', error);
    throw error;
  }
}

export async function unfollowUser(followerId, followingId) {
  try {
    // Find the follow document
    const result = await databases.listDocuments(
      DATABASE_ID,
      FOLLOWS_COLLECTION_ID,
      [
        Query.equal('followerId', [followerId]),
        Query.equal('followingId', [followingId]),
        Query.limit(1),
      ]
    );

    if (result.documents.length === 0) {
      throw new Error('Not following this user');
    }

    // Delete the follow document
    await databases.deleteDocument(
      DATABASE_ID,
      FOLLOWS_COLLECTION_ID,
      result.documents[0].$id
    );
  } catch (error) {
    console.error('Failed to unfollow user:', error);
    throw error;
  }
}

export async function getFollowCounts(userId) {
  try {
    const [followers, following] = await Promise.all([
      getFollowersCount(userId),
      getFollowingCount(userId),
    ]);

    return { followers, following };
  } catch (error) {
    console.error('Failed to get follow counts:', error);
    return { followers: 0, following: 0 };
  }
}

export async function getFollowersList(userId, limit = 25, offset = 0) {
  try {
    const result = await databases.listDocuments(
      DATABASE_ID,
      FOLLOWS_COLLECTION_ID,
      [
        Query.equal('followingId', [userId]),
        Query.limit(limit),
        Query.offset(offset),
        Query.orderDesc('createdAt'),
      ]
    );

    // Map documents to user data objects
    const followers = result.documents.map(doc => ({
      userId: doc.followerId,
      username: doc.followerUsername || 'User',
      profileImage: doc.followerProfileImage || null,
    }));

    return {
      followers,
      total: result.total || 0,
      hasMore: (offset + limit) < (result.total || 0),
    };
  } catch (error) {
    console.error('Failed to get followers list:', error);
    return { followers: [], total: 0, hasMore: false };
  }
}

export async function getFollowingList(userId, limit = 25, offset = 0) {
  try {
    const result = await databases.listDocuments(
      DATABASE_ID,
      FOLLOWS_COLLECTION_ID,
      [
        Query.equal('followerId', [userId]),
        Query.limit(limit),
        Query.offset(offset),
        Query.orderDesc('createdAt'),
      ]
    );

    // For following list, we need to fetch the data of the users being followed
    // Return just the IDs so they can be fetched with getUsersData
    return {
      followingIds: result.documents.map(doc => doc.followingId),
      total: result.total || 0,
      hasMore: (offset + limit) < (result.total || 0),
    };
  } catch (error) {
    console.error('Failed to get following list:', error);
    return { followingIds: [], total: 0, hasMore: false };
  }
}

export async function getUsersData(userIds) {
  try {
    if (!userIds || userIds.length === 0) {
      return [];
    }

    // Fetch user data for each ID using the centralized service
    const userDataPromises = userIds.map(async (userId) => {
      try {
        const userData = await getUserProfileData(userId);
        return {
          userId,
          username: userData.username,
          profileImage: userData.profileImage,
        };
      } catch (err) {
        console.error(`Failed to fetch data for user ${userId}:`, err);
        return {
          userId,
          username: 'User',
          profileImage: null,
        };
      }
    });

    const usersData = await Promise.all(userDataPromises);
    return usersData;
  } catch (error) {
    console.error('Failed to get users data:', error);
    return [];
  }
}
