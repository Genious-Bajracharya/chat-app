// Request notification permission
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

// Show notification when message received
export function showMessageNotification(senderName, preview = 'New message') {
  if (Notification.permission === 'granted') {
    const notification = new Notification(`${senderName}`, {
      body: preview,
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">💬</text></svg>',
      badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">💬</text></svg>',
      tag: 'message-notification',
      requireInteraction: false
    });

    // Close notification after 5 seconds
    setTimeout(() => notification.close(), 5000);

    return notification;
  }
}

// Check if notifications are enabled
export function isNotificationEnabled() {
  return 'Notification' in window && Notification.permission === 'granted';
}
