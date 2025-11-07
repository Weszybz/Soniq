import { StyleSheet, Text, View, useColorScheme, Pressable, Image } from 'react-native'
import { React, useState } from 'react'
import { Colors } from '../../constants/Colors';
import { useRouter } from 'expo-router';
import { useProfile } from '../../contexts/ProfileContext';
import * as ImagePicker from 'expo-image-picker';
import { storage, account, ID, PROFILE_BUCKET_ID, APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID} from '../../lib/appwrite'

// themed components
import ThemedView from '../../components/ThemedView';
import ThemedText from '../../components/ThemedText';
import Spacer from '../../components/Spacer';
import ThemedButton from '../../components/ThemedButton';
import ThemedTextInput from '../../components/ThemedTextInput';
import { useUser } from '../../hooks/useUser';

const profileIcon = require('../../assets/icon.png');

const Images = () => {
    const colorScheme = useColorScheme()
    const theme = Colors[colorScheme] ?? Colors.light

    const router = useRouter()

    const { profileImage, setProfileImage } = useProfile();

    const { user, pendingEmail, registerImage } = useUser()

    console.log("Pending Email:", pendingEmail)

    const [error, setError] = useState(null)

    const handleSubmit = async () => {
        try {
            await registerImage(profileImage)
            console.log('Profile Image URL:', profileImage)
        } catch (error) {
            setError(error.message)
        }
    }

    function makeProfileImageUrl(fileId) {
        return `${APPWRITE_ENDPOINT}/storage/buckets/${PROFILE_BUCKET_ID}/files/${fileId}/view?project=${APPWRITE_PROJECT_ID}`
        // you can add &mode=admin here if you really want,
        // but for a logged-in user it's not required
    }

    // 📸 Open system image picker
    const pickImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (!permissionResult.granted) {
        alert('Permission to access gallery is required!');
        return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
        })

        if (result.canceled) return

        const asset = result.assets[0]

        // Infer mime type and extension safely
        const mimeType = asset.mimeType || 'image/png'

        // Try to get extension from fileName or uri
        let extension = 'png'
        if (asset.fileName && asset.fileName.includes('.')) {
        extension = asset.fileName.split('.').pop()
        } else if (asset.uri && asset.uri.includes('.')) {
        extension = asset.uri.split('.').pop().split('?')[0]
        }

        const filename =
        // asset.fileName || `profile-${user.pref?.username}-${Date.now()}.${extension}`
        `${pendingEmail}-${Date.now()}.${extension}`
        

        const file = {
        name: filename,
        type: mimeType,               // <- can be image/png or image/jpeg etc.
        size: asset.fileSize ?? 0,
        uri: asset.uri,
        }

        try {
        // 1️⃣ Upload to Appwrite Storage
        const uploaded = await storage.createFile(
            PROFILE_BUCKET_ID,
            ID.unique(),
            file
        )

        if (!uploaded || !uploaded.$id) {
            throw new Error('Upload failed — no file returned from Appwrite.')
        }

        const fileId = uploaded.$id
        const url = makeProfileImageUrl(fileId)

        // // 2️⃣ Save fileId in user prefs
        // await account.updatePrefs({
        //     profileImage: url,
        // })

        // 4️⃣ Store globally so it shows in UI & after login
        setProfileImage(url)
        // setProfileImage('https://picsum.photos/200')
        } catch (error) {
        console.log('Error uploading profile image:', error)
        alert('Failed to upload image. Please try again.')
        }
    }

    return (
        <ThemedView style = {styles.container} safe = {true}>
            <Pressable 
                onPress={() => router.back()}
                style={{
                    position: 'absolute',
                    top: 50,          // adjust for status bar / safe area
                    left: 20,
                    zIndex: 10,       // keep it above page content
                    padding: 8,
                }}
            >
                <Text style={{ fontSize: 40, color: theme.textPrimary }}>←</Text>
            </Pressable>

            
            <ThemedText style={styles.title}>Add a profile image</ThemedText>
            <Spacer />

             {/* 👇 Image picker */}
            <Pressable onPress={pickImage}>
                <Image
                    source={
                        profileImage
                        ? { uri: profileImage }
                        : require('../../assets/icon.png') // fallback / default
                    }
                    style={{
                        width: 120,
                        height: 120,
                        borderRadius: 60,
                    }}
                />
            </Pressable>
            
            <Spacer />
            <Text style={[styles.textSecondary, {color: theme.textSecondary}]}>
                You can change this at any time
            </Text>

            
            <ThemedButton style={{
                position: 'absolute',
                // top: '61.8%'
                bottom: 24,
            }} 
            onPress={handleSubmit}>
                    <ThemedText style = {styles.buttonText}>Continue {'-->'}</ThemedText>
            </ThemedButton>

            {error && <Text style={styles.error}>{error}</Text>}
        </ThemedView>
    )
}

export default Images

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        // justifyContent: 'center',
    },
    title: {
        fontFamily: 'inter',
        fontWeight: 'bold',
        fontSize: 24,
        paddingTop: '35%'
    },
    buttonText: {
        fontFamily: 'inter',
        fontStyle: 'normal',
        fontWeight: 'bold',
        fontSize: 20
    },
    textSecondary: {
        fontFamily: 'inter',
        fontStyle: 'normal',
        fontWeight: '600',
        fontSize: 14,
        width: '75%',
        textAlign: 'center'
    },
    error: {
        color: Colors.warning,
        padding: 10,
        backgroundColor: '#f5c1c8',
        borderColor: Colors.warning,
        borderWidth: 1,
        borderRadius: 6,
        marginHorizontal: 10,
    },
})