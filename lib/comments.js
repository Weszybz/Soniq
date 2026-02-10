import { Query } from "react-native-appwrite";
import { databases, ID, account, DATABASE_ID, COMMENTS_COLLECTION_ID } from "./appwrite";

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
