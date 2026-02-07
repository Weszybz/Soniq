import * as DocumentPicker from "expo-document-picker";
import { Query } from "react-native-appwrite";
import { storage, databases, ID, account, AUDIO_BUCKET_ID, DATABASE_ID, SNIPPETS_COLLECTION_ID, APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID } from "./appwrite";

function buildViewUrl(fileId) {
  return `${APPWRITE_ENDPOINT}/storage/buckets/${AUDIO_BUCKET_ID}/files/${fileId}/view?project=${APPWRITE_PROJECT_ID}`;
}

export async function pickAndUploadSnippet({ title, genre, username, profileImage }) {
  // 1) Pick an audio file
  const res = await DocumentPicker.getDocumentAsync({
    type: ["audio/*"],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (res.canceled) return null;

  const asset = res.assets?.[0];
  if (!asset?.uri) throw new Error("No file selected.");

  // 2) Basic info + optional size cap (helps keep snippets lightweight)
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

  // 3) Upload to Appwrite Storage
  const uploaded = await storage.createFile(AUDIO_BUCKET_ID, ID.unique(), fileObj);
  const fileId = uploaded.$id;
  const fileUrl = buildViewUrl(fileId);

  // 4) Create DB document for the snippet
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