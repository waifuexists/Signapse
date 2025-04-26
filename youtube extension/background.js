// Listen for installation
chrome.runtime.onInstalled.addListener(function() {
  // Initialize storage
  chrome.storage.local.set({
    translationEnabled: false,
    availableSignWords: []
  });

  // Scan for available sign language videos
  scanSignVideos();
});

// Function to scan for available sign language videos
function scanSignVideos() {
  // This would typically be an API call to your server
  // For now, we'll hardcode the available words based on your video files
  const availableWords = [
    'i', 'can', 'talk', 'with', 'my', 'deaf', 'friend', 'this',
    'year', 'thankyou', 'signapse', 'want', 'to', 'learn', 'and',
    'hello', 'complete'
  ];

  chrome.storage.local.set({ availableSignWords: availableWords });
}

// Listen for tab updates
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete' && tab.url.includes('youtube.com/watch')) {
    // Check if translation is enabled
    chrome.storage.local.get(['translationEnabled'], function(result) {
      if (result.translationEnabled) {
        // Notify the content script to start translation
        chrome.tabs.sendMessage(tabId, {
          action: 'toggleTranslation',
          enabled: true
        });
      }
    });
  }
});

// Listen for word recognition messages
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'wordRecognized') {
    handleRecognizedWord(request.word, sender.tab.id);
  }
});

// Function to handle recognized words
function handleRecognizedWord(word, tabId) {
  console.log('Handling recognized word:', word);
  chrome.storage.local.get(['availableSignWords'], function(result) {
    const availableWords = result.availableSignWords || [];
    console.log('Available sign words:', availableWords);
    
    // Clean and normalize the word
    const cleanWord = word.toLowerCase().trim();
    console.log('Cleaned word:', cleanWord);
    
    // Check if we have a sign video for this word
    if (availableWords.includes(cleanWord)) {
      console.log('Found matching sign video for word:', cleanWord);
      // Send message to content script to show the sign video
      chrome.tabs.sendMessage(tabId, {
        action: 'showSignVideo',
        word: cleanWord
      });
    } else {
      console.log('No sign video available for word:', cleanWord);
    }
  });
}