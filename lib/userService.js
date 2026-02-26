import { databases, DATABASE_ID, USERS_COLLECTION_ID } from './appwrite';
import { Query } from 'react-native-appwrite';

export async function ensureUserDocument(userId, userData) {
  try {
    if (!userId) {
      throw new Error('userId is required');
    }

    if (!userData.username) {
      throw new Error('username is required');
    }

    // Try to get existing user document
    try {
      const existingUsers = await databases.listDocuments(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        [
          Query.equal('userId', [userId]),
          Query.limit(1),
        ]
      );

      // If user document exists, update it
      if (existingUsers.documents.length > 0) {
        const existingDoc = existingUsers.documents[0];
        console.log('Updating existing user document:', existingDoc.$id);
        
        const updated = await databases.updateDocument(
          DATABASE_ID,
          USERS_COLLECTION_ID,
          existingDoc.$id,
          {
            username: userData.username,
            name: userData.name || userData.username,
            profileImage: userData.profileImage || null,
          }
        );
        
        console.log('User document updated successfully');
        return updated;
      }
    } catch (err) {
      // Document doesn't exist or query failed
      console.log('No existing user document found, creating new one');
    }

    // Create new user document with userId as the document ID
    const newUser = await databases.createDocument(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      userId,
      {
        userId: userId,
        username: userData.username,
        name: userData.name || userData.username,
        profileImage: userData.profileImage || null,
      }
    );

    console.log('User document created successfully');
    return newUser;
  } catch (error) {
    console.error('Failed to ensure user document:', error);
    throw new Error(error?.message || 'Failed to create/update user document');
  }
}

export async function updateUserProfile(userId, updates) {
  try {
    if (!userId) {
      throw new Error('userId is required');
    }

    if (!updates || Object.keys(updates).length === 0) {
      throw new Error('No updates provided');
    }

    // Try to update using userId as document ID
    try {
      const updated = await databases.updateDocument(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        userId,
        updates
      );
      
      console.log('User profile updated successfully');
      return updated;
    } catch (err) {
      // If document doesn't exist with userId as ID, try to find it by userId field
      console.warn('Direct update failed, searching for user document');
      
      const existingUsers = await databases.listDocuments(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        [
          Query.equal('userId', [userId]),
          Query.limit(1),
        ]
      );

      if (existingUsers.documents.length === 0) {
        throw new Error('User document not found. Please ensure user document exists.');
      }

      const updated = await databases.updateDocument(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        existingUsers.documents[0].$id,
        updates
      );
      
      console.log('User profile updated successfully');
      return updated;
    }
  } catch (error) {
    console.error('Failed to update user profile:', error);
    throw new Error(error?.message || 'Failed to update user profile');
  }
}

export async function getUserDocument(userId) {
  try {
    if (!userId) {
      throw new Error('userId is required');
    }

    // Try direct lookup first (most efficient)
    try {
      const userDoc = await databases.getDocument(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        userId
      );
      return userDoc;
    } catch (err) {
      // If not found by document ID, try querying by userId field
      const response = await databases.listDocuments(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        [
          Query.equal('userId', [userId]),
          Query.limit(1),
        ]
      );

      return response.documents.length > 0 ? response.documents[0] : null;
    }
  } catch (error) {
    console.error('Failed to get user document:', error);
    return null;
  }
}

export async function getUserProfileData(userId) {
  try {
    if (!userId) {
      throw new Error('userId is required');
    }

    console.log('Fetching profile data for userId:', userId);

    // Try to get from users collection (preferred)
    const userDoc = await getUserDocument(userId);
    if (userDoc) {
      console.log('Found user data from users collection');
      return {
        username: userDoc.username || 'User',
        profileImage: userDoc.profileImage || null,
        name: userDoc.name || userDoc.username || 'User',
      };
    }

    console.log('User document not found, falling back to other sources');

    // Try to get from their snippets (most up-to-date)
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

    // Try to get from follows where they are the follower
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

    // Try to get from comments
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
