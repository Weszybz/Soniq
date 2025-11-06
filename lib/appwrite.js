import { Client, Account, ID, Avatars } from "react-native-appwrite";

export const client = new Client()
    .setProject('690cb4cd003868dbbe00')
    .setPlatform('dev.weszybz.soniq')

export const account = new Account(client)
export const avatar = new Avatars(client)