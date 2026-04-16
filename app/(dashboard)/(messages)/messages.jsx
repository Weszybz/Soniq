import { StyleSheet, Text, View, useColorScheme, Pressable, Image, TextInput, Button, FlatList, ActivityIndicator } from 'react-native'
import { Colors } from '../../../constants/Colors';
import { Audio } from 'expo-av';
import { useState, useEffect, useCallback, useContext } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { UserContext } from '../../../contexts/UserContext';
import { listConversations } from '../../../lib/messageService';

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

  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
  }, [fetchConversations]);

  useEffect(() => {
    const interval = setInterval(fetchConversations, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
    }, [fetchConversations])
  );

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
        <Text style={[styles.title, { color: theme.textPrimary }]}>Messages</Text>
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