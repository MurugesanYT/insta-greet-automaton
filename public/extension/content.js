// Instagram Auto Reply Content Script
console.log('🤖 Instagram Auto Reply extension loaded');

let lastProcessedMessage = null;
let autoReplyMessage = 'Hey! How are you?';
let isProcessing = false;
let autoReplyEnabled = true;
let retryCount = 0;
const MAX_RETRIES = 3;

// Enhanced debugging
function debugLog(message, data = null) {
  const timestamp = new Date().toLocaleTimeString();
  if (data) {
    console.log(`[${timestamp}] 🤖 ${message}`, data);
  } else {
    console.log(`[${timestamp}] 🤖 ${message}`);
  }
}

debugLog('Content script initialized');

// Load settings from storage
function loadSettings() {
  chrome.storage.local.get(['autoReplyMessage', 'autoReplyEnabled'], (result) => {
    if (result.autoReplyMessage) {
      autoReplyMessage = result.autoReplyMessage;
    }
    if (result.autoReplyEnabled !== undefined) {
      autoReplyEnabled = result.autoReplyEnabled;
    }
    debugLog('Settings loaded', { message: autoReplyMessage, enabled: autoReplyEnabled });
  });
}

// Initial load
loadSettings();

// Listen for storage changes and messages from popup
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    if (changes.autoReplyMessage) {
      autoReplyMessage = changes.autoReplyMessage.newValue;
      debugLog('Auto-reply message updated', autoReplyMessage);
    }
    if (changes.autoReplyEnabled) {
      autoReplyEnabled = changes.autoReplyEnabled.newValue;
      debugLog('Auto-reply enabled changed', autoReplyEnabled);
    }
  }
});

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  debugLog('Message received', request);
  
  switch (request.action) {
    case 'toggleAutoReply':
      autoReplyEnabled = request.enabled;
      debugLog('Auto-reply toggled', autoReplyEnabled);
      sendResponse({ success: true });
      break;
    case 'getStatus':
      sendResponse({ 
        enabled: autoReplyEnabled,
        processing: isProcessing,
        lastMessage: lastProcessedMessage?.textContent || null
      });
      break;
    default:
      sendResponse({ error: 'Unknown action' });
  }
});

// Enhanced message input finder with better selectors
function findMessageInput() {
  debugLog('Looking for message input...');
  
  // More comprehensive selectors for Instagram's various layouts
  const selectors = [
    'div[contenteditable="true"][role="textbox"]',
    'div[contenteditable="true"][aria-label*="Message"]',
    'div[contenteditable="true"][data-testid*="message"]',
    'div[contenteditable="true"][placeholder*="message"]',
    'textarea[placeholder*="Message"]',
    'div[contenteditable="true"]:not([role="presentation"])',
    // Fallback selectors
    '[data-testid="message-input"]',
    '.x1n2onr6[contenteditable="true"]' // Instagram's obfuscated class
  ];
  
  for (const selector of selectors) {
    try {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        if (element && element.offsetParent !== null && !element.disabled) {
          const rect = element.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            debugLog('Found message input', { selector, element });
            return element;
          }
        }
      }
    } catch (error) {
      debugLog('Error with selector', { selector, error: error.message });
    }
  }
  
  debugLog('❌ Message input not found');
  return null;
}

// Enhanced function to send auto-reply with better error handling
async function sendAutoReply() {
  if (isProcessing) {
    debugLog('⏳ Already processing, skipping...');
    return;
  }
  
  if (!autoReplyEnabled) {
    debugLog('🚫 Auto-reply is disabled, skipping...');
    return;
  }
  
  isProcessing = true;
  debugLog('🚀 Attempting to send auto-reply...', autoReplyMessage);
  
  try {
    const messageInput = findMessageInput();
    if (!messageInput) {
      debugLog('❌ Message input not found, retrying...', retryCount);
      if (retryCount < MAX_RETRIES) {
        retryCount++;
        setTimeout(() => sendAutoReply(), 1000);
        return;
      } else {
        debugLog('❌ Max retries reached, giving up');
        retryCount = 0;
        return;
      }
    }
    
    retryCount = 0; // Reset retry count on success
    
    // Clear the input first
    messageInput.innerHTML = '';
    messageInput.textContent = '';
    messageInput.value = '';
    
    // Add the auto-reply message with multiple methods
    messageInput.innerHTML = autoReplyMessage;
    messageInput.textContent = autoReplyMessage;
    messageInput.value = autoReplyMessage;
    
    // Focus the input
    messageInput.focus();
    
    // Trigger multiple events to ensure Instagram detects the input
    const events = [
      new Event('focus', { bubbles: true }),
      new Event('input', { bubbles: true }),
      new Event('change', { bubbles: true }),
      new InputEvent('input', { bubbles: true, inputType: 'insertText', data: autoReplyMessage }),
      new Event('blur', { bubbles: true })
    ];
    
    events.forEach(event => messageInput.dispatchEvent(event));
    
    // Wait for Instagram to process the input
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Enhanced send button finder
    const success = await findAndClickSendButton(messageInput);
    
    if (success) {
      debugLog('✅ Auto-reply sent successfully!');
      // Notify background script
      chrome.runtime.sendMessage({
        action: 'logAutoReply',
        data: { message: autoReplyMessage, timestamp: Date.now() }
      });
    } else {
      debugLog('❌ Failed to send auto-reply');
    }
    
  } catch (error) {
    debugLog('❌ Error sending auto-reply', error);
  } finally {
    // Reset processing flag after a delay
    setTimeout(() => {
      isProcessing = false;
    }, 3000);
  }
}

