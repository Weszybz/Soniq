import { StyleSheet, View, Text, Pressable, ScrollView, SectionListComponent, ActivityIndicator, FlatList } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect, useCallback } from "react";
import { Colors } from "../constants/Colors";
import { getFollowingList, getFollowersList, getUsersData } from '../lib/followService';
import { getOrCreateConversation, sendSnippetMessage } from '../lib/messageService';


const ThemedShareFollowingSheet = ({ snippet, currentUser, theme, onClose }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sentTo, setSentTo] = useState({});
  const [sendingTo, setSendingTo] = useState({});

  useEffect(() => {
    const fetchContacts = async () => {
      if (!currentUser?.$id) {
        setLoading(false);
        return;
      }
      try {
        const [followingResult, followersResult] = await Promise.all([
          getFollowingList(currentUser.$id, 50, 0),
          getFollowersList(currentUser.$id, 50, 0),
        ]);

        const followingData = followingResult.followingIds.length > 0
          ? await getUsersData(followingResult.followingIds)
          : [];


        const followersData = followersResult.followers || [];


        const seen = new Set();
        const merged = [...followingData, ...followersData].filter(u => {
          if (!u.userId || u.userId === currentUser.$id || seen.has(u.userId)) return false;
          seen.add(u.userId);
          return true;
        });

        setUsers(merged);
      } catch (err) {
        console.error('Failed to fetch contacts:', err);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, [currentUser?.$id]);

  const handleSend = useCallback(async (targetUser) => {
    if (sendingTo[targetUser.userId] || sentTo[targetUser.userId]) return;

    setSendingTo(prev => ({ ...prev, [targetUser.userId]: true }));

    try {
      const myUsername = currentUser.prefs?.username || currentUser.name || 'User';
      const myImage = currentUser.prefs?.profileImage || '';

      const conversation = await getOrCreateConversation(
        currentUser.$id,
        targetUser.userId,
        myUsername,
        myImage,
        targetUser.username,
        targetUser.profileImage || ''
      );

      await sendSnippetMessage(conversation.$id, snippet);

      setSentTo(prev => ({ ...prev, [targetUser.userId]: true }));
    } catch (err) {
      console.error('Failed to send snippet:', err);
      alert('Failed to send. Please try again.');
    } finally {
      setSendingTo(prev => ({ ...prev, [targetUser.userId]: false }));
    }
  }, [currentUser, snippet, sendingTo, sentTo]);

  const renderUser = ({ item }) => {
    const isSending = sendingTo[item.userId];
    const isSent = sentTo[item.userId];

    return (
      <View style={styles.userRow}>
        {item.profileImage ? (
          <Image source={{ uri: item.profileImage }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: theme.uiBackground }]}>
            <Ionicons name="person" size={20} color={theme.textSecondary} />
          </View>
        )}
        <Text style={[styles.username, { color: theme.textPrimary }]} numberOfLines={1}>
          {item.username}
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.sendButton,
            isSent
              ? [styles.sendButtonSent, { backgroundColor: theme.uiBackground, borderColor: theme.divider }]
              : { backgroundColor: '#06B6D4', opacity: pressed ? 0.7 : 1 },
          ]}
          onPress={() => handleSend(item)}
          disabled={isSending || isSent}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : isSent ? (
            <Ionicons name="checkmark" size={16} color={theme.textSecondary} />
          ) : (
            <Text style={styles.sendButtonText}>Send</Text>
          )}
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Share Snippet</Text>
        <Pressable onPress={onClose} hitSlop={8}>
          <Ionicons name="close" size={22} color={theme.textSecondary} />
        </Pressable>
      </View>

      <View style={[styles.snippetPreview, { backgroundColor: theme.uiBackground }]}>
        <View style={styles.snippetDot} />
        <View style={styles.snippetInfo}>
          <Text style={[styles.snippetTitle, { color: theme.textPrimary }]} numberOfLines={1}>
            {snippet?.title || 'Untitled'}
          </Text>
          <Text style={[styles.snippetMeta, { color: theme.textSecondary }]} numberOfLines={1}>
            {snippet?.username} · {snippet?.genre}
          </Text>
        </View>
        <Ionicons name="musical-notes-outline" size={20} color="#06B6D4" />
      </View>

      <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>SEND TO</Text>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#06B6D4" />
        </View>
      ) : users.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="people-outline" size={40} color={theme.textSecondary} style={{ marginBottom: 12 }} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Follow someone to share snippets
          </Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => item.userId}
          renderItem={renderUser}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => (
            <View style={[styles.separator, { backgroundColor: theme.uiBackground }]} />
          )}
        />
      )}
    </View>
  );
};

export default ThemedShareFollowingSheet;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'inter',
  },
  snippetPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  snippetDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#06B6D4',
  },
  snippetInfo: {
    flex: 1,
  },
  snippetTitle: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'inter',
  },
  snippetMeta: {
    fontSize: 13,
    fontFamily: 'inter',
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'inter',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 12,
    opacity: 0.6,
  },
  listContent: {
    paddingBottom: 24,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  username: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    fontFamily: 'inter',
  },
  sendButton: {
    minWidth: 64,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  sendButtonSent: {
    borderWidth: 1,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'inter',
  },
  separator: {
    height: 0.5,
    marginLeft: 56,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 32,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: 'inter',
    textAlign: 'center',
  },
});
