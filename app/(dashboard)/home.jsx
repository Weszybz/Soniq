import { StyleSheet, Text, View, useColorScheme, Pressable, Image, TextInput, TouchableWithoutFeedback, Keyboard, ActivityIndicator, ScrollView } from 'react-native'
import { React, useMemo, useState, useRef, useEffect } from 'react'
import { Colors } from '../../constants/Colors';
import { useRouter } from 'expo-router';
import { useProfile } from '../../contexts/ProfileContext';
import { useUser } from '../../hooks/useUser';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useBottomSheet } from '../../contexts/BottomSheetContext';
import { listSnippets, toggleSnippetLike, updateSnippetCommentCount, incrementSnippetShare } from '../../lib/snippets';

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

    const [snippets, setSnippets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [likedSnippets, setLikedSnippets] = useState(new Set());
    const [visibleComments, setVisibleComments] = useState(new Set())


    useEffect(() => {
        const fetchSnippets = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await listSnippets();
                setSnippets(data);

                // Initialise liked snippets based on current user
                if (user?.$id) {
                    const userLikedSnippets = new Set(
                        data
                            .filter(snippet => snippet.likedBy?.includes(user.$id))
                            .map(snippet => snippet.$id)
                    );
                    setLikedSnippets(userLikedSnippets)
                }
            } catch (err) {
                console.error('Failed to fetch snippets:', err);
                setError(err?.message || 'Failed to load snippets');
            } finally {
                setLoading(false);
            }
        };
        fetchSnippets();
    }, [user?.$id])

    const handleToggleLike = async (snippetId) => {
        const snippet = snippets.find(s => s.$id === snippetId);
        if (!snippet) return;

        const isCurrentlyLiked = likedSnippets.has(snippetId)
        const currentCount = snippet.likes || 0;
        const currentLikedBy = snippet.likedBy || [];

        setLikedSnippets(prev => {
            const newSet = new Set(prev);
            if (isCurrentlyLiked) {
                newSet.delete(snippetId)
            } else {
                newSet.add(snippetId)
            }
            return newSet
        });

        const filteredLikedBy = isCurrentlyLiked
            ? currentLikedBy.filter(id => id !== user.$id)
            : [...currentLikedBy, user.$id]

        setSnippets(prev => prev.map(s =>
            s.$id === snippetId
                ? { ...s,
                    likes: isCurrentlyLiked ? Math.max(0, currentCount - 1) : currentCount + 1,
                    likedBy: filteredLikedBy
                }
                : s
        ));

        try {
            await toggleSnippetLike(snippetId, isCurrentlyLiked, currentCount, user.$id, currentLikedBy)
        } catch (err) {
            console.error('Failed to update like', err);

            // Rollback on error
            setLikedSnippets(prev => {
                const newSet = new Set(prev);
                if (isCurrentlyLiked) {
                    newSet.add(snippetId)
                } else {
                    newSet.delete(snippetId)
                }
                return newSet
            });

            setSnippets(prev => prev.map(s =>
            s.$id === snippetId
                ? { ...s,
                    likes: currentCount,
                    likedBy: currentLikedBy,
                }
                : s
            ));

            alert('Failed to update like. Please try again.')
        }
    };

    const handleToggleComments = (snippetId) => {
        setVisibleComments(prev => {
            const newSet = new Set(prev);
            if (newSet.has(snippetId)) {
                newSet.delete(snippetId)
            } else {
                newSet.add(snippetId)
            }
            return newSet
        });
    };

    const handleCommentCountChange = async (snippetId, newCount) => {
        setSnippets(prev => prev.map(s =>
            s.$id === snippetId
                ? { ...s, commentsCount: newCount }
                : s
        ));

        try {
            await updateSnippetCommentCount(snippetId, newCount);
        } catch (err) {
            console.error ('Failed to update comment count', err)

            // Rollback error - refetch tghe snippet to get accurate count
            const snippet = snippet.find(s => s.$id === snippetId)
            if (snippet) {
                setSnippets(prev => prev.map(s =>
                s.$id === snippetId
                    ? { ...s, commentCount: snippet.commentCount || 0 }
                    : s
                ));
            }
        }
    }

    const handleShare = async (snippetId) => {
        const snippet = snippets.find(s => s.$id === snippetId);
        if (!snippet) return

        const currentCount = snippet.shares || 0;

        setSnippets(prev => prev.map(s =>
            s.$id === snippetId
                ? { ...s, shares: currentCount + 1 }
                : s
        ));

        try {
            await incrementSnippetShare(snippetId, currentCount)

            alert ('Share link copied!')
        } catch (err) {
            console.error('Failed to update share count:', err)

            setSnippets(prev => prev.map(s =>
                s.$id === snippetId
                    ? { ...s, shares: currentCount }
                    : s
            ));
            alert('Failed to share. Please try again.')
        };
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

                
                <ScrollView
                    style={styles.ScrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
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

                    {!loading && !error && snippets.map((snippet) => {
                        const isLiked = likedSnippets.has(snippet.$id);
                        const showComments = visibleComments.has(snippet.$id)
                        const likeCount = snippet.likes || 0
                        const commentCount = snippet.commentsCount || 0
                        const shareCount = snippet.shares || 0

                        return (
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
                                    <Pressable style={styles.likes} onPress={() => handleToggleLike(snippet.$id)}>
                                        <Ionicons
                                            name={isLiked ? "thumbs-up" : "thumbs-up-outline"}
                                            size={28}
                                            color={isLiked ? "#06B6D4" : theme.textSecondary}
                                        />
                                        <Text style={[styles.numbers, { color: theme.textPrimary }]}>{likeCount}</Text>
                                    </Pressable>
                                    <Pressable style={styles.reactionsItem} onPress={() => handleToggleComments(snippet.$id)}>
                                        <Ionicons name="chatbubble-outline" size={24} color={theme.textSecondary} />
                                        <Text style={[styles.numbers, { color: theme.textPrimary}]}>{commentCount}</Text>
                                    </Pressable>
                                    <Pressable style={styles.reactionsItem} onPress={() => handleShare(snippet.$id)}>
                                        <Ionicons name="paper-plane-outline" size={24} color={theme.textSecondary} />
                                        <Text style={[styles.numbers, { color: theme.textPrimary}]}>{shareCount}</Text>
                                    </Pressable>
                                </View>
                                {showComments && (
                                    <View>
                                        <ThemedComments
                                            theme={theme}
                                            soundRef={soundRef}
                                            position={position}
                                            user={user}
                                            profileImage={profileImage}
                                            onCountChange={(count) => handleCommentCountChange(snippet.$id, count)}
                                            style={{}}
                                        />
                                    </View>
                                )}
                            </View>
                            <Spacer />
                            </View>
                        );
                    })}
                </ScrollView>
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
    ScrollView: {
        flex: 1,
        width: '100%',
    },
    scrollContent: {
        alignItems: 'center',
        paddingBottom: 96,
    }

})