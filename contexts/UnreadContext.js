import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserContext } from './UserContext';
import { listConversations } from '../lib/messageService';

const POLL_INTERVAL = 10000;

const UnreadContext = createContext({ unreadCount: 0, setUnreadCount: () => {}, refresh: () => {} });

export const UnreadProvider = ({ children }) => {
  const { user } = useContext(UserContext);
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!user?.$id) return;
    try {
      const [conversations, stored] = await Promise.all([
        listConversations(user.$id),
        AsyncStorage.getItem('@soniq:readTimestamps'),
      ]);
      const readTimestamps = stored ? JSON.parse(stored) : {};
      const count = conversations.filter((conv) => {
        if (!conv.lastSenderId || conv.lastSenderId === user.$id) return false;
        const lastRead = readTimestamps[conv.$id];
        if (!lastRead) return true;
        return conv.lastMessageAt > lastRead;
      }).length;
      setUnreadCount(count);
    } catch (_) {}
  }, [user?.$id]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <UnreadContext.Provider value={{ unreadCount, setUnreadCount, refresh }}>
      {children}
    </UnreadContext.Provider>
  );
};

export const useUnread = () => useContext(UnreadContext);