// Enhanced send button finder with multiple strategies
async function findAndClickSendButton(messageInput) {
  debugLog('🔍 Looking for send button...');
  
  const sendStrategies = [
    // Strategy 1: Traditional button selectors
    () => {
      const selectors = [
        'button[type="submit"]',
        'div[role="button"]:has(svg[aria-label*="Send"])',
        'button:has(svg[aria-label*="Send"])',
        '[data-testid*="send"]',
        'div[role="button"] svg[viewBox*="24"]' // Instagram send icon viewBox
      ];
      
      for (const selector of selectors) {
        try {
          const elements = document.querySelectorAll(selector);
          for (const element of elements) {
            const rect = element.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              const button = element.tagName === 'svg' ? element.closest('div[role="button"]') : element;
              if (button && !button.disabled) {
                debugLog('Found send button via selector', selector);
                button.click();
                return true;
              }
            }
          }
        } catch (error) {
          debugLog('Error with selector', { selector, error: error.message });
        }
      }
      return false;
    },
    
    // Strategy 2: Enter key press
    () => {
      debugLog('Trying Enter key...');
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true
      });
      messageInput.dispatchEvent(enterEvent);
      return true;
    },
    
    // Strategy 3: Look for buttons near the input
    () => {
      debugLog('Looking for buttons near input...');
      const parent = messageInput.closest('form, div[role="form"], [role="main"]');
      if (parent) {
        const buttons = parent.querySelectorAll('button, div[role="button"]');
        for (const button of buttons) {
          const rect = button.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0 && button.offsetParent !== null) {
            // Check if button looks like a send button (has svg, is positioned right, etc.)
            const hasSvg = button.querySelector('svg');
            const buttonText = button.textContent.toLowerCase();
            if (hasSvg || buttonText.includes('send')) {
              debugLog('Found potential send button near input');
              button.click();
              return true;
            }
          }
        }
      }
      return false;
    }
  ];
  
  // Try each strategy
  for (const strategy of sendStrategies) {
    try {
      if (await strategy()) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait to see if it worked
        return true;
      }
    } catch (error) {
      debugLog('Strategy failed', error);
    }
  }
  
  return false;
}

