import React, { useEffect, useRef, useState } from "react";
import { listSnippetsByUser } from "../lib/snippets";
import { listCommentsBySnippetIds } from "../lib/comments";
import { Colors } from "../constants/Colors";
import ThemedText from "./ThemedText";
import { Pressable, ScrollView, StyleSheet, View, ActivityIndicator, RefreshControl, Text, Image } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'expo-router';


function formatRelativeTime(timestamp) {
    try {
        return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (err) {
        return 'Unknown time';
    }
}

function getInitials(username) {
    if (!username) return '?';
    const parts = username.trim().split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return username.slice(0, 2).toUpperCase();
}

const AVATAR_HIT_SLOP = { top: 6, bottom: 6, left: 6, right: 6 };

function FeedbackCard({ comment, snippetTitle, theme, isReply, onAvatarPress }) {
    const hasProfileImage = comment.profileImage && comment.profileImage.trim() !== '';

    return (
        <View style={[
            styles.feedbackCard,
            { backgroundColor: theme.cardBackground },
            isReply && styles.replyCard
        ]}>
            {/* Reply indicator line */}
            {isReply && (
                <View style={[styles.replyLine, { backgroundColor: theme.divider }]} />
            )}

            <View style={styles.feedbackContent}>
                {/* Avatar */}
                <View style={styles.avatarContainer}>
                    <Pressable
                        onPress={(e) => {
                            e.stopPropagation();
                            onAvatarPress && onAvatarPress(comment);
                        }}
                        >
                            {hasProfileImage ? (
                                <Image
                                    source={{ uri: comment.profileImage }}
                                    style={styles.avatar}
                                />
                            ) : (
                                <View style={[styles.avatarFallback, { backgroundColor: Colors.primary }]}>
                                    <Text style={styles.avatarInitials}>{getInitials(comment.username)}</Text>
                                </View>
                            )}
                    </Pressable>
                </View>

                {/* Main content */}
                <View style={styles.feedbackMain}>
                    {/* Header: username + badge + time */}
                    <View style={styles.feedbackHeader}>
                        <View style={styles.feedbackHeaderLeft}>
                            <Text style={[styles.feedbackUsername, { color: theme.textPrimary }]}>
                                {comment.username}
                            </Text>
                            {isReply && (
                                <View style={[styles.replyBadge, { backgroundColor: theme.divider }]}>
                                    <Text style={[styles.replyBadgeText, { color: theme.textSecondary }]}>Reply</Text>
                                </View>
                            )}
                        </View>
                        <Text style={[styles.feedbackTime, { color: theme.textSecondary }]}>
                            {formatRelativeTime(comment.$createdAt)}
                        </Text>
                    </View>

                    {/* Comment text (truncated) */}
                    <Text 
                        style={[styles.feedbackText, { color: theme.textPrimary }]}
                        numberOfLines={3}
                        ellipsizeMode="tail"
                    >
                        {comment.content}
                    </Text>

                    {/* Snippet context */}
                    <View style={styles.snippetContext}>
                        <Ionicons name="musical-note" size={14} color={theme.textSecondary} />
                        <Text 
                            style={[styles.snippetContextText, { color: theme.textSecondary }]}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                        >
                            on: {snippetTitle || 'Untitled'}
                        </Text>
                    </View>

                    {/* Footer: likes */}
                    {comment.likes > 0 && (
                        <View style={styles.feedbackFooter}>
                            <Ionicons name="heart" size={14} color="#ef4444" />
                            <Text style={[styles.likesText, { color: theme.textSecondary }]}>
                                {comment.likes} {comment.likes === 1 ? 'like' : 'likes'}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
}

function ThemedProfileFeedback({ profileUserId, theme, isActive = true }) {
    const router = useRouter();

    const handleAvatarPress = (comment) => {
        if (!comment?.userId) {
            console.warn('No userId on comment', comment?.$id);
            return;
        }
        router.push(`/profile?userId=${comment.userId}`);
    };

    const [feedbackCache, setFeedbackCache] = useState({});
    const [snippetMapCache, setSnippetMapCache] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    // Use ref to track if we're currently fetching
    const isFetchingRef = useRef(false);
    const hasFetchedRef = useRef({});

    // Get cached feedback and snippet map for current profile user
    const currentFeedback = feedbackCache[profileUserId] || [];
    const snippetMap = snippetMapCache[profileUserId] || {};

    // Fetch feedback
    useEffect(() => {
        const fetchFeedback = async () => {
            if (!profileUserId) {
                return;
            }

            // Check if we already have cached data for this user
            if (hasFetchedRef.current[profileUserId]) {
                return;
            }

            // Prevent duplicate fetches
            if (isFetchingRef.current) {
                return;
            }

            isFetchingRef.current = true;

            try {
                setLoading(true);
                setError(null);

                // Step 1: Fetch user's snippets
                const snippets = await listSnippetsByUser(profileUserId);

                // Build snippet map
                const map = {};
                const snippetIds = [];
                
                snippets.forEach(snippet => {
                    map[snippet.$id] = {
                        title: snippet.title,
                        genre: snippet.genre,
                    };
                    snippetIds.push(snippet.$id);
                });

                // Step 2: Fetch comments for those snippets
                const comments = snippetIds.length > 0 
                    ? await listCommentsBySnippetIds(snippetIds)
                    : [];

                // Store in cache
                setFeedbackCache(prev => ({
                    ...prev,
                    [profileUserId]: comments
                }));

                setSnippetMapCache(prev => ({
                    ...prev,
                    [profileUserId]: map
                }));

                // Mark as fetched
                hasFetchedRef.current[profileUserId] = true;
            } catch (err) {
                console.error("Failed to fetch feedback:", err);
                setError(err?.message || "Failed to load feedback");
            } finally {
                setLoading(false);
                isFetchingRef.current = false;
            }
        };

        fetchFeedback();
    }, [profileUserId]);

    // Handle refresh
    const handleRefresh = async () => {
        if (!profileUserId || isFetchingRef.current) {
            return;
        }

        isFetchingRef.current = true;
        setRefreshing(true);

        try {
            setError(null);

            // Fetch user's snippets
            const snippets = await listSnippetsByUser(profileUserId);

            // Build snippet map
            const map = {};
            const snippetIds = [];
            
            snippets.forEach(snippet => {
                map[snippet.$id] = {
                    title: snippet.title,
                    genre: snippet.genre,
                };
                snippetIds.push(snippet.$id);
            });

            // Fetch comments for those snippets
            const comments = snippetIds.length > 0 
                ? await listCommentsBySnippetIds(snippetIds)
                : [];

            // Update cache
            setFeedbackCache(prev => ({
                ...prev,
                [profileUserId]: comments
            }));

            setSnippetMapCache(prev => ({
                ...prev,
                [profileUserId]: map
            }));
        } catch (err) {
            console.error("Failed to refresh feedback:", err);
            setError(err?.message || "Failed to refresh feedback");
        } finally {
            setRefreshing(false);
            isFetchingRef.current = false;
        }
    };

    // Don't render anything if not active
    if (!isActive) {
        return null;
    }

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    tintColor={theme.textSecondary}
                    colors={[theme.textSecondary]}
                />
            }
        >
            {/* Loading State */}
            {loading && !refreshing && currentFeedback.length === 0 && (
                <View style={styles.stateContainer}>
                    <ActivityIndicator size="large" color={theme.textSecondary} />
                    <ThemedText style={styles.stateText}>Loading feedback...</ThemedText>
                </View>
            )}

            {/* Error State */}
            {error && !loading && !refreshing && (
                <View style={styles.stateContainer}>
                    <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                    <ThemedText style={[styles.stateText, { color: "#ef4444" }]}>{error}</ThemedText>
                    <Pressable onPress={handleRefresh} style={{ marginTop: 8 }}>
                        <ThemedText style={{ color: Colors.primary, fontWeight: '600' }}>Tap to retry</ThemedText>
                    </Pressable>
                </View>
            )}

            {/* Empty State */}
            {!loading && !error && currentFeedback.length === 0 && (
                <View style={styles.stateContainer}>
                    <Ionicons name="chatbubbles-outline" size={48} color={theme.textSecondary} />
                    <ThemedText style={styles.stateText}>No feedback yet</ThemedText>
                    <ThemedText style={[styles.stateSubtext, { color: theme.textSecondary }]}>
                        Comments on your snippets will appear here
                    </ThemedText>
                </View>
            )}

            {/* Feedback List */}
            {!loading && !error && currentFeedback.length > 0 && currentFeedback.map((comment) => {
                const snippetInfo = snippetMap[comment.snippetId] || {};
                const isReply = !!comment.parentCommentId;

                return (
                    <FeedbackCard
                        key={comment.$id}
                        comment={comment}
                        snippetTitle={snippetInfo.title}
                        theme={theme}
                        isReply={isReply}
                        onAvatarPress={handleAvatarPress}
                    />
                );
            })}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
    },
    contentContainer: {
        paddingBottom: 24,
    },
    stateContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 64,
        gap: 12,
    },
    stateText: {
        fontFamily: 'inter',
        fontWeight: '600',
        fontSize: 16,
        textAlign: 'center',
    },
    stateSubtext: {
        fontFamily: 'inter',
        fontWeight: '400',
        fontSize: 14,
        textAlign: 'center',
    },
    feedbackCard: {
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
    },
    replyCard: {
        marginLeft: 16,
    },
    replyLine: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
        borderTopLeftRadius: 12,
        borderBottomLeftRadius: 12,
    },
    feedbackContent: {
        flexDirection: 'row',
        gap: 12,
    },
    avatarContainer: {
        flexShrink: 0,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    avatarFallback: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitials: {
        color: '#fff',
        fontFamily: 'inter',
        fontWeight: '600',
        fontSize: 16,
    },
    feedbackMain: {
        flex: 1,
        gap: 6,
    },
    feedbackHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    feedbackHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    feedbackUsername: {
        fontFamily: 'inter',
        fontWeight: '600',
        fontSize: 15,
    },
    replyBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    replyBadgeText: {
        fontFamily: 'inter',
        fontWeight: '500',
        fontSize: 11,
    },
    feedbackTime: {
        fontFamily: 'inter',
        fontWeight: '400',
        fontSize: 13,
    },
    feedbackText: {
        fontFamily: 'inter',
        fontWeight: '400',
        fontSize: 14,
        lineHeight: 20,
    },
    snippetContext: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    snippetContextText: {
        fontFamily: 'inter',
        fontWeight: '500',
        fontSize: 13,
        fontStyle: 'italic',
        flex: 1,
    },
    feedbackFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    likesText: {
        fontFamily: 'inter',
        fontWeight: '500',
        fontSize: 12,
    },
});

export default ThemedProfileFeedback;
