import { createContext, useEffect, useState } from "react";
import { account } from "../lib/appwrite"
import { ID } from "react-native-appwrite";

export const UserContext = createContext()

export function UserProvider({ children }) {

    const [user, setUser] = useState(null)
    const [authChecked, setAuthChecked] = useState(false)

    const [pendingEmail, setPendingEmail] = useState(null)
    const [pendingPassword, setPendingPassword] = useState(null)
    const [pendingFirstName, setPendingFirstName] = useState(null)
    const [pendingLastName, setPendingLastName] = useState(null)
    const [pendingBirthday, setPendingBirthday] = useState(null)
    const [pendingUsername, setPendingUsername] = useState(null)


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
        if (!email || email.trim() === "") {
            throw Error("Please enter an email address.")
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            throw Error("Please enter a valid email address.")
        }
        setPendingEmail(email)
    }

    async function registerPassword(password) {
        const p = (password || "").trim()

        if (!password || password.length < 8) {
            throw Error("Password must be at least 8 characters.")
        }
        setPendingPassword(p)
    }

    async function registerName(firstName, lastName) {
        const f = (firstName || "").trim()
        const l = (lastName || "").trim()

        if (!f) {
            throw Error("Please enter your first name.")
        }
        if (!l) {
            throw Error("Please enter your last name.")
        }
        setPendingFirstName(f)
        setPendingLastName(l)
    }

    async function registerBirthday(birthday) {
        if (!birthday) {
            throw Error("Please select your birthday.")
        }
        setPendingBirthday(birthday)
    }

    async function registerUsername(username) {
        const u = (username || "").trim()

        if (!u) {
            throw Error("Please enter a username.")
        }
        
        if (
            !pendingEmail ||
            !pendingPassword ||
            !pendingFirstName ||
            !pendingLastName ||
            !pendingBirthday
        ) {
            throw Error("Please complete all previous steps.")
        }


        try {
            await register({
                email: pendingEmail, 
                password: pendingPassword,
                firstName: pendingFirstName,
                lastName: pendingLastName,
                birthday: pendingBirthday,
                username,
            })
        } catch (error) {
            throw Error(error.message)
        }
    }

    async function register({ email, password, firstName, lastName, birthday, username }) {
        try {
            const fullName = `${firstName || ""} ${lastName || ""}`.trim() || undefined

            await account.create(ID.unique(), email, password, fullName)
            await login(email, password)
            await account.updatePrefs({
                firstName,
                lastName,
                birthday,
                username,
            })
            const updatedUser = await account.get()
            setUser(updatedUser)

        } catch (error) {
            throw Error(error.message)
        }
    }

    async function logout() {
        await account.deleteSession("current")
        setUser(null)
    }

    async function getInitialUserValue() {
        try {
            const response = await account.get()
            setUser(response)
        } catch (error) {
            setUser(null)
        }finally {
            setAuthChecked(true)
        }
    }

    useEffect(() => {
        getInitialUserValue()
    }, [])

    return (
        <UserContext.Provider value={{ 
            user, 
            login, 
            register, 
            registerEmail, 
            registerPassword, 
            registerName, 
            registerBirthday, 
            registerUsername, 
            logout, 
            authChecked 
        }}>
            {children}
        </UserContext.Provider>
    )
}