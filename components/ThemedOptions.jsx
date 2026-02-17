import { StyleSheet, View, Text, Pressable, ScrollView, SectionListComponent, ActivityIndicator } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from "react";
import { isFollowing, followUser, unfollowUser } from '../lib/followService';
import { Colors } from "../constants/Colors";

const ThemedOptions = ({ snippet, theme, user, onClose }) => {
    const isOwner = snippet?.ownerId === user?.$id;

    // Follow state - always start fresh
    const [isFollowingUser, setIsFollowingUser] = useState(false);
    const [followLoading, setFollowLoading] = useState(true);
    const [followActionLoading, setFollowActionLoading] = useState(false);
    
    // Check if current user follows the snippet owner
    // Use a ref to track if we need to check again
    useEffect(() => {
        let isMounted = true;
        
        const checkFollowStatus = async () => {
        if (isOwner || !user?.$id || !snippet?.ownerId) {
            if (isMounted) setFollowLoading(false);
            return;
        }
        
        if (isMounted) {
            setFollowLoading(true);
            setIsFollowingUser(false);
        }
        
        try {
            console.log('ThemedOptions: Checking follow status for snippet owner:', snippet.ownerId);
            const following = await isFollowing(user.$id, snippet.ownerId);
            console.log('ThemedOptions: Follow status result:', following);
            
            if (isMounted) {
            setIsFollowingUser(following);
            }
        } catch (err) {
            console.error('Failed to check follow status:', err);
        } finally {
            if (isMounted) {
            setFollowLoading(false);
            }
        }
        };
        
        // Always check on mount
        checkFollowStatus();
        
        // Cleanup function
        return () => {
        isMounted = false;
        };
    }, []);
    
    // Handle follow action
    const handleFollow = async () => {
        if (!user?.$id || !snippet?.ownerId || followActionLoading) return;
        
        setFollowActionLoading(true);
        setIsFollowingUser(true);
        
        try {
        // Get current user's username and profile image
        const username = user.prefs?.username || user.name || 'User';
        const profileImage = user.prefs?.profileImage || null;
        
        await followUser(user.$id, snippet.ownerId, username, profileImage);
        
        // Close after successful follow
        setTimeout(() => {
            onClose?.();
        }, 500);
        } catch (err) {
        console.error('Failed to follow user:', err);
        // Rollback
        setIsFollowingUser(false);
        alert('Failed to follow user. Please try again.');
        } finally {
        setFollowActionLoading(false);
        }
    };
    
    // Handle unfollow action
    const handleUnfollow = async () => {
        if (!user?.$id || !snippet?.ownerId || followActionLoading) return;
        
        setFollowActionLoading(true);
        setIsFollowingUser(false);
        
        try {
        await unfollowUser(user.$id, snippet.ownerId);
        
        // Close after successful unfollow
        setTimeout(() => {
            onClose?.();
        }, 500);
        } catch (err) {
        console.error('Failed to unfollow user:', err);
        // Rollback
        setIsFollowingUser(true);
        alert('Failed to unfollow user. Please try again.');
        } finally {
        setFollowActionLoading(false);
        }
    };

    const ownerActions = [
        {
            id: 'edit',
            label: 'Edit Snippet',
            icon: 'create-outline',
            onPress: () => {
                console.log('Edit snippet:', snippet.$id);
                onClose?.();
            }
        },
        {
            id: 'stats',
            label: 'View Stats / Analytics',
            icon: 'stats-chart-outline',
            onPress: () => {
                console.log('View stats for snippet:', snippet.$id);
                onClose?.();
            }
        },
        {
            id: 'delete',
            label: 'Delete Snippet',
            icon: 'trash-outline',
            onPress: () => {
                console.log('Delete snippet:', snippet.$id);
                onClose?.();
            }
        },
    ];

    const topActions = [
        {
            id: 'bookmark',
            label: 'Save',
            icon: 'bookmark-outline',
            onPress: () => {
                console.log('Bookmark snippet:', snippet.$id);
                onClose?.();
            }
        },
        {
            id: 'share',
            label: 'Share',
            icon: 'share-outline',
            onPress: () => {
                console.log('Share snippet:', snippet.$id);
                onClose?.();
            }
        },
        {
            id: 'repost',
            label: 'Repost',
            icon: 'repeat-outline',
            onPress: () => {
                console.log('Repost snippet', snippet.$id);
                onClose?.();
            }
        },
    ];

    const verticalActions = [
        {
            id: 'about',
            label: 'About this snippet',
            icon: 'information-circle-outline',
            onPress: () => {
                console.log('About snippet:', snippet.$id);
                onClose?.();
            }
        },
        // {
        //     id: 'interested',
        //     label: 'Interested',
        //     icon: 'heart-outline',
        //     onPress: () => {
        //         console.log('Interested in snippet:', snippet.$id);
        //         onClose?.();
        //     }
        // },
        // {
        //     id: 'not-interested',
        //     label: 'Not Interested',
        //     icon: 'heart-dislike-outline',
        //     onPress: () => {
        //         console.log('Not interested in snippet:', snippet.$id);
        //         onClose?.();
        //     }
        // },
        {
            id: 'report',
            label: 'Report',
            icon: 'flag-outline',
            isDanger: true,
            onPress: () => {
                console.log('Report snippet:', snippet.$id);
                onClose?.();
            }
        },
    ];

    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.scrowView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.topActionsRow}>
                    {topActions.map((action) => (
                        <Pressable
                            key={action.id}
                            style={({ pressed }) => [
                                styles.topActionButton,
                                {
                                    backgroundColor: pressed ? theme.uiBackground : theme.cardBackground,
                                    opacity: pressed ? 0.7 : 1
                                }
                            ]}
                            onPress={action.onPress}
                            >
                                <View style={styles.topActionIconContainer}>
                                    <Ionicons name={action.icon} size={26} color={theme.textPrimary} />
                                </View>
                                <Text style={[styles.topActionLabel, { color: theme.textPrimary }]}>
                                    {action.label}
                                </Text>
                            </Pressable>
                    ))}
                </View>

                {/* Follow Button - shown only when NOT owner */}
                {!isOwner && (
                    <>
                        {followLoading ? (
                            <View style={styles.followButtonSkeleton}>
                                <ActivityIndicator size="small" color={theme.textSecondary} />
                            </View>
                        ) : isFollowingUser ? (
                            <Pressable
                                style={({ pressed }) => [
                                styles.followButton,
                                styles.unfollowButton,
                                { 
                                    backgroundColor: theme.uiBackground,
                                    borderColor: theme.divider,
                                    opacity: pressed ? 0.8 : 1
                                }
                                ]}
                                onPress={handleUnfollow}
                                disabled={followActionLoading}
                            >
                                {followActionLoading ? (
                                    <ActivityIndicator size="small" color={theme.textPrimary} />
                                ) : (
                                    <>
                                        <Ionicons name="person-remove-outline" size={20} color={theme.textPrimary} />
                                        <Text style={[styles.followButtonText, { color: theme.textPrimary }]}>Unfollow</Text>
                                    </>
                                )}
                            </Pressable>
                        ) : (
                            <Pressable
                                style={({ pressed }) => [
                                styles.followButton,
                                { 
                                    backgroundColor: Colors.primary,
                                    opacity: pressed ? 0.8 : 1
                                }
                                ]}
                                onPress={handleFollow}
                                disabled={followActionLoading}
                            >
                                {followActionLoading ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <>
                                        <Ionicons name="person-add-outline" size={20} color="#FFFFFF" />
                                        <Text style={styles.followButtonText}>Follow</Text>
                                    </>
                                )}
                            </Pressable>
                        )}
                    </>
                )}

                {/* Vertical Action List */}
                <View style={[styles.actionGroup, { backgroundColor: theme.cardBackground }]}>
                    {verticalActions.map((action, index) => (
                        <View key={action.id}>
                            <Pressable
                                style={({ pressed }) => [
                                    styles.actionRow,
                                    { backgroundColor: pressed ? theme.uiBackground : 'transparent' }
                                ]}
                                onPress={action.onPress}
                            >
                                <View style={styles.iconContainer}>
                                    <Ionicons
                                        name={action.icon}
                                        size={22}
                                        color={action.isDanger ? theme.red : theme.textPrimary} //#ef4444
                                    />
                                </View>
                                <Text
                                    style={[
                                        styles.actionLabel,
                                        { color: action.isDanger ? theme.red : theme.textPrimary} //#ef4444
                                    ]}
                                >
                                    {action.label}
                                </Text>
                            </Pressable>
                            {index < verticalActions.length - 1 && (
                                <View style={[styles.actionDivider, { backgroundColor: theme.uiBackground }]} />
                            )}
                        </View>
                    ))}
                </View>
                
                {/* Owner Actions Group - shown only to snippet owner */}
                {isOwner && (
                    <View style={styles.ownerSection}>
                        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                            OWNER ACTIONS
                        </Text>
                        <View style={[styles.actionGroup, { backgroundColor: theme.cardBackground }]}>
                            {ownerActions.map((action, index) => (
                                <View key={action.id}>
                                    <Pressable
                                        style={({ pressed }) => [
                                            styles.actionRow,
                                            { backgroundColor: pressed ? theme.uiBackground : 'transparent' }
                                        ]}
                                        onPress={action.onPress}
                                    >
                                        <View style={styles.iconContainer}>
                                            <Ionicons
                                                name={action.icon}
                                                size={22}
                                                color={action.id === 'delete' ? theme.red : theme.textPrimary} //#ef4444
                                            />
                                        </View>
                                        <Text
                                            style={[
                                                styles.actionLabel,
                                                { color: action.id === 'delete' ? theme.red : theme.textPrimary } //#ef44444444
                                            ]}
                                        >
                                            {action.label}
                                        </Text>
                                    </Pressable>
                                    {index < ownerActions.length - 1 && (
                                        <View style={[styles.actionDivider, { backgroundColor: theme.uiBackground }]} />
                                    )}
                                </View>
                            ))}
                        </View>
                    </View>
                )}
            </ScrollView>
        </View>
    );
    
};

