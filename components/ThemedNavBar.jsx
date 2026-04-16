import { StyleSheet, View, Pressable, useColorScheme, Text } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Colors } from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useUnread } from '../contexts/UnreadContext';


const ThemedNavBar = ({ style, ...props }) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;

  const router = useRouter();
  const pathname = usePathname();
  const { unreadCount } = useUnread();

  if (pathname.includes('chat')) return null;

  const items = [
    { label: 'Home', icon: 'home-outline', iconFill: 'home', route: '/home' },
    { label: 'Discover', icon: 'search-outline', iconFill: 'search', route: '/discover' },
    { label: 'Upload', icon: 'add-outline', iconFill: 'add', route: '/upload' },
    { label: 'Messages', icon: 'chatbubble-outline', iconFill: 'chatbubble', route: '/messages' },
  ];

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.navBackground, borderWidth: 2 ,borderBlockColor: theme.divider },
        style,
      ]}
      {...props}
    >
      {items.map((item) => {
        const active = pathname === item.route;
        const showDot = item.route === '/messages' && unreadCount > 0 && !active;
        return (
          <Pressable
            key={item.route}
            onPress={() => router.push(item.route)}
            style={styles.item}
          >
            <View style={styles.iconWrap}>
              <Ionicons
                name={active ? item.iconFill : item.icon}
                size={24}
                color={active ? theme.iconColorFocused : theme.iconColor}
                style={{}}
              />
              {showDot && <View style={styles.dot} />}
            </View>
            <Text
              style={[
                styles.label,
                { color: active ? theme.iconColorFocused : theme.iconColor },
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

export default ThemedNavBar;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 32,
    gap: 24,
    alignSelf: 'center',
    bottom: 32,
    borderRadius: 38,
    // justifyContent: 'space-between',
  },
  item: {
    // flex: 1,
    alignItems: 'center',
    gap: 0,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  iconWrap: {
    position: 'relative',
  },
  dot: {
    position: 'absolute',
    top: -1,
    right: -3,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#60a5fa',
  },
});