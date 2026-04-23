import { StyleSheet, Text, View, useColorScheme, Pressable, Image, TextInput, TouchableWithoutFeedback, Keyboard, ActivityIndicator, ScrollView, RefreshControl} from 'react-native'
import { React, useMemo, useState, useRef, useEffect } from 'react'
import { Colors } from '../../constants/Colors';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useProfile } from '../../contexts/ProfileContext';
import { useUser } from '../../hooks/useUser';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useBottomSheet } from '../../contexts/BottomSheetContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { listSnippets, toggleSnippetLike, updateSnippetCommentCount, incrementSnippetShare } from '../../lib/snippets';
import { listCommentsBySnippet } from '../../lib/comments';
import { Audio } from 'expo-av';
import { useSharedValue } from 'react-native-reanimated';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';

// themed components
import ThemedView from '../../components/ThemedView';
import ThemedText from '../../components/ThemedText';
import Spacer from '../../components/Spacer';
import ThemedButton from '../../components/ThemedButton';
import ThemedTextInput from '../../components/ThemedTextInput';
import ThemedBottomSheet from '../../components/ThemedBottomSheet';
import ThemedWaveform from '../../components/ThemedWaveform';
import ThemedComments from '../../components/ThemedComments';
import ThemedOptions from '../../components/ThemedOptions';
import ThemedSnippet from '../../components/ThemedSnippets';
import ThemedSearchBar from '../../components/ThemedSearchBar';
import ThemedShare from '../../components/ThemedShare';

const formatDate = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
};

