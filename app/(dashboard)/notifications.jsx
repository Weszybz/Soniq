import { StyleSheet, Text, View, useColorScheme, Pressable, Image, TextInput, Button, FlatList, ActivityIndicator } from 'react-native'
import { Colors } from '../../constants/Colors';
import { Audio } from 'expo-av';
import { useState, useEffect, useCallback, useContext } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserContext } from '../../contexts/UserContext';
import { useUnread } from '../../contexts/UnreadContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { listNotifications, markAsRead, markAllAsRead } from '../../lib/notificationService';

// themed components
import ThemedNotificationItem from '../../components/ThemedNotificationItem';
import ThemedView from '../../components/ThemedView';

const Notifications = () => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;
  const router = useRouter();
  const { user } = useContext(UserContext);
  const { setNotifCount, refresh: refreshBadge } = useNotifications();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.$id) return;
    try {
      const docs = await listNotifications(user.$id);
      setNotifications(docs);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.$id]);

  useEffect(() => {
    load();
    if (user?.$id) {
      markAllAsRead(user.$id).then(() => {
        setNotifCount(0);
        refreshBadge();
      });
    }
  }, [load, user?.$id]);

  const handlePress = async (notif) => {
    setNotifications((prev) =>
      prev.map((n) => (n.$id === notif.$id ? { ...n, read: true } : n))
    );
    await markAsRead(notif.$id);

    switch (notif.type) {
      case 'like':
      case 'comment':
      case 'feedback':
      case 'collaboration':
        if (notif.snippetId) {
          router.push(`/snippet?snippetId=${notif.snippetId}`);
        } else {
          router.push('/home');
        }
        break;
      case 'follow':
        router.push({
          pathname: '/profile',
          params: { userId: notif.senderId },
        });
        break;
      case 'message':
        if (notif.conversationId) {
          router.push({
            pathname: '/(messages)/chat',
            params: {
              conversationId: notif.conversationId,
              otherUserId: notif.senderId,
              otherUsername: notif.senderUsername,
              otherImage: notif.senderProfileImage ?? '',
            },
          });
        }
        break;
      default:
        break;
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const renderItem = ({ item }) => (
    <ThemedNotificationItem
      notification={item}
      theme={theme}
      onPress={handlePress}
    />
  );

  const renderSeparator = () => (
    <View style={[styles.separator, { backgroundColor: theme.divider }]} />
  );

  return (
    <ThemedView style={styles.container} safe>
      {/* Header — matches Messages screen style */}
      <View style={[styles.header, { borderBottomColor: theme.divider }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="notifications-off-outline" size={56} color={theme.textSecondary} />
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No notifications</Text>
          <Text style={[styles.emptyBody, { color: theme.textSecondary }]}>
            Likes, comments, follows and more will show up here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={(item) => item.$id}
          ItemSeparatorComponent={renderSeparator}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}
    </ThemedView>
  );
};

export default Notifications;

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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'inter',
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
    marginLeft: 76,
  },
});
