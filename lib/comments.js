import { Query } from "react-native-appwrite";
import { databases, ID, account, DATABASE_ID, COMMENTS_COLLECTION_ID } from "./appwrite";

export async function syncProfileImageToComments(userId, profileImageUrl) {
    try {
        let totalUpdated = 0;
        let cursor = null;
        const limit = 100;

        // Loop through all user's snippets with pagination
        do {
        const queries = [
            Query.equal('userId', [userId]),
            Query.limit(limit)
        ];

        // Add cursor for pagination if available
        if (cursor) {
            queries.push(Query.cursorAfter(cursor));
        }

        // Fetch batch of snippets
        const response = await databases.listDocuments(
            DATABASE_ID,
            SNIPPETS_COLLECTION_ID,
            queries
        );

        // Update each snippet in this batch
        const updatePromises = response.documents.map(snippet =>
            databases.updateDocument(
            DATABASE_ID,
            COMMENTS_COLLECTION_ID,
            comment.$id,
            { profileImage: profileImageUrl }
            )
        );

        await Promise.all(updatePromises);
        totalUpdated += response.documents.length;

        // Check if there are more documents
        if (response.documents.length === limit) {
            // Set cursor to last document's ID for next iteration
            cursor = response.documents[response.documents.length - 1].$id;
        } else {
            // No more documents to process
            cursor = null;
        }
        } while (cursor);

        console.log(`Successfully synced profile image to ${totalUpdated} snippets`);
        return { success: true, updatedCount: totalUpdated };
    } catch (error) {
        console.error('Failed to sync profile image to snippets:', error);
        return {
        success: false,
        updatedCount: 0,
        error: error.message || 'Unkown error occurred'
        };
    }
};


export async function listCommentsBySnippet(snippetId) {
    try {
        const response = await databases.listDocuments(
            DATABASE_ID,
            COMMENTS_COLLECTION_ID,
            [
                Query.equal("snippetId", snippetId),
                Query.orderAsc("$createdAt")
            ]
        );
        return response.documents;
    } catch (error) {
        console.error("Failed to list comments:", error);
        throw new Error(error?.messaage || "Failed to fetch comments");
    }
}

export async function createComment({ snippetId, content, parentCommentId = null, timestamp = 0 }) {
    try {
        if (!snippetId || !content?.trim()) {
            throw new Error("snippetId and content are required");
        }

        const user = await account.get();

        if (!user) {
            throw new Error("User not autheniticated");
        }

        const username = user.prefs?.username || "Anonymous";
        const profileImage = user.prefs?.profileImage || null;

        const doc = await databases.createDocument(
            DATABASE_ID,
            COMMENTS_COLLECTION_ID,
            ID.unique(),
            {
                snippetId,
                parentCommentId: parentCommentId || null,
                userId: user.$id,
                username,
                profileImage,
                content: content.trim(),
                likes: 0,
                likedBy: [],
                timestamp
            }
        );
        return doc;
    } catch (error) {
        console.error("Failed to create comment:", error);
        throw new Error(error?.message || "Failed to crearre comment");
    }
}

export async function toggleCommentLike(commentId, isLiked, userId) {
  try {
    if (!commentId || !userId) {
      throw new Error("commentId and userId are required");
    }

    const currentComment = await databases.getDocument(
      DATABASE_ID,
      COMMENTS_COLLECTION_ID,
      commentId
    );

    const currentLikes = currentComment.likes || 0;
    const currentLikedBy = currentComment.likedBy || [];

    let newLikes;
    let newLikedBy;

    if (isLiked) {
      newLikes = Math.max(0, currentLikes - 1);
      newLikedBy = currentLikedBy.filter(id => id !== userId);
    } else {
      newLikes = currentLikes + 1;
      newLikedBy = currentLikedBy.includes(userId) 
        ? currentLikedBy 
        : [...currentLikedBy, userId];
    }

    const updated = await databases.updateDocument(
      DATABASE_ID,
      COMMENTS_COLLECTION_ID,
      commentId,
      {
        likes: newLikes,
        likedBy: newLikedBy
      }
    );

    return updated;
  } catch (error) {
    console.error("Failed to toggle comment like:", error);
    throw new Error(error?.message || "Failed to update comment like");
  }
}

export async function listCommentsBySnippetIds(snippetIds) {
    try {
        if (!snippetIds || snippetIds.length === 0) {
            return [];
        }

        // Appwrite has query limits, so we chunk snippet IDs
        const CHUNK_SIZE = 25;
        const chunks = [];

        for (let i = 0; i < snippetIds.length; i += CHUNK_SIZE) {
            chunks.push(snippetIds.slice(i, i + CHUNK_SIZE));
        }

        // Fetch comments for each chunk in parallel
        const chunkPromises = chunks.map(async (chunk) => {
            let allComments = [];
            let cursor = null;
            const limit = 100;

            // Paginat through result for this chunk
            do {
                const queries = [
                    Query.equal("snippetId", chunk),
                    Query.orderDesc("$createdAt"),
                    Query.limit(limit)
                ];

                if (cursor) {
                    queries.push(Query.cursorAfter(cursor));
                }

                const response = await databases.listDocuments(
                    DATABASE_ID,
                    COMMENTS_COLLECTION_ID,
                    queries
                );

                allComments = [...allComments, ...response.documents];

                // Check if there are more documents
                if (response.documents.length === limit) {
                    cursor = response.documents[response.documents.length - 1].$id;
                } else {
                    cursor = null;
                }
            } while (cursor);

            return allComments;
        });

        // Wait for all chucks to complete
        const chuckResults = await Promise.all(chunkPromises);

        // Merge all results and sort by creation time (newest first)
        const allComments = chuckResults.flat();
        allComments.sort((a, b) => new Date(b.$createdAt) - new Date(a.$createdAt));

        return allComments;
    } catch (error) {
        console.error("Failed to list comments by snippet IDs:", error);
        throw new Error(error?.messaage || "Failed to fetch comments");
    }
}

export async function incrementCommentLikes(commentId) {
    try {
        if (!commentId) {
            throw new Error("commentId is required");
        }

        const currentComment = await databases.getDocument(
            DATABASE_ID,
            COMMENTS_COLLECTION_ID,
            commentId,
        );

        const currentLikes = currentComment.likes || 0;

        const updated = await databases.updateDocument(
            DATABASE_ID,
            COMMENTS_COLLECTION_ID,
            commentId,
            {
                likes: currentLikes + 1
            }
        );
        return updated;
    } catch (error) {
        console.error("Failed to increment comment likes:", error);
        throw new Error(error?.message || "Failed to update comment likes");
    }
}
