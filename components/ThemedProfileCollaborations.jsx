import React, { useEffect, useRef, useState } from "react";
import { listCollaborativeSnippetsByUser } from "../lib/snippets";
import { Colors } from "../constants/Colors";
import ThemedText from "./ThemedText";
import { Pressable, ScrollView, StyleSheet, View, ActivityIndicator, RefreshControl } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import ThemedSnippet from "./ThemedSnippets";


function ThemedProfileCollaborations({ profileUserId, currentUser, theme, isActive = true }) {
    const [collabCache, setCollabCache] = useState({});
    const [collabLoading, setCollabLoading] = useState(false);
    const [collabError, setCollabError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    const isFetchingRef = useRef(false);
    const hasFetchedRef = useRef({});

    const soundRef = useRef(null);
    const [activeSnippetId, setActiveSnippetId] = useState(null);

    const currentCollabs = collabCache[profileUserId] || [];

    useEffect(() => {
        const fetchCollabs = async () => {
            if (!profileUserId) return;
            if (hasFetchedRef.current[profileUserId]) return;
            if (isFetchingRef.current) return;

            isFetchingRef.current = true;

            try {
                setCollabLoading(true);
                setCollabError(null);

                const data = await listCollaborativeSnippetsByUser(profileUserId);

                setCollabCache(prev => ({ ...prev, [profileUserId]: data }));
                hasFetchedRef.current[profileUserId] = true;
            } catch (err) {
                console.error("Failed to fetch collaborative snippets:", err);
                setCollabError(err?.message || "Failed to load collaborations");
            } finally {
                setCollabLoading(false);
                isFetchingRef.current = false;
            }
        };

        fetchCollabs();
    }, [profileUserId]);

    const handleRefresh = async () => {
        if (!profileUserId || isFetchingRef.current) return;

        isFetchingRef.current = true;
        setRefreshing(true);

        try {
            setCollabError(null);

            const data = await listCollaborativeSnippetsByUser(profileUserId);
            setCollabCache(prev => ({ ...prev, [profileUserId]: data }));

            // Allow re-fetch next time profile changes
            hasFetchedRef.current[profileUserId] = true;
        } catch (err) {
            console.error("Failed to refresh collaborations:", err);
            setCollabError(err?.message || "Failed to refresh collaborations");
        } finally {
            setRefreshing(false);
            isFetchingRef.current = false;
        }
    };

    const handleSnippetUpdate = (updatedSnippet) => {
        setCollabCache(prev => ({
            ...prev,
            [profileUserId]: (prev[profileUserId] || []).map(s =>
                s.$id === updatedSnippet.$id ? updatedSnippet : s
            ),
        }));
    };

    const handleSnippetActivate = (snippetId) => {
        setActiveSnippetId(snippetId);
    };

    if (!isActive) return null;

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
            {/* Loading */}
            {collabLoading && !refreshing && currentCollabs.length === 0 && (
                <View style={styles.stateContainer}>
                    <ActivityIndicator size="large" color={theme.textSecondary} />
                    <ThemedText style={styles.stateText}>Loading collaborations...</ThemedText>
                </View>
            )}

            {/* Error */}
            {collabError && !collabLoading && !refreshing && (
                <View style={styles.stateContainer}>
                    <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                    <ThemedText style={[styles.stateText, { color: "#ef4444" }]}>{collabError}</ThemedText>
                    <Pressable onPress={handleRefresh} style={{ marginTop: 8 }}>
                        <ThemedText style={{ color: Colors.primary, fontWeight: '600' }}>Tap to retry</ThemedText>
                    </Pressable>
                </View>
            )}

            {/* Empty */}
            {!collabLoading && !collabError && currentCollabs.length === 0 && (
                <View style={styles.stateContainer}>
                    <Ionicons name="people-outline" size={48} color={theme.textSecondary} />
                    <ThemedText style={styles.stateText}>No collaborations yet</ThemedText>
                    <ThemedText style={[styles.stateSubtext, { color: theme.textSecondary }]}>
                        Collaborative snippets will appear here
                    </ThemedText>
                </View>
            )}

            {/* Collaboration Snippets */}
            {!collabLoading && !collabError && currentCollabs.length > 0 && currentCollabs.map((snippet) => (
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

export default ThemedProfileCollaborations;
