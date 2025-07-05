// Instagram Auto Reply Popup Script
console.log('🎨 Popup script loaded');

const defaultMessage = 'Hey! How are you?';

// DOM elements
const autoReplyMessageElement = document.getElementById('autoReplyMessage');
const saveButton = document.getElementById('saveButton');
const successMessage = document.getElementById('successMessage');
const charCount = document.getElementById('charCount');

// Update character count
function updateCharCount() {
  const currentLength = autoReplyMessageElement.value.length;
  charCount.textContent = `${currentLength}/500`;
  
  if (currentLength > 450) {
    charCount.style.color = '#ef4444';
  } else if (currentLength > 400) {
    charCount.style.color = '#f59e0b';
  } else {
    charCount.style.color = '#9ca3af';
  }
}

// Load saved settings
function loadSettings() {
  chrome.storage.local.get(['autoReplyMessage'], (result) => {
    const savedMessage = result.autoReplyMessage || defaultMessage;
    autoReplyMessageElement.value = savedMessage;
    updateCharCount();
    console.log('📖 Loaded settings:', savedMessage);
  });
}

// Save settings
function saveSettings() {
  const message = autoReplyMessageElement.value.trim();
  
  if (!message) {
    showError('Please enter a message');
    return;
  }
  
  if (message.length > 500) {
    showError('Message is too long (max 500 characters)');
    return;
  }
  
  // Disable save button and show loading state
  saveButton.disabled = true;
  saveButton.textContent = 'Saving...';
  saveButton.style.opacity = '0.7';
  
  chrome.storage.local.set({ autoReplyMessage: message }, () => {
    console.log('💾 Settings saved:', message);
    
    // Show success message
    successMessage.classList.remove('hidden');
    saveButton.classList.add('bg-green-500');
    saveButton.classList.remove('bg-gradient-to-r', 'from-purple-500', 'to-pink-500');
    saveButton.textContent = 'Saved!';
    
    // Reset button after 2 seconds
    setTimeout(() => {
      successMessage.classList.add('hidden');
      saveButton.classList.remove('bg-green-500');
      saveButton.classList.add('bg-gradient-to-r', 'from-purple-500', 'to-pink-500');
      saveButton.textContent = 'Save Settings';
      saveButton.disabled = false;
      saveButton.style.opacity = '1';
    }, 2000);
  });
}

// Show error message
function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'mt-3 p-2 bg-red-100 border border-red-300 text-red-700 text-sm rounded-lg';
  errorDiv.textContent = `❌ ${message}`;
  
  // Remove any existing error messages
  const existingError = document.querySelector('.bg-red-100');
  if (existingError) {
    existingError.remove();
  }
  
  saveButton.parentNode.insertBefore(errorDiv, saveButton.nextSibling);
  
  // Remove error after 3 seconds
  setTimeout(() => {
    errorDiv.remove();
  }, 3000);
}

// Check if we're on Instagram
function checkInstagramTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    const isInstagram = currentTab.url && currentTab.url.includes('instagram.com');
    const isDMPage = currentTab.url && (
      currentTab.url.includes('/direct/inbox') || 
      currentTab.url.includes('/direct/t/')
    );
    
    const statusElement = document.querySelector('.bg-green-50');
    const statusDot = document.querySelector('.bg-green-500');
    const statusText = statusElement.querySelector('span');
    const statusDesc = statusElement.querySelector('p');
    
    if (isInstagram && isDMPage) {
      // Active and on correct page
      statusElement.className = 'mb-4 p-3 bg-green-50 border border-green-200 rounded-lg';
      statusDot.className = 'w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse';
      statusText.textContent = 'Extension Active';
      statusText.className = 'text-sm text-green-700 font-medium';
      statusDesc.textContent = 'Monitoring Instagram DMs for "Hello" messages';
      statusDesc.className = 'text-xs text-green-600 mt-1';
    } else if (isInstagram) {
      // On Instagram but wrong page
      statusElement.className = 'mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg';
      statusDot.className = 'w-2 h-2 bg-yellow-500 rounded-full mr-2';
      statusText.textContent = 'Navigate to DMs';
      statusText.className = 'text-sm text-yellow-700 font-medium';
      statusDesc.textContent = 'Go to instagram.com/direct/inbox/ to activate';
      statusDesc.className = 'text-xs text-yellow-600 mt-1';
    } else {
      // Not on Instagram
      statusElement.className = 'mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg';
      statusDot.className = 'w-2 h-2 bg-gray-400 rounded-full mr-2';
      statusText.textContent = 'Extension Inactive';
      statusText.className = 'text-sm text-gray-700 font-medium';
      statusDesc.textContent = 'Visit Instagram Direct Messages to activate';
      statusDesc.className = 'text-xs text-gray-600 mt-1';
    }
  });
}

// Add event listeners
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Popup DOM loaded');
  
  // Load settings
  loadSettings();
  
  // Check Instagram tab status
  checkInstagramTab();
  
  // Add event listeners
  autoReplyMessageElement.addEventListener('input', updateCharCount);
  autoReplyMessageElement.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      saveSettings();
    }
  });
  
  saveButton.addEventListener('click', saveSettings);
  
  console.log('✅ Popup initialized successfully');
});

// Handle errors
window.addEventListener('error', (e) => {
  console.error('❌ Popup error:', e.error);
});

// Add some helpful keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + S to save
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    saveSettings();
  }
  
  // Escape to close popup (if supported)
  if (e.key === 'Escape') {
    window.close();
  }
});