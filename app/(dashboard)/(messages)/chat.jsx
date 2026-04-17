import { StyleSheet, Text, View, useColorScheme, Pressable, Image, TextInput, Button, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native'
import { Colors } from '../../../constants/Colors';
import { Audio } from 'expo-av';
import { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserContext } from '../../../contexts/UserContext';
import { listMessages, sendTextMessage, sendAudioMessage, pickAudioFile } from '../../../lib/messageService';
import { markConversationNotificationsRead } from '../../../lib/notificationService';

// themed components
import ThemedMessageBubble from '../../../components/ThemedMessageBubble';
import ThemedDownloadPermission from '../../../components/ThemedDownloadPermission';

const POLL_INTERVAL = 5000;

const Chat = () => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;
  const router = useRouter();
  const { user } = useContext(UserContext);

  const params = useLocalSearchParams();
  const conversationId = params.conversationId;
  const otherUserId = params.otherUserId;
  const otherUsername = params.otherUsername ?? 'User';
  const otherImage = params.otherImage ?? null;

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);

  const [pendingAudioAsset, setPendingAudioAsset] = useState(null);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);

  const flatListRef = useRef(null);
  const pollingRef = useRef(null);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;
    try {
      const docs = await listMessages(conversationId);
      setMessages(docs);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    fetchMessages();
    pollingRef.current = setInterval(fetchMessages, POLL_INTERVAL);
    return () => clearInterval(pollingRef.current);
  }, [fetchMessages]);

  useFocusEffect(
    useCallback(() => {
      fetchMessages();
      if (conversationId) {
        AsyncStorage.getItem('@soniq:readTimestamps')
          .then((stored) => {
            const timestamps = stored ? JSON.parse(stored) : {};
            timestamps[conversationId] = new Date().toISOString();
            return AsyncStorage.setItem('@soniq:readTimestamps', JSON.stringify(timestamps));
          })
          .catch(() => {});

        if (user?.$id) {
          markConversationNotificationsRead(user.$id, conversationId).catch(() => {});
        }
      }
    }, [fetchMessages, conversationId])
  );

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSendText = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setText('');
    try {
      const msg = await sendTextMessage(conversationId, trimmed);
      setMessages((prev) => [...prev, msg]);
    } catch (err) {
      Alert.alert('Error', 'Could not send message.');
      setText(trimmed);
    } finally {
      setSending(false);
    }
  };

  const handleAttachAudio = async () => {
    try {
      const asset = await pickAudioFile();
      if (!asset) return;
      setPendingAudioAsset(asset);
      setPermissionModalVisible(true);
    } catch (err) {
      Alert.alert('Error', err.message ?? 'Could not pick audio file.');
    }
  };

  const handlePermissionConfirm = async (allowed) => {
    setPermissionModalVisible(false);
    if (!pendingAudioAsset) return;
    const asset = pendingAudioAsset;
    setPendingAudioAsset(null);
    setUploadingAudio(true);
    try {
      const msg = await sendAudioMessage(conversationId, asset, allowed);
      setMessages((prev) => [...prev, msg]);
    } catch (err) {
      Alert.alert('Error', err.message ?? 'Could not send audio message.');
    } finally {
      setUploadingAudio(false);
    }
  };

  const handlePermissionCancel = () => {
    setPermissionModalVisible(false);
    setPendingAudioAsset(null);
  };

  const handlePermissionChange = (messageId, newValue) => {
    setMessages((prev) =>
      prev.map((m) => (m.$id === messageId ? { ...m, downloadPermission: newValue } : m))
    );
  };

  const handleMessageDeleted = (messageId) => {
    setMessages((prev) => prev.filter((m) => m.$id !== messageId));
  };

  const renderMessage = ({ item }) => (
    <ThemedMessageBubble
      message={item}
      isMine={item.senderId === user?.$id}
      recipientUsername={otherUsername}
      conversationId={conversationId}
      onPermissionChange={handlePermissionChange}
      onMessageDeleted={handleMessageDeleted}
    />
  );

  const keyExtractor = (item) => item.$id;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { backgroundColor: theme.navBackground, borderBottomColor: theme.divider }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
        </Pressable>

        <Pressable
          style={styles.headerUser}
          onPress={() => router.push({ pathname: '/profile', params: { userId: otherUserId } })}
        >
          {otherImage ? (
            <Image source={{ uri: otherImage }} style={styles.headerAvatar} />
          ) : (
            <View style={[styles.headerAvatar, styles.headerAvatarFallback, { backgroundColor: theme.uiBackground }]}>
              <Ionicons name="person" size={18} color={theme.textSecondary} />
            </View>
          )}
          <Text style={[styles.headerName, { color: theme.textPrimary }]} numberOfLines={1}>
            {otherUsername}
          </Text>
        </Pressable>

        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="chatbubbles-outline" size={48} color={theme.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            No messages yet.{'\n'}Say hello!
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />
      )}

      <View style={[styles.inputBar, { backgroundColor: theme.navBackground, borderTopColor: theme.divider, borderBottomColor: theme.navBackground }]}>
        <Pressable
          style={({ pressed }) => [
            styles.attachBtn,
            { backgroundColor: theme.uiBackground, opacity: pressed ? 0.7 : 1 },
          ]}
          onPress={handleAttachAudio}
          disabled={uploadingAudio || sending}
        >
          {uploadingAudio ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Ionicons name="musical-note-outline" size={20} color={Colors.primary} />
          )}
        </Pressable>

        <TextInput style={[ styles.input, { backgroundColor: theme.uiBackground, color: theme.textPrimary, borderColor: theme.divider }]}
          placeholder="Message..."
          placeholderTextColor={theme.textSecondary}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={1000}
          returnKeyType="default"
        />

        <Pressable
          style={({ pressed }) => [
            styles.sendBtn,
            {
              backgroundColor: text.trim() ? Colors.primary : theme.uiBackground,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
          onPress={handleSendText}
          disabled={!text.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={18} color={text.trim() ? '#fff' : theme.textSecondary} />
          )}
        </Pressable>
      </View>

      <ThemedDownloadPermission
        visible={permissionModalVisible}
        recipientUsername={otherUsername}
        fileName={pendingAudioAsset?.name}
        onConfirm={handlePermissionConfirm}
        onCancel={handlePermissionCancel}
      />
    </KeyboardAvoidingView>
  );
};

export default Chat;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerUser: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    justifyContent: 'center',
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  headerAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerName: {
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'inter',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: 'inter',
    textAlign: 'center',
    lineHeight: 22,
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: 12,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 12,
  },
  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: 'inter',
    maxHeight: 120,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
