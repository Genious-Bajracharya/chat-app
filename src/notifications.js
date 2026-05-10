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
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%234f46e5;stop-opacity:1" /><stop offset="100%" style="stop-color:%236366f1;stop-opacity:1" /></linearGradient></defs><circle cx="50" cy="50" r="45" fill="url(%23grad)"/><polygon points="65,95 75,85 65,85" fill="%234f46e5"/><text x="50" y="60" font-size="40" font-weight="bold" fill="white" text-anchor="middle" font-family="Arial">D&S</text></svg>',
      badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%234f46e5;stop-opacity:1" /><stop offset="100%" style="stop-color:%236366f1;stop-opacity:1" /></linearGradient></defs><circle cx="50" cy="50" r="45" fill="url(%23grad)"/><polygon points="65,95 75,85 65,85" fill="%234f46e5"/><text x="50" y="60" font-size="40" font-weight="bold" fill="white" text-anchor="middle" font-family="Arial">D&S</text></svg>',
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
