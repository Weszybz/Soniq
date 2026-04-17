import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserContext } from './UserContext';
import { countUnread } from '../lib/notificationService';

const POLL_INTERVAL = 10000;

const NotificationContext = createContext({ notifCount: 0, refresh: () => {} });

export const NotificationProvider = ({ children }) => {
  const { user } = useContext(UserContext);
  const [notifCount, setNotifCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!user?.$id) return;
    try {
      const count = await countUnread(user.$id);
      setNotifCount(count);
    } catch (_) {}
  }, [user?.$id]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <NotificationContext.Provider value={{ notifCount, setNotifCount, refresh }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
