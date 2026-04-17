import * as DocumentPicker from "expo-document-picker";
import { Query } from "react-native-appwrite";
import { storage, databases, ID, account, AUDIO_BUCKET_ID, DATABASE_ID, SNIPPETS_COLLECTION_ID, APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID } from "./appwrite";
import { createNotification } from "./notificationService";

function buildViewUrl(fileId) {
  return `${APPWRITE_ENDPOINT}/storage/buckets/${AUDIO_BUCKET_ID}/files/${fileId}/view?project=${APPWRITE_PROJECT_ID}`;
}

function _mergeAndSort(...arrays) {
  const seen = new Set();
  const merged = [];

  for (const arr of arrays) {
    for (const s of arr) {
      if (!seen.has(s.$id)) {
        seen.add(s.$id);
        merged.push(s);
      }
    }
  }

  merged.sort((a, b) => {
    const tA = a.$createdAt ?? a.createdAt ?? "";
    const tB = b.$createdAt ?? b.createdAt ?? "";
    return tB.localeCompare(tA);
  });

  return merged;
}

export async function pickAndUploadSnippet({ title, genre, username, profileImage, collaborator = null }) {
  // Pick an audio file
  const res = await DocumentPicker.getDocumentAsync({
    type: ["audio/*"],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (res.canceled) return null;

  const asset = res.assets?.[0];
  if (!asset?.uri) throw new Error("No file selected.");

  // Basic info + optional size cap (helps keep snippets lightweight)
  const size = asset.size ?? 0;

  // Optional: 25MB limit for MVP
  if (size > 25 * 1024 * 1024) {
    throw new Error("File too large (max 25MB). Try a shorter snippet.");
  }

  const fileObj = {
    uri: asset.uri,
    name: asset.name ?? `snippet-${Date.now()}.mp3`,
    type: asset.mimeType ?? "audio/mpeg",
    size,
  };

  // Upload to Appwrite Storage
  const uploaded = await storage.createFile(AUDIO_BUCKET_ID, ID.unique(), fileObj);
  const fileId = uploaded.$id;
  const fileUrl = buildViewUrl(fileId);

  // Create DB document for the snippet
  const user = await account.get();

  const doc = await databases.createDocument(
    DATABASE_ID,
    SNIPPETS_COLLECTION_ID,
    ID.unique(),
    {
      title,
      genre,
      username,
      profileImage,
      fileId,
      fileUrl,
      ownerId: user.$id,
      createdAt: new Date().toISOString(),
      mimeType: fileObj.type,
      size,
      likes: 0,
      likedBy: [],
      commentsCount: 0,
      shares: 0,
      collaboratorUserId: collaborator?.userId ?? null,
      collaboratorUsername: collaborator?.username ?? null,
    }
  );

  return { doc, fileId, fileUrl };
}


export async function uploadSnippetAsset(asset, { title, genre, username, profileImage, collaborator = null }) {
  if (!asset?.uri) throw new Error("No file provided.");

  const size = asset.size ?? 0;
  if (size > 25 * 1024 * 1024) {
    throw new Error("File too large (max 25MB). Try a shorter snippet.");
  }

  const fileObj = {
    uri: asset.uri,
    name: asset.name ?? `snippet-${Date.now()}.mp3`,
    type: asset.mimeType ?? "audio/mpeg",
    size,
  };

  const uploaded = await storage.createFile(AUDIO_BUCKET_ID, ID.unique(), fileObj);
  const fileId = uploaded.$id;
  const fileUrl = buildViewUrl(fileId);

  const user = await account.get();

  const doc = await databases.createDocument(
    DATABASE_ID,
    SNIPPETS_COLLECTION_ID,
    ID.unique(),
    {
      title,
      genre,
      username,
      profileImage,
      fileId,
      fileUrl,
      ownerId: user.$id,
      createdAt: new Date().toISOString(),
      mimeType: fileObj.type,
      size,
      likes: 0,
      likedBy: [],
      commentsCount: 0,
      shares: 0,
      collaboratorUserId: collaborator?.userId ?? null,
      collaboratorUsername: collaborator?.username ?? null,
    }
  );

  return { doc, fileId, fileUrl };
}

export async function listSnippets() {
  const response = await databases.listDocuments(
    DATABASE_ID,
    SNIPPETS_COLLECTION_ID,
    [
      Query.orderDesc("createdAt")
    ]
  );

  return response.documents;
}

export async function listSnippetsByUser(userId) {
  if (!userId) {
    throw new Error("userId is required");
  }

  const response = await databases.listDocuments(
    DATABASE_ID,
    SNIPPETS_COLLECTION_ID,
    [
      Query.equal("ownerId", [userId]),
      Query.orderDesc("createdAt")
    ]
  );
  return response.documents;
}

export async function listSnippetsByOwnerOrCollaborator(userId) {
  if (!userId) throw new Error("userId is required");

  const [ownedRes, collaboratedRes] = await Promise.all([
    databases.listDocuments(DATABASE_ID, SNIPPETS_COLLECTION_ID, [
      Query.equal("ownerId", [userId]),
      Query.orderDesc("createdAt"),
    ]),
    databases.listDocuments(DATABASE_ID, SNIPPETS_COLLECTION_ID, [
      Query.equal("collaboratorUserId", [userId]),
      Query.orderDesc("createdAt"),
    ]),
  ]);

  return _mergeAndSort(ownedRes.documents, collaboratedRes.documents);
}

export async function listCollaborativeSnippetsByUser(userId) {
  if (!userId) throw new Error("userId is required");

  const [ownedRes, collaboratedRes] = await Promise.all([
    databases.listDocuments(DATABASE_ID, SNIPPETS_COLLECTION_ID, [
      Query.equal("ownerId", [userId]),
      Query.orderDesc("createdAt"),
    ]),
    databases.listDocuments(DATABASE_ID, SNIPPETS_COLLECTION_ID, [
      Query.equal("collaboratorUserId", [userId]),
      Query.orderDesc("createdAt"),
    ]),
  ]);

  // From owned snippets, only include those that actually have a collaborator set
  const ownedWithCollab = ownedRes.documents.filter((s) => s.collaboratorUserId);

  return _mergeAndSort(ownedWithCollab, collaboratedRes.documents);
}

export async function listSnippetsByCollaborator(userId) {
  if (!userId) throw new Error("userId is required");

  const response = await databases.listDocuments(
    DATABASE_ID,
    SNIPPETS_COLLECTION_ID,
    [
      Query.equal("collaboratorUserId", [userId]),
      Query.orderDesc("createdAt"),
    ]
  );

  return response.documents;
}

export async function toggleSnippetLike(snippetId, isLiked, currentCount, userId, likedBy = [], snippetMeta = {}) {
  const newCount = isLiked ? Math.max(0, currentCount - 1) : currentCount + 1;

  let updatedLikedBy;
  if(isLiked) {
    updatedLikedBy = likedBy.filter(id => id !== userId);
  } else {
    updatedLikedBy = likedBy.includes(userId) ? likedBy : [...likedBy, userId];
  }

  const updated = await databases.updateDocument(
    DATABASE_ID,
    SNIPPETS_COLLECTION_ID,
    snippetId,
    {
      likes: newCount,
      likedBy: updatedLikedBy,
    }
  );

  if (!isLiked && snippetMeta.ownerId && snippetMeta.ownerId !== userId) {
    const user = await account.get();
    createNotification({
      recipientId: snippetMeta.ownerId,
      senderId: userId,
      senderUsername: user.prefs?.username || user.name || 'Someone',
      senderProfileImage: user.prefs?.profileImage || null,
      type: 'like',
      snippetId,
      snippetTitle: snippetMeta.title || null,
      content: `liked your snippet${snippetMeta.title ? ` "${snippetMeta.title}"` : ''}`,
    });
  }
  
  return updated;
}

export async function updateSnippetCommentCount(snippetId, newCount) {
  const updated = await databases.updateDocument(
    DATABASE_ID,
    SNIPPETS_COLLECTION_ID,
    snippetId,
    {
      commentsCount: Math.max(0, newCount)
    }
  )
  return updated;
}

export async function incrementSnippetCommentsCount(snippetId, delta = 1) {
  try {
    if (!snippetId) {
      throw new Error("snippetId is required");
    }

    const currentSnippet = await databases.getDocument(
      DATABASE_ID,
      SNIPPETS_COLLECTION_ID,
      snippetId
    );

    const currentCount = currentSnippet.commentsCount ?? 0;
    const newCount = Math.max(0, currentCount + delta);

    const updated = await databases.updateDocument(
      DATABASE_ID,
      SNIPPETS_COLLECTION_ID,
      snippetId,
      {
        commentsCount: newCount
      }
    );
    return updated;
  } catch (error) {
    console.error("Failed to increment cnippet comment count:", error);
    throw new Error(error?.message || "Failed to update snippet comment count");
  }
}

export async function incrementSnippetShare(snippetId, currentCount) {
  const newCount = currentCount + 1;

  const updated = await databases.updateDocument(
    DATABASE_ID,
    SNIPPETS_COLLECTION_ID,
    snippetId,
    {
      shares: newCount
    }
  )
  return updated;
}

export async function listSnippetsLikedByUser(userId) {
  if (!userId) {
    throw new Error("userId is required");
  }

  const response = await databases.listDocuments(
    DATABASE_ID,
    SNIPPETS_COLLECTION_ID,
    [
      Query.contains("likedBy", userId),
      Query.orderDesc("$updatedAt")
    ]
  );

  return response.documents;
}