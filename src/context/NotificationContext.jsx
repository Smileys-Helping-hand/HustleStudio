import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-hot-toast';

const NotificationContext = createContext({
  notifications: [],
  pushNotification: () => {},
  markAsRead: () => {},
  clearNotifications: () => {},
});

const createNotification = (payload) => ({
  id: payload.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  title: payload.title ?? 'Notification',
  description: payload.description ?? '',
  type: payload.type ?? 'info',
  createdAt: payload.createdAt ?? new Date().toISOString(),
  read: Boolean(payload.read),
  actions: payload.actions ?? [],
});

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const seenIdsRef = useRef(new Set());

  const pushNotification = useCallback((payload) => {
    const notification = createNotification(payload);
    if (seenIdsRef.current.has(notification.id)) {
      return notification.id;
    }
    seenIdsRef.current.add(notification.id);
    setNotifications((current) => [notification, ...current].slice(0, 50));

    const toastMessage = notification.description || notification.title;
    toast(toastMessage, {
      icon: notification.type === 'warning' ? '⚠️' : notification.type === 'success' ? '✅' : 'ℹ️',
      duration: 5000,
    });
    return notification.id;
  }, []);

  const markAsRead = useCallback((id) => {
    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    seenIdsRef.current = new Set();
  }, []);

  const value = useMemo(
    () => ({ notifications, pushNotification, markAsRead, clearNotifications }),
    [notifications, pushNotification, markAsRead, clearNotifications]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

NotificationProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const useNotifications = () => useContext(NotificationContext);

export const useNotify = () => {
  const { pushNotification } = useNotifications();
  return pushNotification;
};