export default ThemedOptions;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
    },
    ScrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: 16,
        paddingHorizontal: 20,
        paddingBottom: 32,
    },
    topActionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        marginBottom: 20,
        paddingHorizontal: 8,
    },
    topActionButton: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        minWidth: 90,
        gap: 8,
    },
    topActionIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    topActionLabel: {
        fontFamily: 'inter',
        fontSize: 14,
        fontWeight:'600',
        textAlign: 'center',
    },
    followButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 10,
        marginBottom: 20,
        marginHorizontal: 16,
    },
    unfollowButton: {
        borderWidth: 2,
    },
    followButtonSkeleton: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 10,
        marginBottom: 20,
        marginHorizontal: 16,
    },
    followButtonText: {
        fontSize: 16,
        fontWeight: '700',
        fontFamily: 'inter',
        color: '#FFFFFF',
    },
    actionGroup: {
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 16,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 54,
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    iconContainer: {
        width: 32,
        alignItems: 'flex-start',
        justifyContent: 'center',
        marginRight: 12,
    },
    actionLabel: {
        fontSize: 16,
        fontWeight: '500',
        fontFamily: 'inter',
        flex: 1,
        letterSpacing: 0.1,
    },
    actionDivider: {
        height: 0.5,
        marginLeft: 60,
        opacity: 0.4,
    },
    ownerSection: {
        marginTop: 16,
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '700',
        fontFamily: 'inter',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: 12,
        marginLeft: 4,
        opacity: 0.6,
    },
});