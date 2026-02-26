import { Query } from "react-native-appwrite";
import { DATABASE_ID, databases, SNIPPETS_COLLECTION_ID, USERS_COLLECTION_ID } from "./appwrite";

export async function searchSnippets(query) {
  try {
    // Return empty array if query is empty
    if (!query || query.trim() === '') {
      return [];
    }

    const trimmedQuery = query.trim();

    // Use Query.search() for efficient full-text search across multiple fields
    // Search in title, genre, and username fields
    const response = await databases.listDocuments(
      DATABASE_ID,
      SNIPPETS_COLLECTION_ID,
      [
        Query.or([
          Query.search('title',trimmedQuery),
          Query.search('genre',trimmedQuery),
          Query.search('username',trimmedQuery),
        ]),
        Query.orderDesc('createdAt'),
        Query.limit(50),
      ]
    );

    return response.documents;
  } catch (error) {
    console.error("Failed to search snippets:", error);

    // If Query.search() fails (e.g., indexes not configured), fall back to Query.contains()
    // This is less efficient but will work without indexes
    try {
      console.warn("Falling back to Query.contains() for snippet search");
      const trimmedQuery = query.trim();

      const response = await databases.listDocuments(
      DATABASE_ID,
      SNIPPETS_COLLECTION_ID,
      [
        Query.or([
          Query.contains('title',trimmedQuery),
          Query.contains('genre',trimmedQuery),
          Query.contains('username',trimmedQuery),
        ]),
        Query.orderDesc('createdAt'),
        Query.limit(50),
      ]
    );

    return response.documents;
    } catch (fallbackError) {
      console.error("Fallback search also failed:", fallbackError);
      throw new Error(fallbackError?.message || "Failed to search snippets");
    }
  }
}

export async function searchUsers(query) {
  try {
    // Return empty array if query is empty
    if (!query || query.trim() === '') {
      return [];
    }

    const trimmedQuery = query.trim();

    // Use Query.search() for efficient full-text search across multiple fields
    // Search the 'users' collection
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        [
          Query.or([
            Query.search('username',trimmedQuery),
            Query.search('name',trimmedQuery),
          ]),
          Query.limit(30),
        ]
      );

      return response.documents.map(user => ({
        userId: user.userId || user.$id,
        username: user.username || "User",
        name: user.name || user.username || "User",
        profileImage: user.profileImage || null,
      }));
    } catch (error) {
      console.warn("Users collection search failed, trying fallback with Query.contains():", error);

      // Fallback 1: Try Query.contains() on users collection
      try {
        const response = await databases.listDocuments(
          DATABASE_ID,
          USERS_COLLECTION_ID,
          [
            Query.or([
              Query.contains('username', trimmedQuery),
              Query.contains('name', trimmedQuery),
            ]),
            Query.limit(30),
          ]
        );

        return response.documents.map(user => ({
          userId: user.userId || user.$id,
          username: user.username || 'User',
          name: user.name || user.username || 'User',
          profileImage: user.profileImage || null,
        }));
      } catch (fallbackError) {
          console.warn("Users collection Query.contains() also failed:", fallbackError);
      }
    }

    // Fallback 2: Search through snippets to find unique users
    console.log("Falling back to snippet-based user search");
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        SNIPPETS_COLLECTION_ID,
        [
          Query.search('username', trimmedQuery),
          Query.limit(100), // Get more to deduplicate
        ]
      );

      // Deduplicate users by ownerId
      const uniqueUsers = new Map();
      response.documents.forEach(snippet => {
        if (!uniqueUsers.has(snippet.ownerId)) {
          uniqueUsers.set(snippet.ownerId, {
            userId: snippet.ownerId,
            username: snippet.username || 'User',
            name: snippet.username || 'User',
            profileImage: snippet.profileImage || null,
          });
        }
      });

      return Array.from(uniqueUsers.values()).slice(0, 30);
    } catch (snippetError) {
        console.error("Snippet-based user search also failed:", snippetError);
    }

    // Final fallback: Try Query.contains() on snippets
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        SNIPPETS_COLLECTION_ID,
        [
          Query.contains('username', trimmedQuery),
          Query.limit(100),
        ]
      );

      const uniqueUsers = new Map();
      response.documents.forEach(snippet => {
        if (!uniqueUsers.has(snippet.ownerId)) {
          uniqueUsers.set(snippet.ownerId, {
            userId: snippet.ownerId,
            username: snippet.username || 'User',
            name: snippet.username || 'User',
            profileImage: snippet.profileImage || null,
          });
        }
      });

      return Array.from(uniqueUsers.values()).slice(0, 30);
    } catch (finalError) {
      console.error("All user search methods failed:", finalError);
      throw new Error(finalError?.message || "Failed to search users");
    }
  } catch (error) {
    console.error("Failed to search users:", error);
    throw new Error(error?.message || "Failed to search users");
  }
}

export async function searchAll(query) {
  try {
    if (!query || query.trim() === '') {
      return {
        users: [],
        snippets: [],
      };
    }

    // Run both searches in parallel
    const [snippets, users] = await Promise.all([
      searchSnippets(query),
      searchUsers(query),
    ]);

    return { users, snippets };
  } catch (error) {
    console.error("Failed to search all:", error);
    throw new Error(error?.message || "Failed to perform search");  
  }
}