import { StyleSheet, Text, View, useColorScheme, Pressable, Image, TextInput, TouchableWithoutFeedback, Keyboard, ActivityIndicator, ScrollView } from 'react-native'
import { React, useMemo, useState, useRef, useEffect } from 'react'
import { Colors } from '../../constants/Colors';
import { useRouter } from 'expo-router';
import { useProfile } from '../../contexts/ProfileContext';
import { useUser } from '../../hooks/useUser';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useBottomSheet } from '../../contexts/BottomSheetContext';
import { listSnippets } from '../../lib/snippets';

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
import ThemedWaveform from '../../components/ThemedWaveform';
import ThemedComments from '../../components/ThemedComments';
import { useSharedValue } from 'react-native-reanimated';


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

    const { bottomSheetRef, setContent } = useBottomSheet();
    const handleCardOptions = () => {
        setContent(
            <View style={{ padding: 20 }}>
                <Text style={{ fontSize:18, fontWeight:'600', color: theme.textPrimary }}>
                    Custom Title
                </Text>
                <Text style={{ fontSize:14, color: theme.textPrimary }}>
                    This is some detailed description text inside the sheet.
                </Text>
            </View>
        );
        bottomSheetRef.current?.expand();
    }; 

    // const bottomSheetRef = useBottomSheet()
    // const handleCardOptions = () => bottomSheetRef.current?.expand(
    const handleCardOptionsClose = () => bottomSheetRef.current?.close()

    const soundRef = useRef(null);
    const [position, setPosition] = useState(0);
    const [showComments, setShowComments] = useState(false);
    const [totalComments, setTotalComments] = useState(0);
    const [postLiked, setPostLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(124);

    const [snippets, setSnippets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchSnippets = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await listSnippets();
                setSnippets(data);
            } catch (err) {
                console.error('Failed to fetch snippets:', err);
                setError(err?.message || 'Failed to load snippets');
            } finally {
                setLoading(false);
            }
        };
        fetchSnippets();
    }, [])

    const togglePostLike = () => {
        setPostLiked((prev) => {
            const next = !prev;
            setLikeCount((c) => (next ? c + 1 : Math.max(0, c - 1)));
            return next;
        });
    };

    return (
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

                {/* Snippets Feed*/}
                {loading && (
                    <View style={[styles.feedState, { width: '90%' }]}>
                        <ActivityIndicator size="large" color={theme.textSecondary} />
                        <Text style={[styles.feedStateText, { color: theme.textSecondary }]}>Loading snippets...</Text>
                    </View>
                )}

                {error && (
                    <View style={[styles.feedState, { width: '90%' }]}>
                        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                        <Text style={[styles.feedStateText, { color: "#ef4444" }]}>{error}</Text>
                    </View>
                )}

                {!loading && !error && snippets.length === 0 && (
                    <View style={[styles.feedState, {width: '90%'}]}>
                        <Ionicons name="musical-note-outline" size={48} color={theme.textSecondary} />
                        <Text style={[styles.feedStateText, {color: theme.textSecondary }]}>No snippets yet</Text>
                        <Text style={[styles.feedStateSubtext, { color: theme.textSecondary }]}>Upload your first snippet to get started</Text>
                    </View>
                )}

                {!loading && !error && snippets.map((snippet) => (
                    <View key={snippet.$id}>
                        <View style={[ styles.card, { backgroundColor: theme.cardBackground }]}>
                            <View style={styles.cardTop}>
                                <View style={styles.profileUsernameGenre}>
                                    <Image
                                        source={
                                            snippet.profileImage
                                            ? { uri: snippet.profileImage }
                                            : require('../../assets/icon.png') // fallback / default
                                        }
                                        style={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: 20,
                                        }}
                                    />
                                    <View style={styles.userGenre}>
                                        <Text style={[styles.userGenreTitle, {color: theme.textPrimary}]}>
                                            {snippet.username || 'Anonymous'}
                                        </Text>
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
                                            <Text style={[styles.userGenreText, {color: theme.textSecondary}]}>
                                                {snippet.genre}
                                            </Text>
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
                            <Text style={[styles.title, { color: theme.textPrimary }]}>
                                {snippet.title}
                            </Text>
                            <View style={styles.waveform}>
                                <ThemedWaveform 
                                    audioUri={snippet.fileUrl}
                                    theme={theme}
                                    soundRef={soundRef}
                                    onPositionChange={setPosition}
                                />
                            </View>
                            <View style={styles.reactions}>
                                <Pressable style={styles.likes} onPress={togglePostLike}>
                                    <Ionicons
                                        name={postLiked ? "thumbs-up" : "thumbs-up-outline"}
                                        size={28}
                                        color={postLiked ? "#06B6D4" : theme.textSecondary}
                                    />
                                    <Text style={[styles.numbers, { color: theme.textPrimary }]}>{likeCount}</Text>
                                </Pressable>
                                <Pressable style={styles.reactionsItem} onPress={() => setShowComments(!showComments)}>
                                    <Ionicons name="chatbubble-outline" size={24} color={theme.textSecondary} />
                                    <Text style={[styles.numbers, { color: theme.textPrimary}]}>{totalComments}</Text>
                                </Pressable>
                                <View style={styles.reactionsItem}>
                                    <Ionicons name="paper-plane-outline" size={24} color={theme.textSecondary} />
                                    <Text style={[styles.numbers, { color: theme.textPrimary}]}>0</Text>
                                </View>
                            </View>
                        </View>
                        <Spacer />
                    </View>
                ))}

                {/* Original Example Card */}
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
                    <View style={styles.waveform}>
                        <ThemedWaveform 
                            audioUri="https://fra.cloud.appwrite.io/v1/storage/buckets/690d1d0b00220b4ab292/files/691e1114000cee48b6d5/view?project=690cb4cd003868dbbe00&mode=admin"
                            theme={theme}
                            soundRef={soundRef}
                            onPositionChange={setPosition}
                        />
                    </View>
                    <View style={styles.reactions}>
                        <Pressable style={styles.likes} onPress={togglePostLike}>
                            <Ionicons
                                name={postLiked ? "thumbs-up" : "thumbs-up-outline"}
                                size={28}
                                color={postLiked ? "#06B6D4" : theme.textSecondary}
                            />
                            <Text style={[styles.numbers, { color: theme.textPrimary }]}>{likeCount}</Text>
                        </Pressable>
                        <Pressable style={styles.reactionsItem} onPress={() => setShowComments(!showComments)}>
                            <Ionicons name="chatbubble-outline" size={24} color={theme.textSecondary} />
                            <Text style={[styles.numbers, { color: theme.textPrimary}]}>{totalComments}</Text>
                        </Pressable>
                        <View style={styles.reactionsItem}>
                            <Ionicons name="paper-plane-outline" size={24} color={theme.textSecondary} />
                            <Text style={[styles.numbers, { color: theme.textPrimary}]}>3</Text>
                        </View>
                    </View>
                    <View style={{ display: showComments ? 'flex' : 'none' }}>
                      <ThemedComments
                          theme={theme}
                          soundRef={soundRef}
                          position={position}
                          user={user}
                          profileImage={profileImage}
                          onCountChange={setTotalComments}
                          style={{}}
                      />
                    </View>
                </View>
            </ThemedView>
        </TouchableWithoutFeedback>
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
    feedState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 64,
        gap: 12,
    },
    feedStateText: {
        fontFamily: 'inter',
        fontWeight: '600',
        fontSize: 16,
        textAlign: 'center',
    },
    feedStateSubtext: {
        fontFamily: 'inter',
        fontWeight: '400',
        fontSize: 14,
        textAlign: 'center',
    },

})