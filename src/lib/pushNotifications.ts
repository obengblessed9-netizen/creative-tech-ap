import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

export const initPushNotifications = async () => {
  if (!Capacitor.isNativePlatform()) {
    console.log('Push notifications only work on native platforms');
    return;
  }

  // Request permission
  const permResult = await PushNotifications.requestPermissions();
  if (permResult.receive !== 'granted') {
    console.warn('Push notification permission not granted');
    return;
  }

  // Register with Apple / Google
  await PushNotifications.register();

  // Listen for registration success
  PushNotifications.addListener('registration', (token) => {
    console.log('Push registration token:', token.value);
    // TODO: Send token to your backend to store for sending notifications
  });

  // Listen for registration errors
  PushNotifications.addListener('registrationError', (error) => {
    console.error('Push registration error:', error);
  });

  // Listen for incoming notifications while app is open
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push notification received:', notification);
  });

  // Listen for notification tap/action
  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    console.log('Push notification action:', action);
  });
};
