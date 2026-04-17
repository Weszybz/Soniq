import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

function timeAgo(isoString) {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(isoString).toLocaleDateString();
}

const TYPE_ICONS = {
  like: { name: 'heart', color: '#ef4444' },
  comment: { name: 'chatbubble', color: '#60a5fa' },
  feedback: { name: 'star', color: '#f59e0b' },
  follow: { name: 'person-add', color: '#34d399' },
  message: { name: 'mail', color: '#818cf8' },
  collaboration: { name: 'musical-notes', color: '#a78bfa' },
};

const ThemedNotificationItem = ({ notification, theme, onPress }) => {
  const icon = TYPE_ICONS[notification.type] ?? { name: 'notifications', color: Colors.primary };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: notification.read ? theme.background : theme.uiBackground, opacity: pressed ? 0.75 : 1 },
      ]}
      onPress={() => onPress(notification)}
    >
      {/* Avatar + type badge */}
      <View style={styles.avatarWrap}>
        {notification.senderProfileImage ? (
          <Image source={{ uri: notification.senderProfileImage }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: theme.uiBackground }]}>
            <Ionicons name="person" size={18} color={theme.textSecondary} />
          </View>
        )}
        <View style={[styles.typeBadge, { backgroundColor: icon.color }]}>
          <Ionicons name={icon.name} size={10} color="#fff" />
        </View>
      </View>

      {/* Text */}
      <View style={styles.body}>
        <Text style={[styles.text, { color: theme.textPrimary }]} numberOfLines={2}>
          <Text style={styles.bold}>{notification.senderUsername} </Text>
          {notification.content}
        </Text>
        <Text style={[styles.time, { color: theme.textSecondary }]}>
          {timeAgo(notification.createdAt)}
        </Text>
      </View>

      {/* Unread dot */}
      {!notification.read && (
        <View style={styles.unreadDot} />
      )}
    </Pressable>
  );
};

export default ThemedNotificationItem;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  avatarWrap: {
    position: 'relative',
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
  typeBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  body: {
    flex: 1,
    gap: 3,
  },
  text: {
    fontSize: 14,
    fontFamily: 'inter',
    lineHeight: 20,
  },
  bold: {
    fontWeight: '700',
  },
  time: {
    fontSize: 12,
    fontFamily: 'inter',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
});
