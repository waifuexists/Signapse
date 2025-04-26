let audioContext = null;
let mediaSource = null;
let analyser = null;
let recognition = null;
let translationEnabled = false;
let signLanguageContainer = null;
let currentVideoElement = null;
let videoCache = new Map(); // Cache for loaded videos
let videoQueue = []; // Queue for videos to play
let isPlaying = false; // Flag to track if a video is currently playing
let currentlyProcessingWords = new Set(); // Set to track words being processed

// Available words for sign language
const availableWords = [
  'accept',
  'accident',
  'actor',
  'adjust',
  'admire',
  'adult',
  'ago',
  'agreement',
  'amazing',
  'and',
  'another',
  'back',
  'bathroom',
  'battery',
  'bear',
  'bird',
  'birthday',
  'botton',
  'can',
  'come',
  'complete',
  'conquer',
  'culture',
  'deaf',
  'demonstrate',
  'develop',
  'doctor',
  'drama',
  'drop',
  'environment',
  'everyday',
  'flatter',
  'friend',
  'goodbye',
  'habit',
  'hampburger',
  'heaven',
  'hello',
  'i',
  'jewelry',
  'learn',
  'memorize',
  'motorcycle',
  'my',
  'name',
  'picture',
  'popular',
  'presiden',
  'real',
  'service',
  'shoot',
  'scientist',
  'signapse',
  'signlanguage',
  'smoking',
  'spray',
  'stairs',
  'subway',
  'sympathy',
  'talk',
  'thankyou',
  'this',
  'to',
  'want',
  'whistle',
  'willing',
  'with',
  'year',
  'yourself',
  'zero'
];

// Create debug info element
function createDebugInfo() {
  const debugInfo = document.createElement('div');
  debugInfo.id = 'debug-info';
  debugInfo.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0,0,0,0.8);
    color: white;
    padding: 10px 20px;
    border-radius: 8px;
    font-family: Arial, sans-serif;
    font-size: 14px;
    z-index: 9999;
    display: none;
  `;
  document.body.appendChild(debugInfo);
  return debugInfo;
}

// Function to preload videos
async function preloadVideos() {
  console.log('Initializing video system...');
  
  // Clear existing cache
  videoCache.clear();
  let loadedCount = 0;
  
  // Create a map of normalized words to actual file paths
  const wordToPathMap = new Map();
  
  // First, verify which videos exist
  for (const word of availableWords) {
    try {
      // Try different file name patterns
      const patterns = [
        `${word}.mp4`,
        `${word} .mp4`,
        `${word}- Trim.mp4`,
        `${word.charAt(0).toUpperCase() + word.slice(1)}.mp4`
      ];
      
      let videoPath = null;
      
      for (const pattern of patterns) {
        try {
          const path = chrome.runtime.getURL(`sign_words/${pattern}`);
          const response = await fetch(path, { method: 'HEAD' });
          if (response.ok) {
            videoPath = path;
            console.log(`Found video for ${word}: ${path}`);
            break;
          }
        } catch (e) {
          // Continue to next pattern
          console.log(`Error checking ${pattern}: ${e.message}`);
        }
      }
      
      if (videoPath) {
        wordToPathMap.set(word, videoPath);
        console.log(`Found video for ${word}: ${videoPath}`);
      } else {
        console.log(`No video found for ${word}`);
      }
    } catch (error) {
      console.error(`Failed to find video for ${word}:`, error);
    }
  }
  
  // Update available words to only include those with videos
  const availableWordsWithVideos = Array.from(wordToPathMap.keys());
  console.log('Available words with videos:', availableWordsWithVideos);
  
  // Update the availableWords array
  availableWords.length = 0;
  availableWords.push(...availableWordsWithVideos);
  
  // Update debug info
  const debugInfo = document.getElementById('debug-info');
  if (debugInfo) {
    debugInfo.textContent = `Found ${availableWordsWithVideos.length} available videos`;
  }
  
  return availableWordsWithVideos.length;
}

// Function to cleanup resources
function cleanupResources() {
  console.log('Cleaning up resources...');
  
  // Stop recognition first
  if (recognition) {
    try {
      recognition.stop();
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.onstart = null;
      recognition.started = false;
    } catch (e) {
      console.error('Error stopping recognition:', e);
    }
    recognition = null;
  }

  // Clear audio context
  if (audioContext) {
    try {
      if (mediaSource) {
        mediaSource.disconnect();
      }
      if (analyser) {
        analyser.disconnect();
      }
      audioContext.close().catch(console.error);
    } catch (e) {
      console.error('Error closing audio context:', e);
    }
    audioContext = null;
    mediaSource = null;
    analyser = null;
  }
  
  // Clear video queue and cache
  videoQueue = [];
  isPlaying = false;
  if (currentVideoElement) {
    try {
      currentVideoElement.pause();
      currentVideoElement.removeAttribute('src');
      currentVideoElement.load();
    } catch (e) {
      console.error('Error cleaning video element:', e);
    }
  }
  
  // Clear video cache
  try {
    for (const url of videoCache.values()) {
      URL.revokeObjectURL(url);
    }
    videoCache.clear();
  } catch (e) {
    console.error('Error clearing video cache:', e);
  }
  
  // Remove debug info
  const debugInfo = document.getElementById('debug-info');
  if (debugInfo) {
    debugInfo.remove();
  }
  
  // Remove word tracker
  const wordTracker = document.getElementById('word-tracker');
  if (wordTracker) {
    wordTracker.remove();
  }
  
  // Remove sign language container
  if (signLanguageContainer) {
    signLanguageContainer.remove();
    signLanguageContainer = null;
  }
  
  // Remove word list
  const wordList = document.getElementById('word-list');
  if (wordList) {
    wordList.remove();
  }
  
  console.log('Resources cleaned up');
}

// Function to test video playback
async function testVideoPlayback() {
  console.log('Testing video playback...');
  
  // Create debug info element
  const debugInfo = document.createElement('div');
  debugInfo.id = 'debug-info';
  debugInfo.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0,0,0,0.8);
    color: white;
    padding: 10px 20px;
    border-radius: 8px;
    font-family: Arial, sans-serif;
    font-size: 14px;
    z-index: 999999;
    display: block;
  `;
  document.body.appendChild(debugInfo);
  debugInfo.textContent = 'Testing video playback...';
  
  // Create sign language container
  const container = document.createElement('div');
  container.id = 'sign-language-container';
  container.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 300px;
    height: 225px;
    background: rgba(0, 0, 0, 0.8);
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 999999;
    display: block;
    border: 2px solid white;
  `;
  document.body.appendChild(container);
  
  // Try to play a simple video
  try {
    // Try with a common word like 'hello'
    const testWord = 'hello';
    const videoPath = chrome.runtime.getURL(`sign_words/${testWord}.mp4`);
    debugInfo.textContent = `Testing with video: ${videoPath}`;
    
    // Create video element
    const videoElement = document.createElement('video');
    videoElement.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    `;
    container.appendChild(videoElement);
    
    // Set up video
    videoElement.src = videoPath;
    videoElement.muted = true;
    videoElement.playsInline = true;
    videoElement.controls = true;
    
    // Add event listeners
    videoElement.addEventListener('error', (e) => {
      console.error('Video error:', e);
      debugInfo.textContent = `Video error: ${e.target.error.message}`;
    });
    
    videoElement.addEventListener('loadeddata', () => {
      console.log('Video loaded successfully');
      debugInfo.textContent = `Video loaded: ${testWord}`;
    });
    
    // Try to play
    await videoElement.play();
    debugInfo.textContent = `Video playing: ${testWord}`;
    
    // Wait for video to end
    await new Promise((resolve) => {
      videoElement.onended = () => {
        console.log('Video ended normally');
        debugInfo.textContent = `Video completed: ${testWord}`;
        resolve();
      };
    });
    
    console.log('Test completed successfully');
  } catch (error) {
    console.error('Test error:', error);
    debugInfo.textContent = `Test error: ${error.message}`;
  }
}

