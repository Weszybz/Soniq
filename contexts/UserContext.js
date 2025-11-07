import { createContext, useEffect, useState } from "react";
import { ID } from "react-native-appwrite";
import { account, storage, PROFILE_BUCKET_ID, APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID } from "../lib/appwrite"
import * as ImagePicker from "expo-image-picker"
import { useProfile } from "./ProfileContext";

export const UserContext = createContext()

export function UserProvider({ children }) {

    const [user, setUser] = useState(null)
    const [authChecked, setAuthChecked] = useState(false)

    const { profileImage, setProfileImage } = useProfile();

    const [pendingEmail, setPendingEmail] = useState(null)
    const [pendingPassword, setPendingPassword] = useState(null)
    const [pendingFirstName, setPendingFirstName] = useState(null)
    const [pendingLastName, setPendingLastName] = useState(null)
    const [pendingBirthday, setPendingBirthday] = useState(null)
    const [pendingUsername, setPendingUsername] = useState(null)
    const [pendingProfileImage, setPendingProfileImage] = useState(null)

    function makeProfileImageUrl(fileId) {
        return `${APPWRITE_ENDPOINT}/storage/buckets/${PROFILE_BUCKET_ID}/files/${fileId}/view?project=${APPWRITE_PROJECT_ID}`
    }


    async function login(email, password) {
        try {
            await account.createEmailPasswordSession(email, password)
            const response = await account.get()
            setUser(response)

            const url = response.prefs?.profileImage || null
            if (url) {
                // const url = makeProfileImageUrl(fileId)
                setProfileImage(url)
            } else {
                setProfileImage(null)
            }
        
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
        setPendingUsername(u)
    }

    async function registerImage(profileImageUrl) {
        const url = profileImageUrl || null
        setPendingProfileImage(url)

        if (
            !pendingEmail ||
            !pendingPassword ||
            !pendingFirstName ||
            !pendingLastName ||
            !pendingBirthday ||
            !pendingUsername
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
                username: pendingUsername,
                profileImage: url,
            })
        } catch (error) {
            throw Error(error.message)
        }
    }

    async function register({ email, password, firstName, lastName, birthday, username, profileImage }) {
        try {
            const fullName = `${firstName || ""} ${lastName || ""}`.trim() || undefined

            await account.create(ID.unique(), email, password, fullName)
            await login(email, password)
            await account.updatePrefs({
                firstName,
                lastName,
                birthday,
                username,
                profileImage,
            })
            const updatedUser = await account.get()
            setUser(updatedUser)
            setProfileImage(profileImage || null)

        } catch (error) {
            throw Error(error.message)
        }
    }

    async function logout() {
        await account.deleteSession("current")
        setUser(null)
        setProfileImage(null)
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

        const init = async () => {
        try {
            const current = await account.get()
            setUser(current)

            const url = current.prefs?.profileImage || null
            setProfileImage(url)       // ⬅️ hydrate profile image from prefs
        } catch (err) {
            // not logged in / no session
            setUser(null)
            setProfileImage(null)
        }
        }

        init()
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
            registerImage,
            logout, 
            authChecked,
            pendingEmail,
        }}>
            {children}
        </UserContext.Provider>
    )
}