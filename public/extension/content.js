// Instagram Auto Reply Content Script
console.log('🤖 Instagram Auto Reply extension loaded');

let lastProcessedMessage = null;
let autoReplyMessage = 'Hey! How are you?';
let isProcessing = false;

// Load the custom auto-reply message from storage
chrome.storage.local.get(['autoReplyMessage'], (result) => {
  if (result.autoReplyMessage) {
    autoReplyMessage = result.autoReplyMessage;
    console.log('📝 Loaded auto-reply message:', autoReplyMessage);
  }
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.autoReplyMessage) {
    autoReplyMessage = changes.autoReplyMessage.newValue;
    console.log('🔄 Auto-reply message updated:', autoReplyMessage);
  }
});

// Function to find the message input field
function findMessageInput() {
  const selectors = [
    'div[contenteditable="true"][role="textbox"]',
    'div[contenteditable="true"][aria-label*="message"]',
    'div[contenteditable="true"][placeholder*="message"]',
    'textarea[placeholder*="Message"]'
  ];
  
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element && element.offsetParent !== null) { // Check if visible
      return element;
    }
  }
  return null;
}

// Function to send a message
async function sendAutoReply() {
  if (isProcessing) {
    console.log('⏳ Already processing, skipping...');
    return;
  }
  
  isProcessing = true;
  console.log('🚀 Attempting to send auto-reply...');
  
  try {
    const messageInput = findMessageInput();
    if (!messageInput) {
      console.log('❌ Message input not found');
      return;
    }
    
    // Clear the input first
    messageInput.innerHTML = '';
    messageInput.textContent = '';
    
    // Add the auto-reply message
    messageInput.innerHTML = autoReplyMessage;
    messageInput.textContent = autoReplyMessage;
    
    // Trigger input events
    const inputEvent = new Event('input', { bubbles: true });
    const changeEvent = new Event('change', { bubbles: true });
    messageInput.dispatchEvent(inputEvent);
    messageInput.dispatchEvent(changeEvent);
    
    // Wait a bit for Instagram to process the input
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Find and click the send button
    const sendSelectors = [
      'button[type="submit"]',
      'div[role="button"]:has(svg)',
      'button:has(svg[aria-label*="Send"])',
      'div[role="button"] svg[aria-label*="Send"]'
    ];
    
    let sendButton = null;
    for (const selector of sendSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        const rect = element.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          sendButton = element.tagName === 'svg' ? element.closest('div[role="button"]') : element;
          break;
        }
      }
      if (sendButton) break;
    }
    
    if (sendButton) {
      console.log('🎯 Found send button, clicking...');
      sendButton.click();
      console.log('✅ Auto-reply sent successfully!');
    } else {
      console.log('❌ Send button not found');
      // Fallback: try Enter key
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true
      });
      messageInput.dispatchEvent(enterEvent);
      console.log('⌨️ Tried sending with Enter key');
    }
    
  } catch (error) {
    console.error('❌ Error sending auto-reply:', error);
  } finally {
    // Reset processing flag after a delay
    setTimeout(() => {
      isProcessing = false;
    }, 2000);
  }
}

// Function to check if the latest message is "Hello"
function checkForHelloMessage() {
  // Look for message elements in the conversation
  const messageSelectors = [
    'div[data-testid="message-text"]',
    'div[role="row"] div[dir="auto"]',
    'div[class*="message"] span',
    'div[class*="conversation"] div[dir="auto"]'
  ];
  
  let messages = [];
  for (const selector of messageSelectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      messages = Array.from(elements);
      break;
    }
  }
  
  if (messages.length === 0) return false;
  
  // Get the latest message
  const latestMessage = messages[messages.length - 1];
  const messageText = latestMessage.textContent.trim();
  
  console.log('📨 Latest message:', messageText);
  
  // Check if it's exactly "Hello" and we haven't processed it yet
  if (messageText === 'Hello' && latestMessage !== lastProcessedMessage) {
    console.log('👋 Found "Hello" message, preparing auto-reply...');
    lastProcessedMessage = latestMessage;
    
    // Wait a bit before replying to seem more natural
    setTimeout(() => {
      sendAutoReply();
    }, 1000);
    
    return true;
  }
  
  return false;
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
    console.log('🔍 New content detected, checking for messages...');
    setTimeout(checkForHelloMessage, 500);
  }
});

// Start observing when the page is ready
function initializeExtension() {
  console.log('🎬 Initializing Instagram Auto Reply...');
  
  // Start observing the entire document for changes
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false
  });
  
  // Initial check
  setTimeout(checkForHelloMessage, 2000);
  
  console.log('✅ Extension initialized successfully!');
}

// Wait for the page to be fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  initializeExtension();
}

// Also initialize after a delay to ensure Instagram has loaded
setTimeout(initializeExtension, 3000);