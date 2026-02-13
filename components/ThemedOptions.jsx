import { StyleSheet, View, Text, Pressable, ScrollView, SectionListComponent } from "react-native";
import { Ionicons } from '@expo/vector-icons';

const ThemedOptions = ({ snippet, theme, user, onClose }) => {
    const isOwner = snippet?.ownerId === user?.$id;

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
            id: 'playlist',
            label: 'Playlist',
            icon: 'list-outline',
            onPress: () => {
                console.log('Add to playlist', snippet.$id);
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
                    <Pressable
                        style={({ pressed }) => [
                            styles.followButton,
                            {
                                backgroundColor: theme.button,
                                opacity: pressed ? 0.8 : 1
                            }
                        ]}
                        onPress={() => {
                            console.log('Follow user:', snippet?.username);
                            onClose?.();
                        }}
                        >
                            <Ionicons name="person-add-outline" size={20} color="#FFFFFF" />
                            <Text style={styles.followButtonText}>Follow</Text>
                        </Pressable>
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