const SnippetDetail = () => {
  const { snippetId } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;
  const { user } = useUser();

  const [snippet, setSnippet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Like state
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [shareCount, setShareCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);

  // Audio state
  const soundRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);

  // Comments
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

  const fetchSnippet = useCallback(async () => {
    if (!snippetId) {
      setError('No snippet ID provided.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const doc = await getSnippetById(snippetId);
      setSnippet(doc);
      setIsLiked(doc.likedBy?.includes(user?.$id) || false);
      setLikeCount(doc.likes || 0);
      setShareCount(doc.shares || 0);
      setCommentCount(doc.commentsCount || 0);
    } catch (err) {
      console.error('Failed to load snippet:', err);
      setError('Could not load this snippet.');
    } finally {
      setLoading(false);
    }
  }, [snippetId, user?.$id]);

  const fetchComments = useCallback(async () => {
    if (!snippetId) return;
    setCommentsLoading(true);
    try {
      const docs = await listCommentsBySnippet(snippetId);
      setComments(
        docs.map((c) => ({
          id: c.$id,
          username: c.username,
          avatarUrl: c.profileImage || null,
          text: c.content,
          time: c.timestamp || 0,
          likes: c.likes || 0,
          likedByCurrentUser: c.likedBy?.includes(user?.$id) || false,
          replyTo: c.parentCommentId || null,
          createdAt: c.$createdAt,
        }))
      );
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setCommentsLoading(false);
    }
  }, [snippetId, user?.$id]);

  useEffect(() => {
    fetchSnippet();
    fetchComments();
  }, [fetchSnippet, fetchComments]);

  // Preload audio duration
  useEffect(() => {
    if (!snippet?.fileUrl) return;
    let mounted = true;
    const preload = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri: snippet.fileUrl },
          { shouldPlay: false },
          null
        );
        const status = await sound.getStatusAsync();
        if (mounted && status.isLoaded && status.durationMillis) {
          setDuration(status.durationMillis);
        }
        await sound.unloadAsync();
      } catch {}
    };
    preload();
    return () => { mounted = false; };
  }, [snippet?.fileUrl]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  const handleLike = async () => {
    if (!user?.$id || !snippet) return;
    const wasLiked = isLiked;
    const prevCount = likeCount;
    const prevLikedBy = snippet.likedBy || [];

    setIsLiked(!wasLiked);
    setLikeCount(wasLiked ? Math.max(0, prevCount - 1) : prevCount + 1);

    try {
      await toggleSnippetLike(
        snippet.$id,
        wasLiked,
        prevCount,
        user.$id,
        prevLikedBy,
        { ownerId: snippet.ownerId, title: snippet.title }
      );
    } catch (err) {
      setIsLiked(wasLiked);
      setLikeCount(prevCount);
    }
  };

  const handleShare = async () => {
    if (!snippet) return;
    const prev = shareCount;
    setShareCount(prev + 1);
    try {
      await incrementSnippetShare(snippet.$id, prev);
    } catch {
      setShareCount(prev);
    }
  };

  const handleCommentAdded = () => {
    setCommentCount((c) => c + 1);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <Pressable onPress={() => router.back()} style={styles.floatingBack} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={theme.textPrimary} />
        </Pressable>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !snippet) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <Pressable onPress={() => router.back()} style={styles.floatingBack} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={theme.textPrimary} />
        </Pressable>
        <View style={styles.center}>
          <Ionicons name="musical-notes-outline" size={56} color={theme.textSecondary} />
          <Text style={[styles.errorTitle, { color: theme.textPrimary }]}>Snippet not found</Text>
          <Text style={[styles.errorBody, { color: theme.textSecondary }]}>
            {error || 'This snippet may have been removed.'}
          </Text>
          <Pressable
            style={[styles.retryBtn, { backgroundColor: Colors.primary }]}
            onPress={fetchSnippet}
          >
            <Text style={styles.retryBtnText}>Try again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => router.back()} style={styles.backRow} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={theme.textPrimary} />
        </Pressable>

        <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
          <Pressable
            style={styles.profileRow}
            onPress={() => router.push(`/profile?userId=${snippet.ownerId}`)}
          >
            <Image
              source={
                snippet.profileImage
                  ? { uri: snippet.profileImage }
                  : require('../../assets/icon.png')
              }
              style={styles.avatar}
            />
            <View style={styles.userMeta}>
              <Text style={[styles.username, { color: theme.textPrimary }]}>
                {snippet.username || 'Anonymous'}
              </Text>
              <View style={styles.genreRow}>
                <View style={styles.genreDot} />
                <Text style={[styles.genre, { color: theme.textSecondary }]}>
                  {snippet.genre}
                </Text>
              </View>
            </View>
          </Pressable>

          <View style={styles.titleBlock}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>
              {snippet.title}
            </Text>
            {!!snippet.collaboratorUsername && (
              <Pressable
                onPress={() => router.push(`/profile?userId=${snippet.collaboratorUserId}`)}
              >
                <Text style={[styles.collaborator, { color: theme.textSecondary }]}>
                  ft. @{snippet.collaboratorUsername}
                </Text>
              </Pressable>
            )}
          </View>

          <View style={styles.waveformContainer}>
            <ThemedWaveform
              snippetId={snippet.$id}
              audioUri={snippet.fileUrl}
              theme={theme}
              soundRef={soundRef}
              isActive={isPlaying}
              duration={duration}
              position={position}
              onPlay={() => setIsPlaying(true)}
              onPositionChange={setPosition}
              onDurationChange={setDuration}
            />
          </View>

  
          <View style={styles.reactions}>
            <Pressable style={styles.reactionItem} onPress={handleLike}>
              <Ionicons
                name={isLiked ? 'thumbs-up' : 'thumbs-up-outline'}
                size={30}
                color={isLiked ? '#06B6D4' : theme.textSecondary}
              />
              <Text style={[styles.reactionCount, { color: theme.textPrimary }]}>
                {likeCount}
              </Text>
            </Pressable>

            <View style={styles.reactionItem}>
              <Ionicons name="chatbubble-outline" size={26} color={theme.textSecondary} />
              <Text style={[styles.reactionCount, { color: theme.textPrimary }]}>
                {commentCount}
              </Text>
            </View>

            <Pressable style={styles.reactionItem} onPress={handleShare}>
              <Ionicons name="paper-plane-outline" size={26} color={theme.textSecondary} />
              <Text style={[styles.reactionCount, { color: theme.textPrimary }]}>
                {shareCount}
              </Text>
            </Pressable>
          </View>

          <Text style={[styles.uploadDate, { color: theme.textSecondary }]}>
            Uploaded {formatDate(snippet.$createdAt || snippet.createdAt)}
          </Text>
        </View>

        <View style={[styles.commentsCard, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.commentsSectionTitle, { color: theme.textPrimary }]}>
            Comments
          </Text>
          <ThemedComments
            snippetId={snippet.$id}
            snippetOwnerId={snippet.ownerId}
            snippetTitle={snippet.title}
            initialComments={comments}
            loading={commentsLoading}
            theme={theme}
            soundRef={soundRef}
            position={position}
            isActive={isPlaying}
            user={user}
            profileImage={user?.prefs?.profileImage}
            onCommentAdded={handleCommentAdded}
            onCommentsUpdate={setComments}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SnippetDetail;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  floatingBack: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
    padding: 4,
  },
  backRow: {
    alignSelf: 'flex-start',
    marginBottom: 4,
    padding: 2,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'inter',
    textAlign: 'center',
  },
  errorBody: {
    fontSize: 15,
    fontFamily: 'inter',
    textAlign: 'center',
    lineHeight: 22,
  },
  retryBtn: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 22,
  },
  retryBtnText: {
    color: '#fff',
    fontFamily: 'inter',
    fontWeight: '600',
    fontSize: 15,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 120,
  },
  card: {
    borderRadius: 14,
    padding: 20,
    gap: 20,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  userMeta: {
    justifyContent: 'center',
    gap: 4,
  },
  username: {
    fontFamily: 'inter',
    fontWeight: '700',
    fontSize: 18,
  },
  genreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  genreDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#06B6D4',
  },
  genre: {
    fontFamily: 'inter',
    fontWeight: '500',
    fontSize: 14,
  },
  titleBlock: {
    gap: 4,
  },
  title: {
    fontFamily: 'inter',
    fontWeight: '700',
    fontSize: 28,
    lineHeight: 34,
  },
  collaborator: {
    fontFamily: 'inter',
    fontWeight: '500',
    fontSize: 14,
  },
  waveformContainer: {
    marginVertical: 4,
  },
  reactions: {
    flexDirection: 'row',
    gap: 24,
    alignItems: 'center',
  },
  reactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reactionCount: {
    fontFamily: 'inter',
    fontWeight: '600',
    fontSize: 18,
  },
  uploadDate: {
    fontFamily: 'inter',
    fontSize: 13,
    marginTop: -8,
  },
  commentsCard: {
    borderRadius: 14,
    padding: 16,
    gap: 4,
    paddingTop: 20,
  },
  commentsSectionTitle: {
    fontFamily: 'inter',
    fontWeight: '700',
    fontSize: 18,
    marginBottom: 8,
  },
});
