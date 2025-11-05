import { StyleSheet, Text, View, useColorScheme, Pressable, Image, TextInput } from 'react-native'
import { React, useState } from 'react'
import { Colors } from '../../constants/Colors';
import { useRouter } from 'expo-router';
import { useProfile } from '../../contexts/ProfileContext';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

// themed components
import ThemedView from '../../components/ThemedView';
import ThemedText from '../../components/ThemedText';
import Spacer from '../../components/Spacer';
import ThemedButton from '../../components/ThemedButton';
import ThemedTextInput from '../../components/ThemedTextInput';

const profileIcon = require('../../assets/icon.png');

const Home = () => {
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
            <View style={styles.top}>
                <Text style={{ fontSize: 20, fontWeight: '600' , fontFamily: 'inter', color: theme.textPrimary }}>Good Morning, Wesley</Text>
                <View style={[styles.topRight, {
                    // paddingVertical: 2,
                    // marginRight: 24,
                }]}>
                    <Ionicons name="notifications-outline" size={40} color={theme.textSecondary} style={{ marginRight: 0 }} />
                    <Image
                        source={
                            profileImage
                            ? { uri: profileImage }
                            : require('../../assets/icon.png') // fallback / default
                        }
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            alignSelf: 'flex-end'
                        }}
                    />
                </View>
            </View>
            <Spacer />
            <View style={[styles.search, 
            {
              backgroundColor: theme.uiBackground, 
              width: '90%',
              paddingVertical: 2,
              paddingHorizontal: 16,
              borderRadius: 20,
              }]}>
              <Ionicons name="search" size={24} color={theme.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                  placeholder="Search"
                  keyboardType="default"
                  style={{
                    color: theme.textSecondary,
                    fontFamily: 'inter',
                    fontWeight: '600',
                    paddingVertical: 12,
                    fontSize: 18,
                    padding: 0,
                  }}
              />
            </View>

        </ThemedView>
    )
}

export default Home

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
    search: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    top: {
        flexDirection: 'row',
        width: '90%',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    topRight: {
        flexDirection: 'row',
        alignSelf: 'flex-end',
        gap: 8,
        alignItems: 'center'
        // justifyContent: 'center',
    },

})