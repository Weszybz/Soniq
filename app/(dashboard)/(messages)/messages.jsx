import { StyleSheet, Text, View, useColorScheme, Pressable, Image, TextInput, Button, FlatList, ActivityIndicator } from 'react-native'
import { Colors } from '../../../constants/Colors';
import { Audio } from 'expo-av';
import { useState, useEffect, useCallback, useContext } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserContext } from '../../../contexts/UserContext';
import { useUnread } from '../../../contexts/UnreadContext';
import { listConversations } from '../../../lib/messageService';
import { markConversationNotificationsRead } from '../../../lib/notificationService';

// themed components
import ThemedView from '../../../components/ThemedView';
import ThemedText from '../../../components/ThemedText';
import Spacer from '../../../components/Spacer';
import ThemedButton from '../../../components/ThemedButton';
import ThemedTextInput from '../../../components/ThemedTextInput';
import ThemedConversationCard from '../../../components/ThemedConversationCard';

const POLL_INTERVAL = 10000;

const Messages = () => {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme] ?? Colors.light
  const router = useRouter();
  const { user } = useContext(UserContext);
  const { setUnreadCount } = useUnread();

  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [readTimestamps, setReadTimestamps] = useState({});

  const loadReadTimestamps = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('@soniq:readTimestamps');
      setReadTimestamps(stored ? JSON.parse(stored) : {});
    } catch (_) {}
  }, []);

   const fetchConversations = useCallback(async () => {
    if (!user?.$id) return;
    try {
      const docs = await listConversations(user.$id);
      setConversations(docs);
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.$id]);

  useEffect(() => {
    fetchConversations();
    loadReadTimestamps();
  }, [fetchConversations, loadReadTimestamps]);

  useEffect(() => {
    const interval = setInterval(fetchConversations, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
      loadReadTimestamps();
    }, [fetchConversations, loadReadTimestamps])
  );

  const isConvoUnread = useCallback(
    (convo) => {
      if (!convo.lastSenderId || convo.lastSenderId === user?.$id) return false;
      const lastRead = readTimestamps[convo.$id];
      if (!lastRead) return true;
      return convo.lastMessageAt > lastRead;
    },
    [readTimestamps, user?.$id]
  );

  useEffect(() => {
    setUnreadCount(conversations.filter(isConvoUnread).length);
  }, [conversations, isConvoUnread, setUnreadCount]);

  const handleConversationPress = ({ conversation, otherUserId, otherUsername, otherImage }) => {
    router.push({
      pathname: '/(dashboard)/chat',
      params: {
        conversationId: conversation.$id,
        otherUserId,
        otherUsername,
        otherImage: otherImage || '',
      },
    });
  };

  const renderItem = ({ item }) => (
    <ThemedConversationCard
      conversation={item}
      currentUserId={user?.$id}
      isUnread={isConvoUnread(item)}
      onPress={handleConversationPress}
    />
  );

  const renderSeparator = () => (
    <View style={[styles.separator, { backgroundColor: theme.divider }]} />
  );

  const keyExtractor = (item) => item.$id;

  return (
    <ThemedView style={styles.container} safe>
      <View style={[styles.header, { borderBottomColor: theme.divider }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Messages</Text>
          {(() => {
            const unreadCount = conversations.filter(isConvoUnread).length;
            if (unreadCount === 0) return null;
            return (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            );
          })()}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="chatbubbles-outline" size={56} color={theme.textSecondary} />
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No conversations</Text>
          <Text style={[styles.emptyBody, { color: theme.textSecondary }]}>
            Visit someone's profile to start a conversation.
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ItemSeparatorComponent={renderSeparator}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          onRefresh={() => {
            setRefreshing(true);
            fetchConversations();
          }}
          refreshing={refreshing}
        />
      )}
    </ThemedView>
  );
};

export default Messages

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 12,
    paddingBottom: 14,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'inter',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  unreadBadge: {
    backgroundColor: '#60a5fa',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'inter',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'inter',
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 15,
    fontFamily: 'inter',
    textAlign: 'center',
    lineHeight: 22,
  },
  listContent: {
    paddingBottom: 120,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 80,
  },
})