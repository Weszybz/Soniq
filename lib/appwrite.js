import { Client, Account, ID, Avatars, Storage } from "react-native-appwrite";

export const client = new Client()
    .setProject('690cb4cd003868dbbe00')
    .setPlatform('dev.weszybz.soniq')

    const APPWRITE_ENDPOINT = 'https://fra.cloud.appwrite.io/v1'
    const APPWRITE_PROJECT_ID = '690cb4cd003868dbbe00'
    const PROFILE_BUCKET_ID = '690d1d0b00220b4ab292'       

export const account = new Account(client)
export const avatar = new Avatars(client)
export const storage = new Storage(client)
export { ID, APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, PROFILE_BUCKET_ID }