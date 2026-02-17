import { databases, DATABASE_ID } from './appwrite';
import { Query } from 'react-native-appwrite';

/**
 * Get user profile data by userId
 * Tries multiple sources: snippets, follows (as follower), comments
 * @param {string} userId - The user ID to fetch data for
 * @returns {Promise<{username: string, profileImage: string|null}>}
 */
export async function getUserProfileData(userId) {
  try {
    if (!userId) {
      throw new Error('userId is required');
    }

    console.log('Fetching profile data for userId:', userId);

    // Strategy 1: Try to get from their snippets (most up-to-date)
    try {
      const snippets = await databases.listDocuments(
        DATABASE_ID,
        'snippets',
        [
          Query.equal('ownerId', [userId]),
          Query.limit(1),
          Query.orderDesc('$createdAt'),
        ]
      );

      if (snippets.documents.length > 0) {
        const snippet = snippets.documents[0];
        console.log('Found user data from snippet');
        return {
          username: snippet.username || 'User',
          profileImage: snippet.profileImage || null,
        };
      }
    } catch (err) {
      console.warn('Failed to fetch from snippets:', err);
    }

    // Strategy 2: Try to get from follows where they are the follower
    try {
      const follows = await databases.listDocuments(
        DATABASE_ID,
        'follows',
        [
          Query.equal('followerId', [userId]),
          Query.limit(1),
          Query.orderDesc('createdAt'),
        ]
      );

      if (follows.documents.length > 0) {
        const follow = follows.documents[0];
        if (follow.followerUsername) {
          console.log('Found user data from follows (as follower)');
          return {
            username: follow.followerUsername,
            profileImage: follow.followerProfileImage || null,
          };
        }
      }
    } catch (err) {
      console.warn('Failed to fetch from follows:', err);
    }

    // Strategy 3: Try to get from comments
    try {
      const comments = await databases.listDocuments(
        DATABASE_ID,
        'comments',
        [
          Query.equal('userId', [userId]),
          Query.limit(1),
          Query.orderDesc('$createdAt'),
        ]
      );

      if (comments.documents.length > 0) {
        const comment = comments.documents[0];
        console.log('Found user data from comments');
        return {
          username: comment.username || 'User',
          profileImage: comment.profileImage || null,
        };
      }
    } catch (err) {
      console.warn('Failed to fetch from comments:', err);
    }

    // If all strategies fail, return defaults
    console.log('No user data found, using defaults');
    return {
      username: 'User',
      profileImage: null,
    };
  } catch (error) {
    console.error('Failed to get user profile data:', error);
    return {
      username: 'User',
      profileImage: null,
    };
  }
}
