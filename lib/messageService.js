import * as DocumentPicker from "expo-document-picker";
import { Query } from "react-native-appwrite";
import { databases, storage, account, ID, DATABASE_ID, CONVERSATIONS_COLLECTION_ID, MESSAGES_COLLECTION_ID, MESSAGE_BUCKET_ID, APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID } from "./appwrite";


function buildMessageFileUrl(fileId) {
  return `${APPWRITE_ENDPOINT}/storage/buckets/${MESSAGE_BUCKET_ID}/files/${fileId}/view?project=${APPWRITE_PROJECT_ID}`;
}

export async function getOrCreateConversation(myId, otherUserId, myUsername, myImage, otherUsername, otherImage) {
  // Search for existing conversation where both users are participants
  const res = await databases.listDocuments(DATABASE_ID, CONVERSATIONS_COLLECTION_ID, [
    Query.contains("participantIds", [myId]),
  ]);

  const existing = res.documents.find(
    (doc) => doc.participantIds.includes(myId) && doc.participantIds.includes(otherUserId)
  );

  if (existing) return existing;

  const doc = await databases.createDocument(
    DATABASE_ID,
    CONVERSATIONS_COLLECTION_ID,
    ID.unique(),
    {
      participantIds: [myId, otherUserId],
      participantUsernames: [myUsername, otherUsername],
      participantImages: [myImage || "", otherImage || ""],
      lastMessage: "",
      lastMessageAt: new Date().toISOString(),
      lastSenderId: myId,
      unreadCount: 0,
    }
  );

  return doc;
}

export async function listConversations(userId) {
  const res = await databases.listDocuments(DATABASE_ID, CONVERSATIONS_COLLECTION_ID, [
    Query.contains("participantIds", [userId]),
    Query.orderDesc("lastMessageAt"),
    Query.limit(50),
  ]);
  return res.documents;
}

async function updateConversationLastMessage(conversationId, senderId, content) {
  await databases.updateDocument(DATABASE_ID, CONVERSATIONS_COLLECTION_ID, conversationId, {
    lastMessage: content,
    lastMessageAt: new Date().toISOString(),
    lastSenderId: senderId,
  });
}

// --- Messages ---

export async function listMessages(conversationId) {
  const res = await databases.listDocuments(DATABASE_ID, MESSAGES_COLLECTION_ID, [
    Query.equal("conversationId", conversationId),
    Query.orderAsc("createdAt"),
    Query.limit(100),
  ]);
  return res.documents;
}

export async function sendTextMessage(conversationId, content) {
  const user = await account.get();

  const msg = await databases.createDocument(
    DATABASE_ID,
    MESSAGES_COLLECTION_ID,
    ID.unique(),
    {
      conversationId,
      senderId: user.$id,
      senderUsername: user.prefs?.username || user.name || "User",
      senderProfileImage: user.prefs?.profileImage || "",
      content,
      type: "text",
      fileId: null,
      fileUrl: null,
      fileName: null,
      downloadPermission: false,
      createdAt: new Date().toISOString(),
    }
  );

  await updateConversationLastMessage(conversationId, user.$id, content);

  return msg;
}

export async function pickAudioFile() {
  const res = await DocumentPicker.getDocumentAsync({
    type: ["audio/*"],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (res.canceled) return null;

  const asset = res.assets?.[0];
  if (!asset?.uri) throw new Error("No file selected.");

  const size = asset.size ?? 0;
  if (size > 25 * 1024 * 1024) {
    throw new Error("File too large (max 25MB).");
  }

  return {
    uri: asset.uri,
    name: asset.name ?? `message-audio-${Date.now()}.mp3`,
    type: asset.mimeType ?? "audio/mpeg",
    size,
  };
}

export async function sendAudioMessage(conversationId, fileAsset, downloadPermission) {
  const user = await account.get();

  const uploaded = await storage.createFile(MESSAGE_BUCKET_ID, ID.unique(), fileAsset);
  const fileId = uploaded.$id;
  const fileUrl = buildMessageFileUrl(fileId);

  const msg = await databases.createDocument(
    DATABASE_ID,
    MESSAGES_COLLECTION_ID,
    ID.unique(),
    {
      conversationId,
      senderId: user.$id,
      senderUsername: user.prefs?.username || user.name || "User",
      senderProfileImage: user.prefs?.profileImage || "",
      content: "",
      type: "audio",
      fileId,
      fileUrl,
      fileName: fileAsset.name,
      downloadPermission: !!downloadPermission,
      createdAt: new Date().toISOString(),
    }
  );

  await updateConversationLastMessage(conversationId, user.$id, "🎵 Audio message");

  return msg;
}

export async function sendSnippetMessage(conversationId, snippet) {
  const user = await account.get();

  const snippetPayload = JSON.stringify({
    $id: snippet.$id,
    title: snippet.title,
    username: snippet.username,
    genre: snippet.genre,
    profileImage: snippet.profileImage || null,
    fileUrl: snippet.fileUrl || null,
    ownerId: snippet.ownerId || null,
  });

  const msg = await databases.createDocument(
    DATABASE_ID,
    MESSAGES_COLLECTION_ID,
    ID.unique(),
    {
      conversationId,
      senderId: user.$id,
      senderUsername: user.prefs?.username || user.name || 'User',
      senderProfileImage: user.prefs?.profileImage || '',
      content: snippetPayload,
      type: 'snippet',
      fileId: null,
      fileUrl: null,
      fileName: null,
      downloadPermission: false,
      createdAt: new Date().toISOString(),
    }
  );

  await updateConversationLastMessage(
    conversationId,
    user.$id,
    `Shared a snippet: ${snippet.title}`
  );

  return msg;
}

export async function updateDownloadPermission(messageId, allowed) {
  return await databases.updateDocument(DATABASE_ID, MESSAGES_COLLECTION_ID, messageId, {
    downloadPermission: !!allowed,
  });
}

export async function deleteMessage(messageId, fileId, conversationId) {
  if (fileId) {
    try {
      await storage.deleteFile(MESSAGE_BUCKET_ID, fileId);
    } catch (_) {
      // File may already be deleted; continue
    }
  }
  await databases.deleteDocument(DATABASE_ID, MESSAGES_COLLECTION_ID, messageId);

  if (conversationId) {
    try {
      await databases.updateDocument(DATABASE_ID, CONVERSATIONS_COLLECTION_ID, conversationId, {
        lastMessage: 'Message deleted',
      });
    } catch (_) {
    }
  }
}