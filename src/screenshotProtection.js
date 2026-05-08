// Screenshot prevention and protection measures

export function enableScreenshotProtection(element) {
  if (!element) return;

  // Disable right-click
  element.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  });

  // Disable text selection
  element.style.userSelect = 'none';
  element.style.WebkitUserSelect = 'none';
  element.style.msUserSelect = 'none';

  // Disable copy/paste
  element.addEventListener('copy', (e) => {
    e.preventDefault();
    return false;
  });

  element.addEventListener('cut', (e) => {
    e.preventDefault();
    return false;
  });

  // Prevent drag
  element.addEventListener('dragstart', (e) => {
    e.preventDefault();
    return false;
  });
}

// Detect screenshot attempts (when window loses focus)
export function detectScreenshot(callback) {
  let screenshotAttempted = false;

  window.addEventListener('blur', () => {
    screenshotAttempted = true;
    if (callback) {
      callback(true); // Screenshot likely happening
    }
  });

  window.addEventListener('focus', () => {
    if (screenshotAttempted) {
      screenshotAttempted = false;
    }
  });
}

// Show warning banner when screenshot detected
export function showScreenshotWarning() {
  const warning = document.createElement('div');
  warning.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500/90 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-pulse';
  warning.textContent = '⚠️ Screenshot detected - Messages are private';
  document.body.appendChild(warning);

  setTimeout(() => {
    warning.remove();
  }, 3000);
}
