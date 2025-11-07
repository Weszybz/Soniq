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

    const { user } = useUser()

    const handleSubmit = () => {
        router.push('/home')
    }

    function makeProfileImageUrl(fileId) {
        return `${APPWRITE_ENDPOINT}/storage/buckets/${PROFILE_BUCKET_ID}/files/${fileId}/view?project=${APPWRITE_PROJECT_ID}`
        // you can add &mode=admin here if you really want,
        // but for a logged-in user it's not required
    }

    // 📸 Open system image picker
    const pickImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
            alert('Permission to access gallery is required!');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.9,
        });

        if (!result.canceled) {
            setProfileImage(result.assets[0].uri); // saves globally
        }

        const asset = result.assets[0]

        try {

            const response = await fetch(asset.uri)
            const blob = await response.blob()

            const file = new File([blob], `profile-${user.pref?.username}${Date.now()}.jpg`, {
                type: blob.type || 'image/jpeg',
            })

            console.log("Uploading from:", asset.uri)

            const uploaded = await storage.createFile(
                PROFILE_BUCKET_ID,
                ID.unique(),
                file,
            )

            if (!uploaded || !uploaded.$id) {
                throw new Error('Upload failed — no file returned.')
            }

            console.log("Upload result:", uploaded)
            

            const fileId = uploaded.$id

            await account.updatePrefs({
                profileImage: fileId,
            })

            const preview = storage.getFilePreview(PROFILE_BUCKET_ID, fileId)
            const previewUrl = preview.href ?? preview

            setProfileImage(previewUrl)
        } catch (error) {
            console.log('Error uploading profile image:', error)
            alert('Could not upload image. Please try again.')
        }
    };


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
})