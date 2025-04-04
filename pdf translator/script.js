let currentWordIndex = 0;
let words = [];
let isPlaying = false;
let nextVideoPreloaded = null;
let shouldStop = false;
let availableVideos = new Set();
let videoCache = new Map();

const videoElement = document.getElementById('hiddenVideo');
const canvasElement = document.getElementById('outputCanvas');
const statusElement = document.getElementById('status');
const textDisplayElement = document.getElementById('textDisplay');
const canvasCtx = canvasElement.getContext('2d');

// Initialize MediaPipe Hands with improved settings
const hands = new Hands({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }
});

hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 0, // Use simpler model for better performance
    minDetectionConfidence: 0.5, // Lower threshold for better detection
    minTrackingConfidence: 0.5
});

// Process hands and draw landmarks
hands.onResults(onResults);

function onResults(results) {
    // Clear canvas
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.fillStyle = 'black';
    canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);

    if (results.multiHandLandmarks) {
        for (const landmarks of results.multiHandLandmarks) {
            // Draw hand landmarks with improved visibility
            drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, 
                { color: '#00FF00', lineWidth: 3 });
            drawLandmarks(canvasCtx, landmarks, 
                { color: '#FF0000', lineWidth: 2, radius: 4 });
        }
    }
}

async function preloadVideo(word) {
    if (videoCache.has(word)) {
        return videoCache.get(word);
    }

    const videoPath = `${word}.mp4`;
    try {
        const response = await fetch(videoPath);
        if (!response.ok) return null;
        
        const video = document.createElement('video');
        video.src = videoPath;
        video.muted = true; // Remove audio
        video.playbackRate = 2.0; // Set 2x speed
        
        // Wait for video to be loaded
        await new Promise((resolve, reject) => {
            video.onloadedmetadata = resolve;
            video.onerror = reject;
        });
        
        videoCache.set(word, video);
        return video;
    } catch (error) {
        return null;
    }
}

async function preloadNextVideo() {
    if (currentWordIndex + 1 >= words.length) return null;
    
    const nextWord = words[currentWordIndex + 1];
    if (!availableVideos.has(nextWord)) return null;
    
    return await preloadVideo(nextWord);
}

function processVideo() {
    if (videoElement.paused || videoElement.ended || shouldStop) return;
    
    // Ensure video is playing and not ended
    if (videoElement.readyState >= 2) {
        try {
            hands.send({ image: videoElement }).then(() => {
                if (!videoElement.paused && !videoElement.ended && !shouldStop) {
                    requestAnimationFrame(processVideo);
                } else if (videoElement.ended && !shouldStop) {
                    // Immediately play next video if preloaded
                    currentWordIndex++;
                    playNextWord();
                }
            }).catch(error => {
                console.error('Error processing video:', error);
                requestAnimationFrame(processVideo);
            });
        } catch (error) {
            console.error('Error in processVideo:', error);
            requestAnimationFrame(processVideo);
        }
    } else {
        requestAnimationFrame(processVideo);
    }
}

function stopInterpretation() {
    shouldStop = true;
    isPlaying = false;
    videoElement.pause();
    statusElement.textContent = 'Interpretation stopped';
    
    // Clear canvas
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.fillStyle = 'black';
    canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);
    
    // Remove active highlighting
    updateTextDisplay();
}

async function startInterpretation() {
    const textInput = document.getElementById('textInput').value.trim();
    if (!textInput) {
        statusElement.textContent = 'Please enter some text';
        return;
    }

    // Reset state
    shouldStop = false;
    currentWordIndex = 0;
    isPlaying = true;
    
    // Split text into words and convert to lowercase
    words = textInput.toLowerCase().split(/\s+/);
    
    // Check which videos are available and preload them
    availableVideos.clear();
    statusElement.textContent = 'Loading videos...';
    
    for (const word of words) {
        const video = await preloadVideo(word);
        if (video) {
            availableVideos.add(word);
        }
    }
    
    // Update text display with available/missing indicators
    updateTextDisplay();
    
    statusElement.textContent = 'Processing...';
    playNextWord();
}

function updateTextDisplay() {
    textDisplayElement.innerHTML = words.map((word, index) => {
        const isAvailable = availableVideos.has(word);
        const isActive = index === currentWordIndex;
        const classes = ['word'];
        if (isActive) classes.push('active');
        if (!isAvailable) classes.push('missing');
        return `<span class="${classes.join(' ')}">${word}</span>`;
    }).join(' ');
}

async function playNextWord() {
    if (shouldStop || !isPlaying || currentWordIndex >= words.length) {
        if (!shouldStop) {
            isPlaying = false;
            statusElement.textContent = 'Interpretation complete';
        }
        return;
    }

    const currentWord = words[currentWordIndex];
    
    // Skip words without videos
    if (!availableVideos.has(currentWord)) {
        currentWordIndex++;
        playNextWord();
        return;
    }

    try {
        // Get preloaded video
        const video = await preloadVideo(currentWord);
        if (!video) {
            currentWordIndex++;
            playNextWord();
            return;
        }

        // Start preloading next video
        nextVideoPreloaded = await preloadNextVideo();

        // Set up video element
        videoElement.src = video.src;
        videoElement.muted = true;
        videoElement.playbackRate = 2.0;

        // Reset video to start
        videoElement.currentTime = 0;

        videoElement.onloadedmetadata = () => {
            if (!shouldStop) {
                videoElement.play().then(() => {
                    processVideo();
                }).catch(error => {
                    console.error('Error playing video:', error);
                    currentWordIndex++;
                    playNextWord();
                });
            }
        };
        
        videoElement.onended = () => {
            if (shouldStop) return;
            
            // Clear canvas before next video
            canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
            canvasCtx.fillStyle = 'black';
            canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);
            
            currentWordIndex++;
            playNextWord();
        };

        statusElement.textContent = `Playing: ${currentWord}`;
    } catch (error) {
        statusElement.textContent = `Error playing video for word: ${currentWord}`;
        currentWordIndex++;
        playNextWord();
    }
}

// Add keyboard shortcuts
document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.ctrlKey) {
        startInterpretation();
    } else if (event.key === 'Escape') {
        stopInterpretation();
    }
}); 