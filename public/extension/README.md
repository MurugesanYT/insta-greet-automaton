# Instagram Auto Reply Chrome Extension

A Chrome extension that automatically replies to Instagram Direct Messages when you send "Hello" to someone.

## Features

- 🤖 **Auto-Reply**: Automatically sends a custom message when you send "Hello"
- 🎨 **Beautiful UI**: Tailwind CSS-styled popup for settings
- 💾 **Persistent Storage**: Saves your custom auto-reply message
- 🔒 **Safe Operation**: Includes safeguards to prevent infinite loops
- 📱 **Instagram DM Only**: Works specifically on Instagram Direct Messages page
- 🎯 **Manifest V3**: Uses the latest Chrome extension standard

## Installation

1. **Download the Extension**
   - Download all files from the `public/extension/` folder
   - Or clone this repository

2. **Load in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (top right toggle)
   - Click "Load unpacked"
   - Select the `public/extension/` folder

3. **Grant Permissions**
   - The extension will request permission to access Instagram
   - Click "Allow" to enable functionality

## Usage

1. **Setup**
   - Click the extension icon in Chrome toolbar
   - Enter your custom auto-reply message in the popup
   - Click "Save Settings"

2. **Using the Extension**
   - Go to `https://www.instagram.com/direct/inbox/`
   - Open any conversation
   - Type and send "Hello" manually
   - The extension will automatically send your custom reply

## Files Structure

```
extension/
├── manifest.json          # Extension configuration
├── content.js            # Main script that monitors Instagram
├── popup.html           # Settings popup interface
├── popup.css           # Tailwind CSS styles
├── popup.js            # Popup functionality
├── background.js       # Background service worker
└── README.md          # This file
```

## How It Works

1. **Content Script** (`content.js`)
   - Injected into Instagram DM pages
   - Uses MutationObserver to watch for new messages
   - Detects when you send "Hello"
   - Automatically types and sends the custom reply

2. **Popup Interface** (`popup.html` + `popup.js`)
   - Provides settings UI
   - Stores custom message in Chrome storage
   - Shows extension status

3. **Background Script** (`background.js`)
   - Handles extension lifecycle
   - Manages storage and notifications
   - Updates extension badge

## Safety Features

- ✅ **Loop Prevention**: Tracks processed messages to avoid infinite replies
- ✅ **Rate Limiting**: Includes delays between operations
- ✅ **Text Matching**: Only triggers on exact "Hello" match
- ✅ **Visibility Checks**: Ensures elements are visible before interaction
- ✅ **Error Handling**: Comprehensive error catching

## Customization

**Change Auto-Reply Message:**
- Click extension icon
- Edit message in textarea
- Click "Save Settings"

**Modify Trigger Word:**
Edit line in `content.js`:
```javascript
if (messageText === 'Hello' && latestMessage !== lastProcessedMessage) {
```

**Add Multiple Triggers:**
```javascript
const triggers = ['Hello', 'Hi', 'Hey'];
if (triggers.includes(messageText) && latestMessage !== lastProcessedMessage) {
```

## Troubleshooting

**Extension Not Working?**
1. Check you're on `instagram.com/direct/inbox/`
2. Refresh the Instagram page
3. Check browser console for errors (F12)
4. Ensure extension is enabled in `chrome://extensions/`

**Auto-Reply Not Sending?**
1. Check console logs for debugging info
2. Try typing "Hello" exactly (case-sensitive)
3. Wait a moment after sending your message
4. Check if Instagram's UI has changed (may need selector updates)

## Development

**Testing:**
1. Load extension in developer mode
2. Open Instagram DMs
3. Send "Hello" in a conversation
4. Check browser console for debug logs

**Debugging:**
- All logs are prefixed with emojis for easy identification
- Content script: 🤖 logs
- Popup script: 🎨 logs
- Background script: 🔧 logs

## Privacy & Security

- ✅ Only accesses Instagram.com
- ✅ No data sent to external servers
- ✅ Messages stored locally only
- ✅ No message content accessed except trigger detection
- ✅ Open source and auditable

## Limitations

- Only works on desktop Instagram (not mobile app)
- Requires manual sending of "Hello" first
- May need updates if Instagram changes their UI
- Works only with text messages (not media)

## Version History

**v1.0**
- Initial release
- Basic auto-reply functionality
- Popup settings interface
- Manifest V3 support

## Support

If you encounter issues:
1. Check the console for error messages
2. Verify Instagram hasn't changed their UI selectors
3. Try refreshing the page and reloading the extension
4. Check if you're on the correct Instagram page

## License

This extension is provided as-is for educational purposes. Use responsibly and in accordance with Instagram's Terms of Service.