import { Query } from "react-native-appwrite";
import { databases, ID, DATABASE_ID, NOTIFICATIONS_COLLECTION_ID } from "./appwrite";


export async function createNotification({ recipientId, senderId, senderUsername, senderProfileImage = null, type, snippetId = null, snippetTitle = null, commentId = null, conversationId = null, content }) {
  if (!recipientId || !senderId || recipientId === senderId) return;

  try {
    await databases.createDocument(
      DATABASE_ID,
      NOTIFICATIONS_COLLECTION_ID,
      ID.unique(),
      {
        recipientId,
        senderId,
        senderUsername,
        senderProfileImage: senderProfileImage || null,
        type,
        snippetId: snippetId || null,
        snippetTitle: snippetTitle || null,
        commentId: commentId || null,
        conversationId: conversationId || null,
        content,
        read: false,
        createdAt: new Date().toISOString(),
      }
    );
  } catch (err) {
    console.warn("createNotification failed:", err?.message);
  }
}

export async function listNotifications(userId, limit = 50) {
  const res = await databases.listDocuments(
    DATABASE_ID,
    NOTIFICATIONS_COLLECTION_ID,
    [
      Query.equal("recipientId", [userId]),
      Query.orderDesc("createdAt"),
      Query.limit(limit),
    ]
  );
  return res.documents;
}

export async function countUnread(userId) {
  const res = await databases.listDocuments(
    DATABASE_ID,
    NOTIFICATIONS_COLLECTION_ID,
    [
      Query.equal("recipientId", [userId]),
      Query.equal("read", false),
      Query.limit(1),
    ]
  );
  return res.total ?? 0;
}

export async function markAsRead(notifId) {
  try {
    await databases.updateDocument(
      DATABASE_ID,
      NOTIFICATIONS_COLLECTION_ID,
      notifId,
      { read: true }
    );
  } catch (err) {
    console.warn("markAsRead failed:", err?.message);
  }
}

export async function markAllAsRead(userId) {
  try {
    let cursor = null;
    do {
      const queries = [
        Query.equal("recipientId", [userId]),
        Query.equal("read", false),
        Query.limit(100),
      ];
      if (cursor) queries.push(Query.cursorAfter(cursor));

      const res = await databases.listDocuments(
        DATABASE_ID,
        NOTIFICATIONS_COLLECTION_ID,
        queries
      );

      await Promise.all(
        res.documents.map((doc) =>
          databases.updateDocument(
            DATABASE_ID,
            NOTIFICATIONS_COLLECTION_ID,
            doc.$id,
            { read: true }
          )
        )
      );

      cursor =
        res.documents.length === 100
          ? res.documents[res.documents.length - 1].$id
          : null;
    } while (cursor);
  } catch (err) {
    console.warn("markAllAsRead failed:", err?.message);
  }
}

export async function markConversationNotificationsRead(userId, conversationId) {
  try {
    const res = await databases.listDocuments(
      DATABASE_ID,
      NOTIFICATIONS_COLLECTION_ID,
      [
        Query.equal("recipientId", [userId]),
        Query.equal("conversationId", [conversationId]),
        Query.equal("read", false),
        Query.limit(100),
      ]
    );

    await Promise.all(
      res.documents.map((doc) =>
        databases.updateDocument(
          DATABASE_ID,
          NOTIFICATIONS_COLLECTION_ID,
          doc.$id,
          { read: true }
        )
      )
    );
  } catch (err) {
    console.warn("markConversationNotificationsRead failed:", err?.message);
  }
}
