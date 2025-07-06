// Instagram Auto Reply Content Script
console.log('🤖 Instagram Auto Reply extension loaded');

let lastProcessedMessage = null;
let autoReplyMessage = 'Hey! How are you?';
let isProcessing = false;
let autoReplyEnabled = true;
let retryCount = 0;
const MAX_RETRIES = 3;
let lastAutoReplyTime = 0;
const MIN_REPLY_INTERVAL = 10000; // 10 seconds minimum between auto-replies
let processedMessageIds = new Set(); // Track processed messages

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
    // Strategy 1: Look for Instagram's specific send button (avoiding emoji button)
    () => {
      debugLog('Strategy 1: Instagram send button structure...');
      
      // Find the message input container first
      const inputContainer = messageInput.closest('div');
      if (!inputContainer) return false;
      
      // Look for buttons in the same container as the input
      const buttons = inputContainer.parentElement?.querySelectorAll('div[role="button"]') || [];
      
      for (const button of buttons) {
        // Skip if this looks like an emoji button
        const ariaLabel = button.getAttribute('aria-label') || '';
        const title = button.getAttribute('title') || '';
        
        // Skip emoji, attachment, and other non-send buttons
        if (ariaLabel.toLowerCase().includes('emoji') || 
            ariaLabel.toLowerCase().includes('attach') ||
            ariaLabel.toLowerCase().includes('gif') ||
            ariaLabel.toLowerCase().includes('sticker') ||
            title.toLowerCase().includes('emoji')) {
          debugLog('Skipping non-send button', { ariaLabel, title });
          continue;
        }
        
        const svg = button.querySelector('svg');
        if (svg) {
          const viewBox = svg.getAttribute('viewBox');
          const paths = svg.querySelectorAll('path');
          
          // Instagram send button usually has a paper plane icon
          // Check for typical send button path patterns
          let looksLikeSendIcon = false;
          for (const path of paths) {
            const d = path.getAttribute('d') || '';
            // Send icons typically have paths with "L" (line) commands forming arrow/plane shapes
            if (d.includes('L') && (d.includes('M') || d.includes('m')) && d.length > 20) {
              looksLikeSendIcon = true;
              break;
            }
          }
          
          if (looksLikeSendIcon || (viewBox && viewBox.includes('24'))) {
            const rect = button.getBoundingClientRect();
            const inputRect = messageInput.getBoundingClientRect();
            
            // Send button should be to the right of the input
            const isToTheRight = rect.left > inputRect.right - 100;
            const isAtSameLevel = Math.abs(rect.top - inputRect.top) < 50;
            
            if (rect.width > 0 && rect.height > 0 && isToTheRight && isAtSameLevel) {
              debugLog('Found Instagram send button', { 
                ariaLabel, 
                viewBox, 
                looksLikeSendIcon,
                position: { left: rect.left, top: rect.top },
                inputPosition: { right: inputRect.right, top: inputRect.top }
              });
              
              button.click();
              return true;
            }
          }
        }
      }
      return false;
    },
    
    // Strategy 2: Enhanced Enter key with proper focus sequence
    () => {
      debugLog('Strategy 2: Enhanced Enter key sequence...');
      
      // Ensure input is focused and has content
      messageInput.focus();
      messageInput.click();
      
      // Wait a moment for focus
      setTimeout(() => {
        // Try multiple enter key events
        const events = [
          new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true
          }),
          new KeyboardEvent('keypress', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true
          }),
          new KeyboardEvent('keyup', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true
          })
        ];
        
        events.forEach(event => {
          messageInput.dispatchEvent(event);
          document.dispatchEvent(event);
        });
      }, 100);
      
      return true;
    },
    
    // Strategy 3: Form submission
    () => {
      debugLog('Strategy 3: Form submission...');
      const form = messageInput.closest('form');
      if (form) {
        debugLog('Found form, attempting submission');
        
        // Try different submission methods
        try {
          form.submit();
          return true;
        } catch (error) {
          debugLog('Form submit failed', error);
          
          // Try dispatching submit event
          const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
          form.dispatchEvent(submitEvent);
          return true;
        }
      }
      return false;
    },
    
    // Strategy 4: Look for send button by text content or aria-label
    () => {
      debugLog('Strategy 4: Send button by text/aria-label...');
      
      const allButtons = document.querySelectorAll('button, div[role="button"], [role="button"]');
      
      for (const button of allButtons) {
        const ariaLabel = button.getAttribute('aria-label') || '';
        const textContent = button.textContent || '';
        const title = button.getAttribute('title') || '';
        
        // Check for send-related text
        const sendIndicators = ['send', 'enviar', 'envoyer', 'senden', 'invia'];
        const hasSendText = sendIndicators.some(indicator => 
          ariaLabel.toLowerCase().includes(indicator) ||
          textContent.toLowerCase().includes(indicator) ||
          title.toLowerCase().includes(indicator)
        );
        
        if (hasSendText) {
          const rect = button.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            debugLog('Found send button by text/aria-label', { ariaLabel, textContent, title });
            
            button.click();
            button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            return true;
          }
        }
      }
      return false;
    },
    
    // Strategy 5: Find rightmost button near input (usually send button position)
    () => {
      debugLog('Strategy 5: Rightmost button near input...');
      
      const inputRect = messageInput.getBoundingClientRect();
      const allButtons = document.querySelectorAll('button, div[role="button"]');
      let rightmostButton = null;
      let maxRight = 0;
      
      for (const button of allButtons) {
        const rect = button.getBoundingClientRect();
        const verticalDistance = Math.abs(rect.top - inputRect.top);
        
        // Button should be roughly at the same vertical level as input
        if (rect.width > 0 && rect.height > 0 && verticalDistance < 80) {
          if (rect.right > maxRight) {
            maxRight = rect.right;
            rightmostButton = button;
          }
        }
      }
      
      if (rightmostButton) {
        debugLog('Found rightmost button', { maxRight });
        
        rightmostButton.click();
        rightmostButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        return true;
      }
      
      return false;
    }
  ];
  
  // Try each strategy with delay between attempts
  for (let i = 0; i < sendStrategies.length; i++) {
    try {
      debugLog(`Trying strategy ${i + 1}...`);
      if (await sendStrategies[i]()) {
        debugLog(`Strategy ${i + 1} completed, waiting to verify...`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait longer to see if it worked
        return true;
      }
    } catch (error) {
      debugLog(`Strategy ${i + 1} failed`, error);
    }
    
    // Small delay between strategies
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  debugLog('❌ All send strategies failed');
  return false;
}

// Enhanced function to check if the latest message is "Hello"
function checkForHelloMessage() {
  if (!autoReplyEnabled) {
    debugLog('🚫 Auto-reply is disabled, skipping message check');
    return false;
  }
  
  // Check if we're in a login challenge or error page (prevent infinite loops)
  if (document.querySelector('input[name="username"]') || 
      document.querySelector('input[name="password"]') ||
      window.location.href.includes('accounts/login') ||
      document.title.includes('Login')) {
    debugLog('🚫 Detected login page, stopping auto-reply to prevent loops');
    return false;
  }
  
  // Rate limiting: Don't send auto-replies too frequently
  const now = Date.now();
  if (now - lastAutoReplyTime < MIN_REPLY_INTERVAL) {
    debugLog('🚫 Rate limiting: Too soon since last auto-reply', { 
      timeSince: now - lastAutoReplyTime, 
      required: MIN_REPLY_INTERVAL 
    });
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
  
  // Create a unique identifier for this message
  const messageId = messageText + latestMessage.offsetTop + latestMessage.offsetLeft;
  
  debugLog('Recent messages', recentMessages.map(m => m.textContent.trim()));
  debugLog('Latest message', messageText);
  
  // Check if we've already processed this message
  if (processedMessageIds.has(messageId)) {
    debugLog('🚫 Message already processed, skipping', messageId);
    return false;
  }
  
  // Check if the latest message is exactly "Hello" and we haven't processed it yet
  if (messageText === 'Hello' && latestMessage !== lastProcessedMessage) {
    // Additional check: make sure this is our outgoing message by checking message alignment/class
    const isOutgoingMessage = checkIfOutgoingMessage(latestMessage);
    
    if (isOutgoingMessage) {
      debugLog('👋 Found outgoing "Hello" message, preparing auto-reply...');
      
      // Mark this message as processed
      processedMessageIds.add(messageId);
      lastProcessedMessage = latestMessage;
      lastAutoReplyTime = now;
      
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
  debugLog('🔍 Analyzing message direction...', messageElement.textContent.trim());
  
  const checks = [
    // Check 1: Look for Instagram's message container structure and positioning
    () => {
      const messageContainer = messageElement.closest('div');
      let current = messageContainer;
      
      // Look up the DOM tree for positioning clues
      for (let i = 0; i < 8 && current; i++) {
        const rect = current.getBoundingClientRect();
        const parentRect = current.parentElement?.getBoundingClientRect();
        
        if (parentRect && rect.width > 0) {
          const rightEdgeDistance = parentRect.right - rect.right;
          const leftEdgeDistance = rect.left - parentRect.left;
          
          // If message is much closer to right edge, it's likely outgoing
          if (rightEdgeDistance < 50 && leftEdgeDistance > 50) {
            debugLog('Position check - found right-aligned message', { rightEdgeDistance, leftEdgeDistance });
            return true;
          }
        }
        current = current.parentElement;
      }
      return false;
    },
    
    // Check 2: Look for flex direction and justify content
    () => {
      const container = messageElement.closest('div');
      let current = container;
      for (let i = 0; i < 5 && current; i++) {
        const style = window.getComputedStyle(current);
        const classes = current.className;
        
        // Check for right alignment indicators
        if (style.justifyContent === 'flex-end' || 
            style.textAlign === 'right' ||
            classes.includes('justify-end') ||
            classes.includes('flex-row-reverse') ||
            classes.includes('ml-auto') ||
            style.marginLeft === 'auto') {
          debugLog('Style check found outgoing', { classes, justifyContent: style.justifyContent });
          return true;
        }
        current = current.parentElement;
      }
      return false;
    },
    
    // Check 3: Look for message bubble styling (outgoing usually has colored background)
    () => {
      const bubble = messageElement.closest('div[class*="message"], div');
      if (bubble) {
        const style = window.getComputedStyle(bubble);
        const bgColor = style.backgroundColor;
        
        // Parse background color to check if it's not white/transparent
        if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
          // Check if it's not white (outgoing messages usually have colored bubbles)
          const isColored = !bgColor.includes('255, 255, 255') && 
                           !bgColor.includes('rgb(255, 255, 255)') &&
                           bgColor !== 'rgb(255, 255, 255)' &&
                           bgColor !== 'white';
          debugLog('Background color check', { bgColor, isColored });
          return isColored;
        }
      }
      return false;
    },
    
    // Check 4: Check sibling elements for patterns
    () => {
      const parent = messageElement.closest('div[role="row"]') || messageElement.parentElement;
      if (parent) {
        const siblings = Array.from(parent.parentElement?.children || []);
        const index = siblings.indexOf(parent);
        
        // Look for patterns in previous messages
        if (index > 0) {
          const prevSibling = siblings[index - 1];
          if (prevSibling) {
            const prevRect = prevSibling.getBoundingClientRect();
            const currentRect = parent.getBoundingClientRect();
            const containerRect = parent.closest('div[role="main"]')?.getBoundingClientRect();
            
            if (containerRect) {
              const centerX = containerRect.left + (containerRect.width / 2);
              const isCurrentOnRight = currentRect.left + (currentRect.width / 2) > centerX;
              debugLog('Sibling pattern check', { isCurrentOnRight });
              return isCurrentOnRight;
            }
          }
        }
      }
      return false;
    }
  ];
  
  // Try each check and log results
  const results = checks.map((check, index) => {
    try {
      const result = check();
      debugLog(`Check ${index + 1} result:`, result);
      return result;
    } catch (error) {
      debugLog(`Check ${index + 1} error:`, error.message);
      return false;
    }
  });
  
  // If majority of checks indicate outgoing, consider it outgoing
  const trueCount = results.filter(Boolean).length;
  const isOutgoing = trueCount >= 2; // At least 2 checks must pass
  
  debugLog('🎯 Final message direction decision', { 
    text: messageElement.textContent.trim(), 
    checkResults: results,
    trueCount,
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