// Function to request microphone permission
async function requestMicrophonePermission() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Stop the stream immediately since we only needed permission
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    console.error('Microphone permission denied:', error);
    return false;
  }
}

// Function to start translation
async function startTranslation() {
  // First check for microphone permission
  const hasPermission = await requestMicrophonePermission();
  if (!hasPermission) {
    console.error('Microphone permission is required for translation');
    // Create debug info element to show error
    const debugInfo = document.createElement('div');
    debugInfo.id = 'sign-language-debug-info';
    debugInfo.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px;
      border-radius: 5px;
      z-index: 9999;
      font-family: Arial, sans-serif;
    `;
    document.body.appendChild(debugInfo);
    debugInfo.textContent = 'Failed to start translation: Microphone permission required';
    return false;
  }

  try {
    // Create debug info element
    const debugInfo = document.createElement('div');
    debugInfo.id = 'sign-language-debug-info';
    debugInfo.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px;
      border-radius: 5px;
      z-index: 9999;
      font-family: Arial, sans-serif;
    `;
    document.body.appendChild(debugInfo);
    debugInfo.textContent = 'Starting translation...';

    // Start processing YouTube captions
    const success = processYouTubeCaptions();
    if (!success) {
      debugInfo.textContent = 'Failed to start translation: Could not process captions';
      return false;
    }
    
    // Update debug info
    debugInfo.textContent = 'Translation started - Watching for words...';
    return true;
  } catch (error) {
    console.error('Error starting translation:', error);
    // Create debug info element to show error
    const debugInfo = document.createElement('div');
    debugInfo.id = 'sign-language-debug-info';
    debugInfo.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px;
      border-radius: 5px;
      z-index: 9999;
      font-family: Arial, sans-serif;
    `;
    document.body.appendChild(debugInfo);
    debugInfo.textContent = `Failed to start translation: ${error.message}`;
    return false;
  }
}

// Function to ensure sign language container is visible
function ensureSignLanguageContainerVisible() {
  console.log('Ensuring sign language container is visible');
  
  let container = document.getElementById('sign-language-container');
  if (!container) {
    console.log('Creating new sign language container');
    container = createSignLanguageContainer();
  }
  
  // Force container to be visible
  container.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 300px;
    height: 225px;
    background: rgba(0, 0, 0, 0.8);
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 999999;
    display: block !important;
    border: 2px solid white;
    opacity: 1 !important;
    visibility: visible !important;
  `;
  
  // Make sure it's at the top of the z-index stack
  container.style.zIndex = '999999';
  
  return container;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message);
  
  if (message.action === 'toggleTranslation') {
    const wasEnabled = translationEnabled;
    translationEnabled = message.enabled;
    console.log('Translation enabled:', translationEnabled);
    
    const videoElement = document.querySelector('video');
    if (!videoElement) {
      console.error('No video element found');
      return;
    }

    if (translationEnabled) {
      // Only start if we weren't already enabled
      if (!wasEnabled) {
        console.log('Starting translation...');
        
        try {
          // Create or show sign language container first
          signLanguageContainer = ensureSignLanguageContainerVisible();

          // Create debug info element
          const debugInfo = document.createElement('div');
          debugInfo.id = 'debug-info';
          debugInfo.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            z-index: 999999;
            display: block;
          `;
          document.body.appendChild(debugInfo);
          debugInfo.textContent = 'Starting translation...';

          // Start translation
          const translationStarted = startTranslation();
          if (!translationStarted) {
            debugInfo.textContent = 'Failed to start translation';
            translationEnabled = false;
            return;
          }

          // Preload videos
          preloadVideos().then(() => {
            console.log('Videos preloaded successfully');
            debugInfo.textContent = 'Translation started successfully';
            
            // Add a list of available words for reference
            const wordList = document.createElement('div');
            wordList.id = 'word-list';
            wordList.style.cssText = `
              position: fixed;
              top: 20px;
              left: 20px;
              background: rgba(0,0,0,0.8);
              color: white;
              padding: 10px;
              border-radius: 8px;
              font-family: Arial, sans-serif;
              font-size: 12px;
              z-index: 999999;
              max-height: 300px;
              overflow-y: auto;
              max-width: 200px;
            `;
            
            const title = document.createElement('div');
            title.style.cssText = `
              font-weight: bold;
              margin-bottom: 5px;
              border-bottom: 1px solid rgba(255,255,255,0.3);
              padding-bottom: 5px;
            `;
            title.textContent = 'Available Words:';
            wordList.appendChild(title);
            
            const words = document.createElement('div');
            words.style.cssText = `
              display: flex;
              flex-wrap: wrap;
              gap: 5px;
            `;
            
            availableWords.forEach(word => {
              const wordSpan = document.createElement('span');
              wordSpan.textContent = word;
              wordSpan.style.cssText = `
                background: rgba(255,255,255,0.2);
                padding: 2px 5px;
                border-radius: 3px;
                cursor: pointer;
              `;
              wordSpan.addEventListener('click', () => {
                console.log('Clicked word:', word);
                queueWord(word);
              });
              words.appendChild(wordSpan);
            });
            
            wordList.appendChild(words);
            document.body.appendChild(wordList);
          }).catch(error => {
            console.error('Error preloading videos:', error);
            debugInfo.textContent = `Error: ${error.message}`;
            translationEnabled = false;
          });
        } catch (error) {
          console.error('Error starting translation:', error);
          const debugInfo = document.getElementById('debug-info');
          if (debugInfo) {
            debugInfo.textContent = `Error: ${error.message}`;
          }
          translationEnabled = false;
        }
      }
    } else {
      // Disable translation
      console.log('Disabling translation...');
      
      // Clean up resources
      cleanupResources();
      
      // Remove debug info
      const debugInfo = document.getElementById('debug-info');
      if (debugInfo) {
        debugInfo.remove();
      }
      
      // Remove word list
      const wordList = document.getElementById('word-list');
      if (wordList) {
        wordList.remove();
      }
    }
  }
});

// Create the sign language video container
function createSignLanguageContainer() {
  console.log('Creating sign language container');
  
  // Remove existing container if any
  const existingContainer = document.getElementById('sign-language-container');
  if (existingContainer) {
    console.log('Removing existing container');
    existingContainer.remove();
  }

  const container = document.createElement('div');
  container.id = 'sign-language-container';
  container.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 300px;
    height: 225px;
    background: rgba(0, 0, 0, 0.8);
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 999999;
    display: block;
    border: 2px solid white;
    opacity: 1;
    visibility: visible;
  `;

  // Add a container for videos with relative positioning
  const videoContainer = document.createElement('div');
  videoContainer.style.cssText = `
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
  `;
  videoContainer.id = 'video-container';
  
  container.appendChild(videoContainer);
  
  // Add container to document
  document.body.appendChild(container);
  console.log('Sign language container created and added to document');
  
  return container;
}

// Create word tracking display
function createWordTracker() {
  const tracker = document.createElement('div');
  tracker.id = 'word-tracker';
  tracker.style.cssText = `
    position: fixed;
    left: 20px;
    top: 20px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 15px;
    border-radius: 8px;
    font-family: Arial, sans-serif;
    font-size: 14px;
    z-index: 9999;
    max-width: 200px;
    max-height: 300px;
    overflow-y: auto;
  `;

  const title = document.createElement('div');
  title.style.cssText = `
    font-weight: bold;
    margin-bottom: 10px;
    border-bottom: 1px solid rgba(255,255,255,0.3);
    padding-bottom: 5px;
  `;
  title.textContent = 'Detected Words';
  tracker.appendChild(title);

  const signWords = document.createElement('div');
  signWords.id = 'sign-words';
  signWords.style.cssText = `
    margin-bottom: 10px;
    color: #4CAF50;
  `;
  signWords.innerHTML = '<strong>Words with signs:</strong><br>';
  tracker.appendChild(signWords);

  const missingWords = document.createElement('div');
  missingWords.id = 'missing-words';
  missingWords.style.cssText = `
    color: #FFA726;
  `;
  missingWords.innerHTML = '<strong>Words without signs:</strong><br>';
  tracker.appendChild(missingWords);

  return tracker;
}

// Function to process audio from video
async function processAudio() {
  console.log('Starting caption processing');
  
  // Get video element
  const videoElement = document.querySelector('video');
  if (!videoElement) {
    console.error('No video element found');
    return;
  }

  // Create debug info element
  const debugInfo = document.createElement('div');
  debugInfo.id = 'debug-info';
  debugInfo.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0,0,0,0.8);
    color: white;
    padding: 10px 20px;
    border-radius: 8px;
    font-family: Arial, sans-serif;
    font-size: 14px;
    z-index: 999999;
    display: block;
  `;
  document.body.appendChild(debugInfo);
  debugInfo.textContent = 'Processing video captions...';

  // Start processing captions
  startCaptionProcessing();

  return {
    videoElement,
    debugInfo
  };
}

// Function to process YouTube captions
function processYouTubeCaptions() {
  const captionContainer = findCaptionContainer();
  if (!captionContainer) {
    console.log('Caption container not found, waiting...');
    // Wait for captions to appear
    const observer = new MutationObserver((mutations, obs) => {
      const container = findCaptionContainer();
      if (container) {
        obs.disconnect();
        startCaptionObserver(container);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    return;
  }

  startCaptionObserver(captionContainer);
}

// Function to find caption container
function findCaptionContainer() {
  const selectors = [
    '.ytp-caption-segment',
    '.ytp-caption-window-container',
    '.ytp-caption-window',
    '.ytp-caption-window-rollup',
    '.ytp-caption-window-rollup-content'
  ];

  for (const selector of selectors) {
    const container = document.querySelector(selector);
    if (container) return container;
  }
  return null;
}

// Function to start observing captions
function startCaptionObserver(container) {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList' || mutation.type === 'characterData') {
        const text = container.textContent.trim();
        if (text) {
          processCaptionText(text);
        }
      }
    }
  });

  observer.observe(container, {
    childList: true,
    subtree: true,
    characterData: true
  });
}

// Function to process caption text
function processCaptionText(text) {
  // Create a Set of available words for O(1) lookup
  const availableWordsSet = new Set(availableWords);
  
  // Process text in a single pass
  const words = text.toLowerCase()
    .replace(/[.,!?]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 0 && availableWordsSet.has(word));

  // Queue words in batch
  if (words.length > 0) {
    for (const word of words) {
      queueWord(word);
    }
  }
}

// Function to start caption processing
function startCaptionProcessing() {
  console.log('Starting caption processing');
  
  // Create debug info
  const debugInfo = document.getElementById('debug-info');
  if (debugInfo) {
    debugInfo.textContent = 'Starting caption processing...';
  }

  // Start processing captions
  const observer = processYouTubeCaptions();
  
  // Update debug info
  if (debugInfo) {
    debugInfo.textContent = 'Caption processing started';
  }

  return observer;
}

// Function to process recognized words
function processRecognizedWords(words) {
  if (words.length === 0) return;
  
  console.log('Processing recognized words:', words);
  
  // Update debug info
    const debugInfo = document.getElementById('debug-info');
    if (debugInfo) {
    debugInfo.textContent = `Processing ${words.length} words`;
  }
  
  // Process each word
  for (const word of words) {
    // Clean the word
    const cleanWord = word.toLowerCase().trim();
    
    // Check if the word is in our available words list
    if (availableWords.includes(cleanWord)) {
      console.log('Found matching word:', cleanWord);
      queueWord(cleanWord);
    } else {
      console.log('Word not in available words:', cleanWord);
    }
  }
  
  // Clear the words array after processing
  words.length = 0;
}

// Function to update word tracker display
function updateWordTracker(signWords, missingWords) {
  const signWordsDiv = document.getElementById('sign-words');
  const missingWordsDiv = document.getElementById('missing-words');
  
  if (signWordsDiv && signWords.length > 0) {
    const existingWords = signWordsDiv.innerHTML.split('<br>').slice(1, -1);
    const newWords = [...new Set([...existingWords, ...signWords])];
    signWordsDiv.innerHTML = '<strong>Words with signs:</strong><br>' + 
      newWords.join('<br>') + '<br>';
  }
  
  if (missingWordsDiv && missingWords.length > 0) {
    const existingWords = missingWordsDiv.innerHTML.split('<br>').slice(1, -1);
    const newWords = [...new Set([...existingWords, ...missingWords])];
    missingWordsDiv.innerHTML = '<strong>Words without signs:</strong><br>' + 
      newWords.join('<br>') + '<br>';
  }
}

// Function to queue a word for video playback
function queueWord(word) {
  // Normalize the word once
  word = word.toLowerCase().trim();
  
  // Quick validation
  if (!word || !availableWords.includes(word)) return;

  // Check if word is already being processed
  if (currentlyProcessingWords.has(word)) return;

  // Add to processing set
  currentlyProcessingWords.add(word);

  // Avoid duplicates by moving existing word to end of queue
  const existingIndex = videoQueue.indexOf(word);
  if (existingIndex !== -1) {
    videoQueue.splice(existingIndex, 1);
  }

  // Add word to queue
  videoQueue.push(word);
  updateDebugInfo(`Queued word: ${word} (Queue length: ${videoQueue.length})`);

  // Start processing if no video is playing
  if (!isPlaying) {
    processNextVideo();
  }

  // Remove from processing set after a delay
  setTimeout(() => {
    currentlyProcessingWords.delete(word);
  }, 1000);
}

// Function to load a video file
async function loadVideo(word) {
  console.log('Loading video for word:', word);
  
  // Check cache first
  if (videoCache.has(word)) {
    console.log('Using cached video URL for:', word);
    return videoCache.get(word);
  }
  
  // Try different filename patterns
  const patterns = [
    `${word}.mp4`,
    `${word} .mp4`,
    `${word}- Trim.mp4`,
    `${word.charAt(0).toUpperCase() + word.slice(1)}.mp4`
  ];
  
  let videoPath = null;
  
  // Try each pattern
  for (const pattern of patterns) {
    const path = chrome.runtime.getURL(`sign_words/${pattern}`);
    console.log('Trying path:', path);
    
    try {
      const response = await fetch(path);
      if (response.ok) {
        videoPath = path;
        console.log('Found video at:', path);
        break;
      }
    } catch (error) {
      console.log('Error checking path:', path, error);
    }
  }
  
  if (!videoPath) {
    console.error('No video found for word:', word);
    throw new Error(`No video found for word: ${word}`);
  }
  
  // Cache the URL
  videoCache.set(word, videoPath);
  console.log('Cached video URL for:', word);
  
  return videoPath;
}

// Function to find a matching video file for a word
async function findMatchingVideoFile(word) {
  console.log('Finding video for word:', word);
  
  // Check if word is in cache
  if (videoCache.has(word)) {
    console.log('Found video in cache:', word);
    return videoCache.get(word);
  }
  
  // Normalize word for matching
  const normalizedWord = word.toLowerCase().trim();
  console.log('Normalized word:', normalizedWord);
  
  // Check if word is in available words
  if (!availableWords.includes(normalizedWord)) {
    console.log('Word not in available words:', normalizedWord);
    console.log('Available words:', availableWords);
    return null;
  }
  
  // Try different filename patterns
  const patterns = [
    `${normalizedWord}.mp4`,
    `${normalizedWord} .mp4`,
    `${normalizedWord}- Trim.mp4`,
    `${normalizedWord.charAt(0).toUpperCase() + normalizedWord.slice(1)}.mp4`
  ];
  
  console.log('Trying patterns:', patterns);
  
  for (const pattern of patterns) {
    try {
      const videoPath = chrome.runtime.getURL(`sign_words/${pattern}`);
      console.log('Trying video path:', videoPath);
      
      const response = await fetch(videoPath, { method: 'HEAD' });
      if (response.ok) {
        console.log('Found matching video:', videoPath);
        return videoPath;
      } else {
        console.log(`Video not found for pattern: ${pattern}, status: ${response.status}`);
      }
    } catch (error) {
      console.log(`Error checking pattern ${pattern}:`, error);
    }
  }
  
  console.log('No matching video found for word:', normalizedWord);
  return null;
}

// Function to process the next video in the queue
async function processNextVideo() {
  if (isPlaying || videoQueue.length === 0) {
    return;
  }

  isPlaying = true;
  const word = videoQueue.shift();
  console.log('Processing next video for word:', word);

  try {
    // Create or get the sign language container
    let container = document.getElementById('sign-language-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'sign-language-container';
      container.style.cssText = `
        position: fixed;
        bottom: 100px;
        right: 20px;
        width: 300px;
        height: 300px;
        background: rgba(0, 0, 0, 0.8);
        border-radius: 10px;
        z-index: 9999;
        display: flex;
        justify-content: center;
        align-items: center;
        transition: opacity 0.3s ease;
      `;
      document.body.appendChild(container);
    }

    // Clear container and make it visible
    container.innerHTML = '';
    container.style.display = 'flex';
    container.style.opacity = '1';
    container.style.justifyContent = 'center';
    container.style.alignItems = 'center';

    // Update debug info
    updateDebugInfo(`Loading video for: ${word}`);

    // Load and play the video
    const videoPath = await loadVideo(word);
    if (!videoPath) {
      throw new Error(`Failed to load video for word: ${word}`);
    }

    const video = document.createElement('video');
    video.style.cssText = `
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      display: block;
      margin: auto;
    `;
    video.src = videoPath;
    video.muted = true;
    video.playsInline = true;

    // Add error handling
    video.onerror = (error) => {
      console.error('Error playing video:', error);
      updateDebugInfo(`Error playing video for: ${word}`);
      isPlaying = false;
      processNextVideo(); // Try next video
    };

    // Add to container and play
    container.appendChild(video);
    await video.play();

    // Wait for video to end
    await new Promise((resolve) => {
      video.onended = resolve;
    });

    console.log('Video playback completed for:', word);
    updateDebugInfo(`Completed: ${word}`);

  } catch (error) {
    console.error('Error processing video:', error);
    updateDebugInfo(`Error: ${error.message}`);
  } finally {
    isPlaying = false;
    processNextVideo(); // Process next video in queue
  }
}

// Function to update debug information
function updateDebugInfo(message) {
  const debugInfo = document.getElementById('sign-language-debug-info');
  if (debugInfo) {
    debugInfo.textContent = message;
  }
}

// Function to play sign language video
async function playSignVideo(word) {
  console.log('Starting to play video for word:', word);
  
  // Get or create sign language container
  let signLanguageContainer = document.getElementById('sign-language-container');
  if (!signLanguageContainer) {
    signLanguageContainer = document.createElement('div');
    signLanguageContainer.id = 'sign-language-container';
    signLanguageContainer.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 300px;
      height: 225px;
      background: rgba(0, 0, 0, 0.8);
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 9999;
      display: block;
    `;
    document.body.appendChild(signLanguageContainer);
  }
  
  // Update debug info
  const debugInfo = document.getElementById('debug-info');
  if (debugInfo) {
    debugInfo.textContent = `Loading video for: ${word}`;
    debugInfo.style.display = 'block';
  }

  try {
    // Try to find the video file
    const videoPath = await findMatchingVideoFile(word);
    if (!videoPath) {
      console.error(`No video found for word: ${word}`);
      if (debugInfo) {
        debugInfo.textContent = `No video found for: ${word}`;
      }
      return;
    }
    
    console.log('Video path:', videoPath);

    // Clear container and make it visible
    signLanguageContainer.innerHTML = '';
    signLanguageContainer.style.display = 'block';
    
    // Create a new video element for each word
    const videoElement = document.createElement('video');
    videoElement.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    `;
    
    // Set up video
    videoElement.src = videoPath;
    videoElement.muted = true;
    videoElement.playsInline = true;
    videoElement.controls = true;
    
    // Add event listeners for debugging
    videoElement.addEventListener('error', (e) => {
      console.error('Video error:', e);
      console.error('Video error details:', e.target.error);
      if (debugInfo) {
        debugInfo.textContent = `Video error: ${e.target.error ? e.target.error.message : 'Unknown error'}`;
      }
    });
    
    videoElement.addEventListener('loadeddata', () => {
      console.log('Video loaded successfully');
      if (debugInfo) {
        debugInfo.textContent = `Video loaded: ${word}`;
      }
    });
    
    // Add video to container
    signLanguageContainer.appendChild(videoElement);
    
    // Play video
    console.log('Starting playback');
    try {
      const playPromise = videoElement.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log('Video playing successfully');
          if (debugInfo) {
            debugInfo.textContent = `Video playing: ${word}`;
          }
        }).catch(error => {
          console.error('Playback error:', error);
          if (debugInfo) {
            debugInfo.textContent = `Playback error: ${error.message}`;
          }
        });
      }
      
      // Wait for video to end
      await new Promise((resolve) => {
        videoElement.onended = () => {
          console.log('Video ended normally');
          resolve();
        };
      });
      
      console.log('Video completed successfully');
    } catch (error) {
      console.error('Playback error:', error);
      if (debugInfo) {
        debugInfo.textContent = `Playback error: ${error.message}`;
      }
    }
  } catch (error) {
    console.error('Error in playSignVideo:', error);
    if (debugInfo) {
      debugInfo.textContent = `Error: ${error.message}`;
    }
  }
}

// Function to test video playback for a specific word
async function testWordPlayback(word) {
  console.log('Testing video playback for word:', word);
  
  // Create debug info element
  const debugInfo = document.createElement('div');
  debugInfo.id = 'debug-info';
  debugInfo.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0,0,0,0.8);
    color: white;
    padding: 10px 20px;
    border-radius: 8px;
    font-family: Arial, sans-serif;
    font-size: 14px;
    z-index: 999999;
    display: block;
  `;
  document.body.appendChild(debugInfo);
  debugInfo.textContent = `Testing video for word: ${word}`;
  
  // Create sign language container
  const container = document.createElement('div');
  container.id = 'sign-language-container';
  container.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 300px;
    height: 225px;
    background: rgba(0, 0, 0, 0.8);
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 999999;
    display: block;
    border: 2px solid white;
  `;
  document.body.appendChild(container);
  
  try {
    // Load the video
    const videoUrl = await loadVideo(word);
    if (!videoUrl) {
      console.error(`Failed to load video for word: ${word}`);
      debugInfo.textContent = `Failed to load video for: ${word}`;
      return;
    }
    
    // Create video element
    const videoElement = document.createElement('video');
    videoElement.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: contain;
        display: block;
      `;
    container.appendChild(videoElement);

    // Set up video
    videoElement.src = videoUrl;
    videoElement.muted = true;
    videoElement.playsInline = true;
    videoElement.controls = true;
    
    // Add event listeners
    videoElement.addEventListener('error', (e) => {
      console.error('Video error:', e);
      debugInfo.textContent = `Video error: ${e.target.error.message}`;
    });
    
    videoElement.addEventListener('loadeddata', () => {
      console.log('Video loaded successfully');
      debugInfo.textContent = `Video loaded: ${word}`;
    });
    
    // Try to play
    await videoElement.play();
    debugInfo.textContent = `Video playing: ${word}`;
    
    // Wait for video to end
    await new Promise((resolve) => {
      videoElement.onended = () => {
        console.log('Video ended normally');
        debugInfo.textContent = `Video completed: ${word}`;
        resolve();
      };
    });
    
    console.log('Test completed successfully');
  } catch (error) {
    console.error('Test error:', error);
    debugInfo.textContent = `Test error: ${error.message}`;
  }
}

// Function to test multiple videos in sequence
async function testMultipleVideos(words) {
  console.log('Testing multiple videos:', words);
  
  // Create debug info element
  const debugInfo = document.createElement('div');
  debugInfo.id = 'debug-info';
  debugInfo.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0,0,0,0.8);
    color: white;
    padding: 10px 20px;
    border-radius: 8px;
    font-family: Arial, sans-serif;
    font-size: 14px;
    z-index: 999999;
    display: block;
  `;
  document.body.appendChild(debugInfo);
  debugInfo.textContent = `Testing ${words.length} videos`;
  
  // Create sign language container
  const container = document.createElement('div');
  container.id = 'sign-language-container';
  container.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 300px;
    height: 225px;
    background: rgba(0, 0, 0, 0.8);
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 999999;
    display: block;
    border: 2px solid white;
  `;
  document.body.appendChild(container);
  
  // Process each word
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    debugInfo.textContent = `Testing video ${i+1}/${words.length}: ${word}`;
    
    try {
      // Load the video
      const videoUrl = await loadVideo(word);
      if (!videoUrl) {
        console.error(`Failed to load video for word: ${word}`);
        debugInfo.textContent = `Failed to load video for: ${word}, skipping...`;
        continue;
      }
      
      // Create video element
      const videoElement = document.createElement('video');
      videoElement.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: contain;
        display: block;
      `;
      container.innerHTML = '';
      container.appendChild(videoElement);
      
      // Set up video
      videoElement.src = videoUrl;
      videoElement.muted = true;
      videoElement.playsInline = true;
      videoElement.controls = true;
      
      // Add event listeners
      videoElement.addEventListener('error', (e) => {
        console.error('Video error:', e);
        debugInfo.textContent = `Video error: ${e.target.error.message}`;
      });
      
      videoElement.addEventListener('loadeddata', () => {
        console.log('Video loaded successfully');
        debugInfo.textContent = `Video loaded: ${word}`;
      });
      
      // Try to play
      await videoElement.play();
      debugInfo.textContent = `Video playing: ${word}`;
      
      // Wait for video to end
      await new Promise((resolve) => {
        videoElement.onended = () => {
          console.log('Video ended normally');
          debugInfo.textContent = `Video completed: ${word}`;
          resolve();
      };
    });

      console.log(`Test completed for: ${word}`);
    } catch (error) {
      console.error(`Test error for ${word}:`, error);
      debugInfo.textContent = `Test error for ${word}: ${error.message}`;
    }
  }
  
  debugInfo.textContent = `All tests completed`;
  console.log('All tests completed');
}

// Function to fix video playback issues
async function fixVideoPlayback(showContainer = false) {
  console.log('Fixing video playback issues...');
  
  // Create debug info element
  const debugInfo = document.createElement('div');
  debugInfo.id = 'debug-info';
  debugInfo.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0,0,0,0.8);
    color: white;
    padding: 10px 20px;
    border-radius: 8px;
    font-family: Arial, sans-serif;
    font-size: 14px;
    z-index: 999999;
    display: block;
  `;
  document.body.appendChild(debugInfo);
  debugInfo.textContent = 'Fixing video playback...';
  
  // Reset video queue and playing state
  videoQueue = [];
  isPlaying = false;
  
  // Clear video cache
  for (const url of videoCache.values()) {
    URL.revokeObjectURL(url);
  }
  videoCache.clear();
  
  // Only create and show the container if explicitly requested
  let container = null;
  if (showContainer) {
    // Create sign language container
    container = document.createElement('div');
    container.id = 'sign-language-container';
    container.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 300px;
      height: 225px;
      background: rgba(0, 0, 0, 0.8);
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 999999;
      display: block;
      border: 2px solid white;
    `;
    document.body.appendChild(container);
    
    // Test a few videos
    const testWords = ['accept', 'hello', 'thankyou'];
    debugInfo.textContent = `Testing ${testWords.length} videos...`;
    
    for (let i = 0; i < testWords.length; i++) {
      const word = testWords[i];
      debugInfo.textContent = `Testing video ${i+1}/${testWords.length}: ${word}`;
      
      try {
        // Load the video
        const videoUrl = await loadVideo(word);
        if (!videoUrl) {
          console.error(`Failed to load video for word: ${word}`);
          debugInfo.textContent = `Failed to load video for: ${word}, skipping...`;
          continue;
        }
        
        // Create video element
        const videoElement = document.createElement('video');
        videoElement.style.cssText = `
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
        `;
        container.innerHTML = '';
        container.appendChild(videoElement);
        
        // Set up video
        videoElement.src = videoUrl;
        videoElement.muted = true;
        videoElement.playsInline = true;
        videoElement.controls = true;
        
        // Add event listeners
        videoElement.addEventListener('error', (e) => {
          console.error('Video error:', e);
          debugInfo.textContent = `Video error: ${e.target.error.message}`;
        });
        
        videoElement.addEventListener('loadeddata', () => {
          console.log('Video loaded successfully');
          debugInfo.textContent = `Video loaded: ${word}`;
        });
        
        // Try to play
        await videoElement.play();
        debugInfo.textContent = `Video playing: ${word}`;
        
        // Wait for video to end
        await new Promise((resolve) => {
          videoElement.onended = () => {
            console.log('Video ended normally');
            debugInfo.textContent = `Video completed: ${word}`;
            resolve();
          };
        });
        
        console.log(`Test completed for: ${word}`);
      } catch (error) {
        console.error(`Test error for ${word}:`, error);
        debugInfo.textContent = `Test error for ${word}: ${error.message}`;
      }
    }
    
    debugInfo.textContent = `All tests completed. Video playback should now work correctly.`;
  } else {
    debugInfo.textContent = `Video playback system reset. No videos will be shown until translation is started.`;
  }
  
  console.log('Video playback fixed');
  
  // Update the global signLanguageContainer reference only if we created one
  if (container) {
    signLanguageContainer = container;
  }
  
  // Make the function available globally
  window.fixVideoPlayback = fixVideoPlayback;
}

// Function to test video loading
async function testVideoLoading(words) {
  console.log('Testing video loading for words:', words);
  
  // Create debug info element
  const debugInfo = document.createElement('div');
  debugInfo.id = 'test-debug-info';
  debugInfo.style.cssText = `
    position: fixed;
    bottom: 60px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0,0,0,0.8);
    color: white;
    padding: 10px 20px;
    border-radius: 8px;
    font-family: Arial, sans-serif;
    font-size: 14px;
    z-index: 999999;
    display: block;
  `;
  document.body.appendChild(debugInfo);
  
  // Create sign language container if it doesn't exist
  if (!signLanguageContainer) {
    signLanguageContainer = createSignLanguageContainer();
  }
  
  // Test each word
  for (const word of words) {
    debugInfo.textContent = `Testing: ${word}`;
    console.log(`\nTesting word: ${word}`);
    
    try {
      // Try to load the video
      const videoUrl = await loadVideo(word);
      if (!videoUrl) {
        console.error(`Failed to load video for ${word}`);
        debugInfo.textContent = `Failed: ${word}`;
        continue;
      }
      
      // Create video element
      const videoElement = document.createElement('video');
      videoElement.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: contain;
        display: block;
      `;
      
      // Clear container and add video
      signLanguageContainer.innerHTML = '';
      signLanguageContainer.appendChild(videoElement);
      
      // Set up video
      videoElement.src = videoUrl;
      videoElement.muted = true;
      videoElement.playsInline = true;
      videoElement.controls = true;
      
      // Wait for video to load
      await new Promise((resolve, reject) => {
        videoElement.onloadeddata = () => {
          console.log(`Video loaded for ${word} - Duration: ${videoElement.duration}s`);
          debugInfo.textContent = `Loaded: ${word} (${videoElement.duration.toFixed(1)}s)`;
          resolve();
        };
        
        videoElement.onerror = (e) => {
          console.error(`Error loading video for ${word}:`, e.target.error);
          debugInfo.textContent = `Error: ${word} - ${e.target.error ? e.target.error.message : 'Unknown error'}`;
          reject(e.target.error);
        };
        
        // Add timeout
        setTimeout(() => {
          if (!videoElement.duration) {
            const error = new Error('Video load timeout');
            console.error(`Timeout loading video for ${word}`);
            debugInfo.textContent = `Timeout: ${word}`;
            reject(error);
          }
        }, 5000);
      });
      
      // Try to play the video
      console.log(`Playing video for ${word}`);
      debugInfo.textContent = `Playing: ${word}`;
      await videoElement.play();
      
      // Wait for video to end
      await new Promise((resolve) => {
        videoElement.onended = () => {
          console.log(`Video completed for ${word}`);
          debugInfo.textContent = `Completed: ${word}`;
          resolve();
        };
        
        // Add timeout
        setTimeout(() => {
          if (!videoElement.ended) {
            console.log(`Video timeout for ${word} - forcing next`);
            debugInfo.textContent = `Timeout: ${word}`;
            resolve();
          }
        }, (videoElement.duration * 1000) + 5000);
      });
      
      // Wait a bit before next video
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`Error testing ${word}:`, error);
      debugInfo.textContent = `Error: ${word} - ${error.message}`;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('\nTesting completed');
  debugInfo.textContent = 'Testing completed';
  await new Promise(resolve => setTimeout(resolve, 2000));
  debugInfo.remove();
}

// Function to test sign language container visibility
function testSignLanguageContainer() {
  console.log('Testing sign language container visibility');
  
  // Create debug info element
  const debugInfo = document.createElement('div');
  debugInfo.id = 'debug-info';
  debugInfo.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0,0,0,0.8);
    color: white;
    padding: 10px 20px;
    border-radius: 8px;
    font-family: Arial, sans-serif;
    font-size: 14px;
    z-index: 999999;
    display: block;
  `;
  document.body.appendChild(debugInfo);
  debugInfo.textContent = 'Testing sign language container...';
  
  // Create or get sign language container
  signLanguageContainer = ensureSignLanguageContainerVisible();
  
  // Add a test video
  const videoContainer = document.getElementById('video-container');
  if (!videoContainer) {
    debugInfo.textContent = 'Error: Video container not found';
    return;
  }
  
  // Create a test video element
  const videoWrapper = document.createElement('div');
  videoWrapper.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    transition: opacity 0.3s ease-in-out;
    background-color: rgba(255, 0, 0, 0.5);
  `;
  
  const testText = document.createElement('div');
  testText.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: white;
    font-size: 24px;
    font-weight: bold;
    text-align: center;
  `;
  testText.textContent = 'Sign Language Container Test';
  
  videoWrapper.appendChild(testText);
  videoContainer.appendChild(videoWrapper);
  
  // Fade in the test element
  setTimeout(() => {
    videoWrapper.style.opacity = '1';
    debugInfo.textContent = 'Sign language container is visible';
  }, 100);
  
  // Remove test after 5 seconds
  setTimeout(() => {
    videoWrapper.remove();
    debugInfo.textContent = 'Test completed';
  }, 5000);
}

// Make functions available globally for debugging
window.processYouTubeCaptions = processYouTubeCaptions;
window.testWordPlayback = testWordPlayback;
window.testMultipleVideos = testMultipleVideos;
window.queueWord = queueWord;
window.fixVideoPlayback = fixVideoPlayback;
window.testVideoLoading = testVideoLoading;
window.testSignLanguageContainer = testSignLanguageContainer;