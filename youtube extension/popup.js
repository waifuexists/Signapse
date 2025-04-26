document.addEventListener('DOMContentLoaded', function() {
  const translateBtn = document.getElementById('translateBtn');
  const statusDiv = document.getElementById('status');

  // Function to initialize translation
  async function initializeTranslation(tab) {
    if (!tab.url.includes('youtube.com/watch')) {
      showStatus('Please navigate to a YouTube video', 'error');
      return false;
    }

    try {
      // Send message to content script to start translation
      await chrome.tabs.sendMessage(tab.id, {
        action: 'toggleTranslation',
        enabled: true
      });

      return true;
    } catch (error) {
      console.error('Failed to initialize translation:', error);
      showStatus('Failed to initialize translation. Please refresh the page and try again.', 'error');
      return false;
    }
  }

  // Check current state
  chrome.storage.local.get(['translationEnabled'], function(result) {
    if (result.translationEnabled) {
      translateBtn.textContent = 'Disable Sign Language Translation';
      translateBtn.classList.add('enabled');
      showStatus('Translation is active', 'success');
    } else {
      translateBtn.textContent = 'Enable Sign Language Translation';
      translateBtn.classList.remove('enabled');
    }
  });

  // Handle button click
  translateBtn.addEventListener('click', async function() {
    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    const currentTab = tabs[0];

    chrome.storage.local.get(['translationEnabled'], async function(result) {
      const newState = !result.translationEnabled;
      
      if (newState) {
        // Enabling translation
        showStatus('Starting translation...', 'info');
        const success = await initializeTranslation(currentTab);
        if (!success) {
          showStatus('Failed to start translation', 'error');
          return;
        }
      }

      // Update state
      chrome.storage.local.set({translationEnabled: newState}, function() {
        // Send message to content script
        chrome.tabs.sendMessage(currentTab.id, {
          action: 'toggleTranslation',
          enabled: newState
        });

        // Update UI
        translateBtn.textContent = newState ? 
          'Disable Sign Language Translation' : 
          'Enable Sign Language Translation';
        translateBtn.classList.toggle('enabled', newState);
        
        if (newState) {
          showStatus('Translation enabled', 'success');
        } else {
          showStatus('Translation disabled', 'success');
        }
      });
    });
  });

  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
    if (type === 'error') {
      // Keep error messages visible longer
      setTimeout(() => {
        statusDiv.style.display = 'none';
      }, 5000);
    } else {
      setTimeout(() => {
        statusDiv.style.display = 'none';
      }, 3000);
    }
  }
});