import { useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { registerPushToken } from '../services/api/endpoints/notification';
import { useAuthStore } from '../store/auth-store';
import { Colors } from '../../constants/colors';

// Set notification presentation options for when the app is running in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Hook to request notification permissions, register push tokens on the backend,
 * and listen to incoming notification events.
 */
export function usePushNotifications() {
  const { isAuthenticated } = useAuthStore();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    registerForPushNotificationsAsync()
      .then(async (token) => {
        if (token) {
          setExpoPushToken(token);
          
          const deviceType = Platform.OS;
          const deviceName = Device.deviceName || Platform.OS;
          
          try {
            await registerPushToken({ token, deviceType, deviceName });
            console.log('[Push] Token successfully registered on backend:', token);
          } catch (err) {
            console.error('[Push] Failed to register token on backend:', err);
          }
        }
      })
      .catch((err) => console.error('[Push] Error setting up push notifications:', err));

    // Listen to incoming foreground notifications
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('[Push] Foreground notification received:', notification);
    });

    // Listen to tap interactions on notifications
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('[Push] Notification clicked/tapped:', response);
      // Custom routing or behavior can be added here
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [isAuthenticated]);

  return { expoPushToken };
}

async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  if (Platform.OS === 'web') {
    return null;
  }

  // Check if running on physical device (Push tokens are not supported on standard emulators)
  if (!Device.isDevice) {
    console.warn('[Push] Must use a physical device for Push Notifications');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[Push] Permission for push notifications not granted!');
    return null;
  }

  try {
    // EAS Project ID is required by Expo push notification client in modern SDKs
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch (error) {
    console.error('[Push] Error getting Expo Push Token:', error);
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: Colors.actionPrimary,
    });
  }

  return token;
}
