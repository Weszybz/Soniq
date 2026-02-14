import React, { useEffect, useRef, useState } from "react";
import { listSnippetsByUser } from "../lib/snippets";
import { Audio } from "expo-av";
import { Colors } from "../constants/Colors"
import ThemedText from "./ThemedText";
import { Pressable, ScrollView, StyleSheet, View, ActivityIndicator, RefreshControl, Text } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import ThemedSnippet from "./ThemedSnippets";


function ThemedProfileSnippets({ profileUserId, currentUser, theme, isActive = true }) {
    const [snippetsCache, setSnippetsCache] = useState({});
    const [snippetsLoading, setSnippetsLoading] = useState(false);
    const [snippetsError, setSnippetsError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    // Use ref to track if we're currently fetching to prevent duplicate fetches
    const isFetchingRef = useRef(false);
    const hasFetchedRef = useRef({});

    // Audio playback coordination
    const soundRef = useRef(null);
    const [activeSnippetId, setActiveSnippetId] = useState(null);

    // Get cached snippets for current profile user
    const currentSnippets = snippetsCache[profileUserId] || [];

    // Fetch snippets
    useEffect(() => {
        const fetchUserSnippets = async () => {
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
                setSnippetsLoading(true);
                setSnippetsError(null);

                const data = await listSnippetsByUser(profileUserId);

                // Store in cache
                setSnippetsCache(prev => ({
                    ...prev,
                    [profileUserId]: data
                }));

                // Mark as fetched
                hasFetchedRef.current[profileUserId] = true;
            } catch (err) {
                console.error("Failed to fetch user snippets:", err);
                setSnippetsError(err?.message || "Failed to load snippets");

            } finally {
                setSnippetsLoading(false);
                isFetchingRef.current = false;
            }
        };

        fetchUserSnippets();
    }, [profileUserId]); // Only refresh when profile user changes

    const handleRefresh = async () => {
        if (!profileUserId || isFetchingRef.current) {
            return;
        }

        isFetchingRef.current = true;
        setRefreshing(true);

        try {
            setSnippetsError(null);

            const data = await listSnippetsByUser(profileUserId);

            // Update cache
            setSnippetsCache(prev => ({
                ...prev,
                [profileUserId]: data
            }));
        } catch (err) {
            console.error("Failed to refresh snippets:", err);
            setSnippetsError(err?.message || "Failed to refresh snippets");
        } finally {
            setRefreshing(false);
            isFetchingRef.current = false;
        }
    };

    // Handle snippet update (from child component)
    const handleSnippetUpdate = (updatedSnippet) => {
        setSnippetsCache(prev => ({
            ...prev,
            [profileUserId]: (prev[profileUserId] || []).map(s =>
                s.$id === updatedSnippet.$id ? updatedSnippet : s
            )
        }));
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
            {snippetsLoading && !refreshing && currentSnippets.length === 0 && (
                <View style={styles.stateContainer}>
                    <ActivityIndicator size="large" color={theme.textSecondary} />
                    <ThemedText style={[styles.stateText]}>Loading snippets...</ThemedText>
                </View>
            )}

            {snippetsError && !snippetsLoading && !refreshing && (
                <View style={[styles.stateContainer]}>
                    <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                    <ThemedText style={[styles.feedStateText, { color: "#ef4444" }]}>{snippetsError}</ThemedText>
                    <Pressable onPress={handleRefresh} style={{ marginTop: 8 }}>
                        <ThemedText style={{ color: Colors.primary, fontWeight: '600' }}>Tap to retry</ThemedText>
                    </Pressable>
                </View>
            )}

            {/* Empty State */}
            {!snippetsLoading && !snippetsError && currentSnippets.length === 0 && (
                <View style={styles.stateContainer}>
                    <Ionicons name="musical-notes-outline" size={48} color={theme.textSecondary} />
                    <ThemedText style={styles.stateText}>No snippets yet</ThemedText>
                    <ThemedText style={[styles.stateSubtext, { color: theme.textSecondary }]}>Upload your first snippet to get started</ThemedText>
                </View>
            )}

            {/* Snippets List */}
            {!snippetsLoading && !snippetsError && currentSnippets.length > 0 && currentSnippets.map((snippet) => (
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
    )
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

export default ThemedProfileSnippets;
