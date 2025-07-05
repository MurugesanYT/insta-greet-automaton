// Instagram Auto Reply Background Script (Service Worker)
console.log('🔧 Background script loaded');

// Initialize extension when installed
chrome.runtime.onInstalled.addListener((details) => {
  console.log('🎉 Extension installed:', details.reason);
  
  if (details.reason === 'install') {
    // Set default auto-reply message and enable state
    chrome.storage.local.set({
      autoReplyMessage: 'Hey! How are you?',
      autoReplyEnabled: true
    }, () => {
      console.log('✅ Default settings initialized');
    });
    
    // Show welcome notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon-48.png',
      title: 'Instagram Auto Reply',
      message: 'Extension installed! Click the extension icon to configure your auto-reply message and toggle.'
    });
  }
});

// Handle messages from content script (if needed)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Message received:', request);
  
  switch (request.action) {
    case 'logAutoReply':
      console.log('🤖 Auto-reply sent:', request.data);
      // Could store analytics or logs here
      sendResponse({ success: true });
      break;
      
    case 'getSettings':
      chrome.storage.local.get(['autoReplyMessage'], (result) => {
        sendResponse({ 
          autoReplyMessage: result.autoReplyMessage || 'Hey! How are you?' 
        });
      });
      return true; // Keep the message channel open for async response
      
    case 'error':
      console.error('❌ Content script error:', request.error);
      sendResponse({ success: true });
      break;
      
    default:
      console.log('❓ Unknown message action:', request.action);
      sendResponse({ error: 'Unknown action' });
  }
});

// Monitor tab changes to update extension badge/icon
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const isInstagramDM = tab.url.includes('instagram.com/direct/');
    
    // Update badge text
    if (isInstagramDM) {
      chrome.action.setBadgeText({
        tabId: tabId,
        text: 'ON'
      });
      chrome.action.setBadgeBackgroundColor({
        tabId: tabId,
        color: '#10b981'
      });
    } else {
      chrome.action.setBadgeText({
        tabId: tabId,
        text: ''
      });
    }
  }
});

// Handle storage changes for debugging
chrome.storage.onChanged.addListener((changes, namespace) => {
  console.log('💾 Storage changed in', namespace, ':', changes);
});

// Periodic cleanup (optional)
setInterval(() => {
  console.log('🧹 Background script heartbeat');
}, 300000); // Every 5 minutes

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('🚀 Extension started up');
});

// Handle errors
self.addEventListener('error', (e) => {
  console.error('❌ Background script error:', e.error);
});

// Keep service worker alive (Manifest V3 workaround)
chrome.runtime.onConnect.addListener((port) => {
  console.log('🔌 Port connected:', port.name);
});

console.log('✅ Background script initialized');
