import React, { useEffect, useRef, useState } from "react";
import { listSnippetsLikedByUser } from "../lib/snippets";
import { Audio } from "expo-av";
import { Colors } from "../constants/Colors";
import ThemedText from "./ThemedText";
import { Pressable, ScrollView, StyleSheet, View, ActivityIndicator, RefreshControl } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import ThemedSnippet from "./ThemedSnippets";

/**
 * ThemedProfileLikes - Show all snippets liked by the profile user
 * 
 * @param {string} profileUserId - The user whose liked snippets we're viewing
 * @param {object} currentUser - The current logged-in user
 * @param {object} theme - Theme object
 * @param {boolean} isActive - Whether this tab is currently active
 */
function ThemedProfileLikes({ profileUserId, currentUser, theme, isActive = true }) {
    const [likesCache, setLikesCache] = useState({});
    const [likesLoading, setLikesLoading] = useState(false);
    const [likesError, setLikesError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    // Use ref to track if we're currently fetching to prevent duplicate fetches
    const isFetchingRef = useRef(false);
    const hasFetchedRef = useRef({});

    // Audio playback coordination
    const soundRef = useRef(null);
    const [activeSnippetId, setActiveSnippetId] = useState(null);

    // Get cached likes for current profile user
    const currentLikes = likesCache[profileUserId] || [];

    // Fetch liked snippets
    useEffect(() => {
        const fetchLikedSnippets = async () => {
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
                setLikesLoading(true);
                setLikesError(null);

                const data = await listSnippetsLikedByUser(profileUserId);

                // Store in cache
                setLikesCache(prev => ({
                    ...prev,
                    [profileUserId]: data
                }));

                // Mark as fetched
                hasFetchedRef.current[profileUserId] = true;
            } catch (err) {
                console.error("Failed to fetch liked snippets:", err);
                setLikesError(err?.message || "Failed to load liked snippets");
            } finally {
                setLikesLoading(false);
                isFetchingRef.current = false;
            }
        };

        fetchLikedSnippets();
    }, [profileUserId]); // Only refresh when profile user changes

    // Handle refresh
    const handleRefresh = async () => {
        if (!profileUserId || isFetchingRef.current) {
            return;
        }

        isFetchingRef.current = true;
        setRefreshing(true);

        try {
            setLikesError(null);

            const data = await listSnippetsLikedByUser(profileUserId);

            // Update cache
            setLikesCache(prev => ({
                ...prev,
                [profileUserId]: data
            }));
        } catch (err) {
            console.error("Failed to refresh liked snippets:", err);
            setLikesError(err?.message || "Failed to refresh liked snippets");
        } finally {
            setRefreshing(false);
            isFetchingRef.current = false;
        }
    };

    // Handle snippet update (from child component)
    const handleSnippetUpdate = (updatedSnippet) => {
        setLikesCache(prev => {
            const userLikes = prev[profileUserId] || [];
            
            // Check if the snippet is still liked by the user
            const isStillLiked = updatedSnippet.likedBy?.includes(profileUserId) || false;
            
            if (isStillLiked) {
                // Update the snippet in the list
                return {
                    ...prev,
                    [profileUserId]: userLikes.map(s =>
                        s.$id === updatedSnippet.$id ? updatedSnippet : s
                    )
                };
            } else {
                // Remove the snippet from the list (user unliked it)
                return {
                    ...prev,
                    [profileUserId]: userLikes.filter(s => s.$id !== updatedSnippet.$id)
                };
            }
        });
    };

    // Handle snippet activation (audio playback coordination)
    const handleSnippetActivate = (snippetId) => {
        setActiveSnippetId(snippetId);
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
            {/* Loading State - Only show on initial load, not on refresh */}
            {likesLoading && !refreshing && currentLikes.length === 0 && (
                <View style={styles.stateContainer}>
                    <ActivityIndicator size="large" color={theme.textSecondary} />
                    <ThemedText style={styles.stateText}>Loading likes...</ThemedText>
                </View>
            )}

            {/* Error State */}
            {likesError && !likesLoading && !refreshing && (
                <View style={styles.stateContainer}>
                    <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                    <ThemedText style={[styles.stateText, { color: "#ef4444" }]}>{likesError}</ThemedText>
                    <Pressable onPress={handleRefresh} style={{ marginTop: 8 }}>
                        <ThemedText style={{ color: Colors.primary, fontWeight: '600' }}>Tap to retry</ThemedText>
                    </Pressable>
                </View>
            )}

            {/* Empty State */}
            {!likesLoading && !likesError && currentLikes.length === 0 && (
                <View style={styles.stateContainer}>
                    <Ionicons name="heart-outline" size={48} color={theme.textSecondary} />
                    <ThemedText style={styles.stateText}>No liked snippets yet</ThemedText>
                    <ThemedText style={[styles.stateSubtext, { color: theme.textSecondary }]}>
                        Snippets you like will appear here
                    </ThemedText>
                </View>
            )}

            {/* Liked Snippets List */}
            {!likesLoading && !likesError && currentLikes.length > 0 && currentLikes.map((snippet) => (
                <ThemedSnippet
                    key={snippet.$id}
                    snippet={snippet}
                    currentUser={currentUser}
                    theme={theme}
                    soundRef={soundRef}
                    activeSnippetId={activeSnippetId}
                    onSnippetActivate={handleSnippetActivate}
                    onSnippetUpdate={handleSnippetUpdate}
                />
            ))}
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
});

export default ThemedProfileLikes;
