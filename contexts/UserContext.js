import { createContext, useState } from "react";
import { account } from "../lib/appwrite"
import { ID } from "react-native-appwrite";

export const UserContext = createContext()

export function UserProvider({ children }) {

    const [user, setUser] = useState(null)
    const [pendingEmail, setPendingEmail] = useState(null)

    async function login(email, password) {
        try {
            await account.createEmailPasswordSession(email, password)
            const response = await account.get()
            setUser(response)
        } catch (error) {
            throw Error(error.message)
        }
    }

    function registerEmail(email) {
        setPendingEmail(email)
    }

    async function registerPassword(password) {
        if (!pendingEmail) {
            console.warn("No email set for registration")
            //throw Error("No email set for registration")
            return
        }

        try {
            await register(pendingEmail, password)
        } catch (error) {
            throw Error(error.message)
        }
    }

    async function register(email, password) {
        try {
            await account.create(ID.unique(), email, password)
            await login(email, password)
        } catch (error) {
            throw Error(error.message)
        }
    }

    async function logout() {
        await account.deleteSession("current")
        setUser(null)
    }

    return (
        <UserContext.Provider value={{ user, login, register, registerEmail, registerPassword, logout }}>
            {children}
        </UserContext.Provider>
    )
}