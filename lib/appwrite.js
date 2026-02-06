import { Client, Account, ID, Avatars, Storage, Databases } from "react-native-appwrite";

// --- Appwrite config ---
export const APPWRITE_ENDPOINT = "https://fra.cloud.appwrite.io/v1";
export const APPWRITE_PROJECT_ID = "690cb4cd003868dbbe00";
export const APPWRITE_PLATFORM = "dev.weszybz.soniq";

// Storage buckets
export const PROFILE_BUCKET_ID = "690d1d0b00220b4ab292";
export const AUDIO_BUCKET_ID = "6969728700034c4daa32";

// Database + collections
export const DATABASE_ID = "696914e20000d6f758b8";
export const SNIPPETS_COLLECTION_ID = "snippets";

export const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setPlatform(APPWRITE_PLATFORM);

export const account = new Account(client);
export const avatar = new Avatars(client);
export const storage = new Storage(client);
export const databases = new Databases(client);

export { ID };