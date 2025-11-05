import { StyleSheet, Text, View, useColorScheme, Pressable, Image } from 'react-native'
import { React, useState } from 'react'
import { Colors } from '../../constants/Colors';
import { useRouter } from 'expo-router';
import { useProfile } from '../../contexts/ProfileContext';
import * as ImagePicker from 'expo-image-picker';

// themed components
import ThemedView from '../../components/ThemedView';
import ThemedText from '../../components/ThemedText';
import Spacer from '../../components/Spacer';
import ThemedButton from '../../components/ThemedButton';
import ThemedTextInput from '../../components/ThemedTextInput';

const profileIcon = require('../../assets/icon.png');

const Images = () => {
    const colorScheme = useColorScheme()
    const theme = Colors[colorScheme] ?? Colors.light

    const router = useRouter()

    const { profileImage, setProfileImage } = useProfile();

    const handleSubmit = () => {
        router.push('/home')
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