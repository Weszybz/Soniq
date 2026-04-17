import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import { toggleSnippetLike, incrementSnippetShare } from '../lib/snippets';
import { listCommentsBySnippet } from '../lib/comments';
import ThemedWaveform from './ThemedWaveform';
import ThemedComments from './ThemedComments';
import Spacer from './Spacer';
import { Colors } from '../constants/Colors';

function ThemedSnippet({ snippet, currentUser, theme,
  soundRef: externalSoundRef,
  activeSnippetId,
  onSnippetActivate,
  onSnippetUpdate,
  onOptions,
  showComments = true,
  showShare = true,
  style,
}) {
  const router = useRouter();
  // Internal state
  const [snippetData, setSnippetData] = useState(snippet);
  const [isLiked, setIsLiked] = useState(
    snippet.likedBy?.includes(currentUser?.$id) || false
  );
  const [showCommentsSection, setShowCommentsSection] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

  // Audio state
  const internalSoundRef = useRef(null);
  const soundRef = externalSoundRef || internalSoundRef;
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);

  // Check if this snippet is active
  const isActive = activeSnippetId 
    ? activeSnippetId === snippet.$id 
    : isPlaying;

  // Sync snippet data when prop changes
  useEffect(() => {
    setSnippetData(snippet);
    setIsLiked(snippet.likedBy?.includes(currentUser?.$id) || false);
  }, [snippet, currentUser?.$id]);

  // Preload audio metadata on mount
  useEffect(() => {
    if (!snippet.fileUrl) return;

    const preloadMetadata = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri: snippet.fileUrl },
          { shouldPlay: false },
          null
        );
        
        const status = await sound.getStatusAsync();
        if (status.isLoaded && status.durationMillis) {
          setDuration(status.durationMillis);
        }
        
        await sound.unloadAsync();
      } catch (err) {
        console.warn(`Failed to preload metadata for snippet ${snippet.$id}:`, err);
      }
    };

    preloadMetadata();
  }, [snippet.fileUrl, snippet.$id]);

  // Handle like toggle
  const handleLike = async () => {
    if (!currentUser?.$id) {
      alert('Please log in to like snippets');
      return;
    }

    const currentlyLiked = isLiked;
    const currentCount = snippetData.likes || 0;
    const currentLikedBy = snippetData.likedBy || [];

    // Optimistic update
    setIsLiked(!currentlyLiked);
    const newCount = currentlyLiked 
      ? Math.max(0, currentCount - 1) 
      : currentCount + 1;
    
    const newLikedBy = currentlyLiked
      ? currentLikedBy.filter(id => id !== currentUser.$id)
      : [...currentLikedBy, currentUser.$id];

    const updatedSnippet = {
      ...snippetData,
      likes: newCount,
      likedBy: newLikedBy,
    };
    setSnippetData(updatedSnippet);

    // Notify parent of update
    if (onSnippetUpdate) {
      onSnippetUpdate(updatedSnippet);
    }

    // Update in database
    try {
      await toggleSnippetLike(
        snippet.$id,
        currentlyLiked,
        currentCount,
        currentUser.$id,
        currentLikedBy,
        { ownerId: snippet.ownerId, title: snippet.title },
      );
    } catch (err) {
      console.error('Failed to update like:', err);
      
      // Rollback on error
      setIsLiked(currentlyLiked);
      setSnippetData(snippet);
      if (onSnippetUpdate) {
        onSnippetUpdate(snippet);
      }
    }
  };

  // Handle comment toggle
  const handleCommentToggle = async () => {
    const wasVisible = showCommentsSection;
    setShowCommentsSection(!wasVisible);

    // Fetch comments if opening for the first time
    if (!wasVisible && comments.length === 0) {
      setCommentsLoading(true);
      
      try {
        const commentsFromDb = await listCommentsBySnippet(snippet.$id);
        
        const mappedComments = commentsFromDb.map(comment => ({
          id: comment.$id,
          username: comment.username,
          avatarUrl: comment.profileImage || null,
          text: comment.content,
          time: comment.timestamp || 0,
          likes: comment.likes || 0,
          likedByCurrentUser: comment.likedBy?.includes(currentUser?.$id) || false,
          replyTo: comment.parentCommentId || null,
          createdAt: comment.$createdAt,
        }));
        
        setComments(mappedComments);
      } catch (err) {
        console.error('Failed to fetch comments:', err);
        setComments([]);
      } finally {
        setCommentsLoading(false);
      }
    }
  };

  // Handle comment added
  const handleCommentAdded = () => {
    const newCount = (snippetData.commentsCount || 0) + 1;
    const updatedSnippet = {
      ...snippetData,
      commentsCount: newCount,
    };
    setSnippetData(updatedSnippet);
    
    if (onSnippetUpdate) {
      onSnippetUpdate(updatedSnippet);
    }
  };

  // Handle share
  const handleShare = async () => {
    const currentCount = snippetData.shares || 0;
    
    // Optimistic update
    const updatedSnippet = {
      ...snippetData,
      shares: currentCount + 1,
    };
    setSnippetData(updatedSnippet);
    
    if (onSnippetUpdate) {
      onSnippetUpdate(updatedSnippet);
    }

    try {
      await incrementSnippetShare(snippet.$id, currentCount);
      alert('Share link copied!');
    } catch (err) {
      console.error('Failed to update share count:', err);
      
      // Rollback on error
      setSnippetData(snippet);
      if (onSnippetUpdate) {
        onSnippetUpdate(snippet);
      }
      alert('Failed to share. Please try again.');
    }
  };

  // Handle play
  const handlePlay = () => {
    if (onSnippetActivate) {
      onSnippetActivate(snippet.$id);
    }
  };

  // Handle position change
  const handlePositionChange = (pos) => {
    setPosition(pos);
  };

  // Handle duration change
  const handleDurationChange = (dur) => {
    setDuration(dur);
  };

  // Handle profile image press - navigate to uploader's profile
  const handleProfilePress = () => {
    if (!snippetData.ownerId) {
      console.warn('No ownerId found for snippet:', snippet.$id);
      return;
    }
    
    // Navigate to profile with userId parameter
    router.push(`/profile?userId=${snippetData.ownerId}`);
  };

  const likeCount = snippetData.likes || 0;
  const commentCount = snippetData.commentsCount || 0;
  const shareCount = snippetData.shares || 0;

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
        {/* Header: Profile, Username, Genre, Options */}
        <View style={styles.cardTop}>
          <View style={styles.profileUsernameGenre}>
            <Pressable onPress={handleProfilePress}>
              <Image
                source={
                  snippetData.profileImage
                    ? { uri: snippetData.profileImage }
                    : require('../assets/icon.png')
                }
                style={styles.profileImage}
              />
            </Pressable>
            <View style={styles.userGenre}>
              <Text style={[styles.userGenreTitle, { color: theme.textPrimary }]}>
                {snippetData.username || 'Anonymous'}
              </Text>
              <View style={styles.genreContainer}>
                <View style={styles.genreDot} />
                <Text style={[styles.userGenreText, { color: theme.textSecondary }]}>
                  {snippetData.genre}
                </Text>
              </View>
            </View>
          </View>
          {onOptions && (
            <Pressable onPress={() => onOptions(snippetData)}>
              <Ionicons name="ellipsis-horizontal" size={24} color={theme.textSecondary} />
            </Pressable>
          )}
        </View>

        {/* Title + optional collaborator */}
        <View style={styles.titleBlock}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            {snippetData.title}
          </Text>
          {!!snippetData.collaboratorUsername && (
            <Pressable
              onPress={() => router.push(`/profile?userId=${snippetData.collaboratorUserId}`)}
              style={({ pressed }) => pressed && styles.collaboratorPressed}
            >
              <Text style={[styles.collaborator, { color: theme.textSecondary }]}>
                ft. @{snippetData.collaboratorUsername}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Waveform Player */}
        <View style={styles.waveform}>
          <ThemedWaveform 
            snippetId={snippet.$id}
            audioUri={snippet.fileUrl}
            theme={theme}
            soundRef={soundRef}
            isActive={isActive}
            duration={duration}
            position={position}
            onPlay={handlePlay}
            onPositionChange={handlePositionChange}
            onDurationChange={handleDurationChange}
          />
        </View>

        {/* Reactions: Like, Comment, Share */}
        <View style={styles.reactions}>
          <Pressable style={styles.reactionsItem} onPress={handleLike}>
            <Ionicons
              name={isLiked ? "thumbs-up" : "thumbs-up-outline"}
              size={28}
              color={isLiked ? Colors.primary : theme.textSecondary}
            />
            <Text style={[styles.numbers, { color: theme.textPrimary }]}>{likeCount}</Text>
          </Pressable>
          
          {showComments && (
            <Pressable style={styles.reactionsItem} onPress={handleCommentToggle}>
              <Ionicons name="chatbubble-outline" size={24} color={theme.textSecondary} />
              <Text style={[styles.numbers, { color: theme.textPrimary }]}>{commentCount}</Text>
            </Pressable>
          )}
          
          {showShare && (
            <Pressable style={styles.reactionsItem} onPress={handleShare}>
              <Ionicons name="paper-plane-outline" size={24} color={theme.textSecondary} />
              <Text style={[styles.numbers, { color: theme.textPrimary }]}>{shareCount}</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Comments Section */}
      {showComments && showCommentsSection && (
        <View style={[styles.commentsContainer, { backgroundColor: theme.cardBackground }]}>
          <ThemedComments
            snippetId={snippet.$id}
            snippetOwnerId={snippet.ownerId}
            snippetTitle={snippet.title}
            initialComments={comments}
            loading={commentsLoading}
            theme={theme}
            soundRef={soundRef}
            position={position}
            isActive={isActive}
            user={currentUser}
            profileImage={currentUser?.prefs?.profileImage}
            onCommentAdded={handleCommentAdded}
            onCommentsUpdate={setComments}
            style={{}}
          />
        </View>
      )}
      
      <Spacer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  card: {
    borderRadius: 10,
    padding: 16,
    gap: 16,
  },
  cardTop: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileUsernameGenre: {
    flexDirection: 'row',
    gap: 14,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  userGenre: {
    justifyContent: 'center',
  },
  userGenreTitle: {
    fontFamily: 'inter',
    fontWeight: '600',
    fontSize: 16,
  },
  genreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  genreDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#06B6D4',
  },
  userGenreText: {
    fontFamily: 'inter',
    fontWeight: '500',
    fontSize: 14,
  },
  titleBlock: {
    gap: 2,
  },
  title: {
    fontFamily: 'inter',
    fontWeight: '600',
    fontSize: 20,
  },
  collaborator: {
    fontFamily: 'inter',
    fontWeight: '500',
    fontSize: 13,
  },
  collaboratorPressed: {
    opacity: 0.5,
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
    alignItems: 'baseline',
  },
  numbers: {
    fontFamily: 'inter',
    fontWeight: '500',
    fontSize: 18,
  },
  commentsContainer: {
    borderRadius: 10,
    marginTop: -8,
    paddingHorizontal: 8,
  },
});

export default ThemedSnippet;