// Enhanced function to check if the latest message is "Hello"
function checkForHelloMessage() {
  if (!autoReplyEnabled) {
    debugLog('🚫 Auto-reply is disabled, skipping message check');
    return false;
  }
  
  debugLog('🔍 Checking for Hello message...');
  
  // Enhanced message selectors for Instagram's current structure
  const messageSelectors = [
    // Primary selectors
    'div[data-testid="message-text"]',
    'span[dir="auto"]', // More generic for Instagram text
    'div[role="row"] div[dir="auto"]',
    'div[class*="message"] span',
    'div[class*="conversation"] div[dir="auto"]',
    // Fallback selectors
    '[data-testid*="message"] span',
    '.x193iq5w span', // Instagram's obfuscated classes
    'div[dir="auto"]:not([role="presentation"])'
  ];
  
  let messages = [];
  let usedSelector = null;
  
  for (const selector of messageSelectors) {
    try {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        // Filter out non-message elements
        messages = Array.from(elements).filter(el => {
          const text = el.textContent.trim();
          const rect = el.getBoundingClientRect();
          return text.length > 0 && rect.width > 0 && rect.height > 0;
        });
        
        if (messages.length > 0) {
          usedSelector = selector;
          debugLog('Found messages', { count: messages.length, selector });
          break;
        }
      }
    } catch (error) {
      debugLog('Error with message selector', { selector, error: error.message });
    }
  }
  
  if (messages.length === 0) {
    debugLog('❌ No messages found');
    return false;
  }
  
  // Get the latest few messages to check context
  const recentMessages = messages.slice(-5); // Check last 5 messages
  const latestMessage = messages[messages.length - 1];
  const messageText = latestMessage.textContent.trim();
  
  debugLog('Recent messages', recentMessages.map(m => m.textContent.trim()));
  debugLog('Latest message', messageText);
  
  // Check if the latest message is exactly "Hello" and we haven't processed it yet
  if (messageText === 'Hello' && latestMessage !== lastProcessedMessage) {
    // Additional check: make sure this is our outgoing message by checking message alignment/class
    const isOutgoingMessage = checkIfOutgoingMessage(latestMessage);
    
    if (isOutgoingMessage) {
      debugLog('👋 Found outgoing "Hello" message, preparing auto-reply...');
      lastProcessedMessage = latestMessage;
      
      // Wait a bit before replying to seem more natural and allow Instagram to process
      setTimeout(() => {
        sendAutoReply();
      }, 1500);
      
      return true;
    } else {
      debugLog('📨 Found "Hello" but it appears to be incoming, not auto-replying');
    }
  }
  
  return false;
}

// Helper function to determine if a message is outgoing (sent by us)
function checkIfOutgoingMessage(messageElement) {
  // Instagram typically aligns outgoing messages to the right
  // and incoming messages to the left, with different styling
  
  const checks = [
    // Check parent containers for alignment classes
    () => {
      const parent = messageElement.closest('div[class*="justify"], div[class*="flex"]');
      if (parent) {
        const classes = parent.className;
        return classes.includes('justify-end') || classes.includes('flex-row-reverse') || 
               classes.includes('right') || classes.includes('self-end');
      }
      return false;
    },
    
    // Check for specific Instagram outgoing message indicators
    () => {
      const messageContainer = messageElement.closest('[data-testid*="message"], div[role="row"]');
      if (messageContainer) {
        const computedStyle = window.getComputedStyle(messageContainer);
        return computedStyle.textAlign === 'right' || computedStyle.marginLeft === 'auto';
      }
      return false;
    },
    
    // Check if message bubble has outgoing styling
    () => {
      const bubble = messageElement.closest('div[class*="bubble"], div[class*="message"]');
      if (bubble) {
        const style = window.getComputedStyle(bubble);
        const bgColor = style.backgroundColor;
        // Outgoing messages often have colored backgrounds (blue, purple, etc.)
        return bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent' && 
               !bgColor.includes('255, 255, 255'); // Not white
      }
      return false;
    }
  ];
  
  // If any check indicates outgoing message, consider it outgoing
  const isOutgoing = checks.some(check => {
    try {
      return check();
    } catch (error) {
      debugLog('Error in outgoing message check', error);
      return false;
    }
  });
  
  debugLog('Message direction check', { 
    text: messageElement.textContent.trim(), 
    isOutgoing,
    element: messageElement 
  });
  
  return isOutgoing;
}

// Observer to watch for new messages
const observer = new MutationObserver((mutations) => {
  let shouldCheck = false;
  
  mutations.forEach((mutation) => {
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      // Check if any added nodes contain message-like content
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const hasMessageContent = node.querySelector && (
            node.querySelector('div[data-testid="message-text"]') ||
            node.querySelector('div[dir="auto"]') ||
            node.matches('div[data-testid="message-text"]') ||
            node.matches('div[dir="auto"]')
          );
          
          if (hasMessageContent) {
            shouldCheck = true;
            break;
          }
        }
      }
    }
  });
  
  if (shouldCheck) {
    debugLog('🔍 New content detected, checking for messages...');
    setTimeout(checkForHelloMessage, 500);
  }
});

// Start observing when the page is ready
function initializeExtension() {
  debugLog('🎬 Initializing Instagram Auto Reply...');
  
  // Start observing the entire document for changes
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false
  });
  
  // Initial check
  setTimeout(checkForHelloMessage, 2000);
  
  debugLog('✅ Extension initialized successfully!');
}

// Wait for the page to be fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  initializeExtension();
}

// Also initialize after a delay to ensure Instagram has loaded
setTimeout(initializeExtension, 3000);