import { StyleSheet, View, Text, Pressable, Image, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

const ThemedConversationCard = ({ conversation, currentUserId, onPress }) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;

  const myIndex = conversation.participantIds.indexOf(currentUserId);
  const otherIndex = myIndex === 0 ? 1 : 0;
  const otherUsername = conversation.participantUsernames?.[otherIndex] ?? 'User';
  const otherImage = conversation.participantImages?.[otherIndex] ?? null;
  const otherUserId = conversation.participantIds?.[otherIndex] ?? null;

  const lastMsg = conversation.lastMessage || '';
  const isAudioPreview = lastMsg === 'Audio message';
  const isDeletedPreview = lastMsg === 'Message deleted';

  const timeStr = (() => {
    try {
      const d = new Date(conversation.lastMessageAt);
      const now = new Date();
      const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  })();

  const hasUnread =
    conversation.unreadCount > 0 && conversation.lastSenderId !== currentUserId;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: pressed ? theme.uiBackground : 'transparent',
        },
      ]}
      onPress={() => onPress?.({ conversation, otherUserId, otherUsername, otherImage })}
    >
      <View style={styles.avatarWrap}>
        {otherImage ? (
          <Image source={{ uri: otherImage }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: theme.uiBackground }]}>
            <Ionicons name="person" size={22} color={theme.textSecondary} />
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={[styles.username, { color: theme.textPrimary }]} numberOfLines={1}>
            {otherUsername}
          </Text>
          <Text style={[styles.time, { color: hasUnread ? Colors.primary : theme.textSecondary }]}>
            {timeStr}
          </Text>
        </View>

        <View style={styles.bottomRow}>
          <Text
            style={[
              styles.preview,
              {
                color: hasUnread ? theme.textPrimary : theme.textSecondary,
                fontWeight: hasUnread ? '600' : '400',
                flex: 1,
              },
            ]}
            numberOfLines={1}
          >
            {isAudioPreview ? (
              <Text style={{ color: Colors.primary }}>Audio message</Text>
            ) : isDeletedPreview ? (
              <Text style={{ color: theme.textSecondary, fontStyle: 'italic' }}>Message deleted</Text>
            ) : (
              lastMsg || 'No messages yet'
            )}
          </Text>

          {hasUnread && (
            <View style={[styles.badge, { backgroundColor: Colors.primary }]}>
              <Text style={styles.badgeText}>
                {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
};

export default ThemedConversationCard;

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'inter',
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 12,
    fontFamily: 'inter',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  preview: {
    fontSize: 14,
    fontFamily: 'inter',
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'inter',
  },
});
