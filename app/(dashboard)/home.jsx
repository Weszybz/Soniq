import { StyleSheet, Text, View, useColorScheme, Pressable, Image, TextInput, TouchableWithoutFeedback, Keyboard } from 'react-native'
import { React, useMemo, useState, useRef } from 'react'
import { Colors } from '../../constants/Colors';
import { useRouter } from 'expo-router';
import { useProfile } from '../../contexts/ProfileContext';
import { useUser } from '../../hooks/useUser';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

// themed components
import ThemedView from '../../components/ThemedView';
import ThemedText from '../../components/ThemedText';
import Spacer from '../../components/Spacer';
import ThemedButton from '../../components/ThemedButton';
import ThemedTextInput from '../../components/ThemedTextInput';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import ThemedBottomSheet from '../../components/ThemedBottomSheet';


const profileIcon = require('../../assets/icon.png');

const Home = () => {
    const colorScheme = useColorScheme()
    const theme = Colors[colorScheme] ?? Colors.light

    const router = useRouter()

    const { profileImage, setProfileImage } = useProfile();
    const { user } = useUser()

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

    const bottomSheetRef = useRef(null)
    const handleCardOptions = () => bottomSheetRef.current?.expand()
    const handleCardOptionsClose = () => bottomSheetRef.current?.close()

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>  
            <ThemedView style = {styles.container} safe = {true}>
                <View style={styles.top}>
                    <Text style={{ fontSize: 20, fontWeight: '600' , fontFamily: 'inter', color: theme.textPrimary }}>Good Morning, {user.prefs.firstName}</Text>
                    <View style={[styles.topRight, {
                        // paddingVertical: 2,
                        // marginRight: 24,
                    }]}>
                        <Ionicons name="notifications-outline" size={40} color={theme.textSecondary} style={{ marginRight: 0 }} />
                        <Pressable onPress={() => router.push('/profile')}>
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
                        </Pressable>
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
                        width: '90%',
                        fontFamily: 'inter',
                        fontWeight: '600',
                        paddingVertical: 12,
                        fontSize: 18,
                    }}/>
                </View>
                <Spacer />
                <View style={[ styles.card,
                { 
                    backgroundColor: theme.cardBackground,
                }]}>
                    <View style={styles.cardTop}>
                        <View style={styles.profileUsernameGenre}>
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
                                }}
                            />
                            <View style={styles.userGenre}>
                                <Text style={[styles.userGenreTitle, {color: theme.textPrimary}]}>beatmaker123</Text>
                                <View style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 4,
                                }}>
                                    <View style ={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: 4,
                                        backgroundColor: '#06B6D4',
                                    }} />
                                    <Text style={[styles.userGenreText, {color: theme.textSecondary}]}>Electric</Text>
                                </View>
                            </View>
                        </View>
                        <View style={[styles.cardTopRight, {}]}>
                            <Pressable onPress={handleCardOptions}>
                                <Ionicons name="ellipsis-horizontal" size={24} color={theme.textSecondary} />
                                {/* <Text style={{ fontSize: 20, fontWeight: '600' , fontFamily: 'inter', color: theme.textPrimary }}>Good Morning, Wesley</Text> */}
                            </Pressable>
                        </View>
                    </View>
                    <Text style={[styles.title, { color: theme.textPrimary }]}>Unnamed</Text>
                    <View style={styles.waveform}></View>
                    <View style={styles.reactions}>
                        <View style={styles.likes}>
                            <Ionicons name="thumbs-up-outline" size={28} color={theme.textSecondary} />
                            <Text style={[styles.numbers, { color: theme.textPrimary}]}>124</Text>
                        </View>
                        <View style={styles.reactionsItem}>
                            <Ionicons name="chatbubble-outline" size={24} color={theme.textSecondary} />
                            <Text style={[styles.numbers, { color: theme.textPrimary}]}>17</Text>
                        </View>
                        <View style={styles.reactionsItem}>
                            <Ionicons name="paper-plane-outline" size={24} color={theme.textSecondary} />
                            <Text style={[styles.numbers, { color: theme.textPrimary}]}>3</Text>
                        </View>
                    </View>
                </View>
                <ThemedBottomSheet ref={bottomSheetRef} />
            </ThemedView>
        </TouchableWithoutFeedback>
        </GestureHandlerRootView>
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
        fontWeight: '600',
        fontSize: 20,
        // paddingTop: '35%'
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
    card: {
        // flexDirection: 'row',
        borderRadius: 10,
        width: '90%',
        // height: '25%',
        padding: 16,
        gap: 16,
        // justifyContent: 'space-between',
        // alignItems: 'center',
    },
    cardTop: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardTopRight: {
        alignSelf: 'center',
    },
    profileUsernameGenre: {
        flexDirection: 'row',
        gap: 14,
    },
    userGenre: {

    },
    userGenreTitle: {
        fontFamily: 'inter',
        fontWeight: '600',
        fontSize: 16
    },
    userGenreText: {
        fontFamily: 'inter',
        fontWeight: '500',
        fontSize: 14
    },
    waveform: {

    },
    reactions: {
        flexDirection: 'row',
        gap: 16,
        alignItems: 'flex-end',        
    },
    reactionsItem: {
        flexDirection: 'row',
        gap: 4,
        alignItems: 'baseline'
    },
    likes: {
        flexDirection: 'row',
        gap: 4,
        alignItems: 'baseline'
    },
    numbers: {
        fontFamily: 'inter',
        fontWeight: '500',
        fontSize: 18
    },

})