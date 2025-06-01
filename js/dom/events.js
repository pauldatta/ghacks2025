import elements from './elements.js';
import settingsManager from '../settings/settings-manager.js';
import { getAppMode, isWhispererActive } from '../config/config.js'; // Import for app mode

/**
 tore * Updates UI to show disconnect button and hide connect button
 */
export const showDisconnectButton = () => { // Added export
    elements.connectBtn.style.display = 'none';
    elements.disconnectBtn.style.display = 'block';
};

/**
 * Updates UI to show connect button and hide disconnect button
 */
export const showConnectButton = () => { // Added export
    elements.disconnectBtn.style.display = 'none';
    elements.connectBtn.style.display = 'block';
};

let isCameraActive = false;
let isMicActive = false; // Added for microphone state

/**
 * Ensures the agent is connected and initialized
 * @param {GeminiAgent} agent - The main application agent instance
 * @returns {Promise<void>}
 */
const ensureAgentReady = async (agent) => {
    if (!agent.connected) {
        await agent.connect();
        showDisconnectButton();
    }
    if (!agent.initialized) {
        await agent.initialize();
    }
};

/**
 * Sets up event listeners for the application's UI elements
 * @param {GeminiAgent} agent - The main application agent instance
 */
export function setupEventListeners(agent) {
    console.log('[SetupEvents] elements.sendBtn:', elements.sendBtn); // New log
    // Disconnect handler
    elements.disconnectBtn.addEventListener('click', async () => {
        try {
            await agent.disconnect();
            showConnectButton();
            [elements.cameraBtn, elements.screenBtn, elements.micBtn].forEach(btn => {
                btn.classList.remove('active');
                btn.classList.add('inactive'); // Ensure inactive state is set
            });
            elements.listeningIndicator.classList.add('hidden');
            isCameraActive = false;
            isMicActive = false; // Reset mic state
            // isScreenShareActive is handled by its own event listener for 'screenshare_stopped'
        } catch (error) {
            console.error('Error disconnecting:', error);
        }
    });

    // Connect handler
    elements.connectBtn.addEventListener('click', async () => {
        const apiKey = localStorage.getItem('apiKey');
        if (!apiKey) {
            alert("Please set your Gemini API Key in settings (⚙️) first.");
            settingsManager.show(); // Open settings for the user
            return; 
        }
        try {
            // API key exists, proceed with connection attempt
            await ensureAgentReady(agent); 
            // ensureAgentReady calls agent.connect() which will use the key,
            // and then showDisconnectButton() on successful connection within ensureAgentReady.
        } catch (error) {
            console.error('Error connecting:', error);
            // ensureAgentReady might not have switched buttons if connect itself failed.
            showConnectButton(); // Ensure connect button is shown if connection failed
            alert(`Failed to connect. Please check your API key and network connection. Error: ${error.message}`);
            settingsManager.show(); // Show settings again for convenience
        }
    });

    // Microphone toggle handler
    elements.micBtn.addEventListener('click', async () => {
        try {
            await ensureAgentReady(agent);
            console.log(`[MicBtn] Attempting to toggle microphone. Current isMicActive: ${isMicActive}. Current classes: ${elements.micBtn.className}`);
            await agent.toggleMic(); // Call the method, ignore its undefined return
            isMicActive = !isMicActive; // Toggle local state
            console.log(`[MicBtn] agent.toggleMic() called. New isMicActive: ${isMicActive}`);
            
            elements.micBtn.classList.toggle('active', isMicActive);
            elements.micBtn.classList.toggle('inactive', !isMicActive);
            elements.listeningIndicator.classList.toggle('hidden', !isMicActive);
            
            console.log(`[MicBtn] Microphone toggle processed. New classes: ${elements.micBtn.className}. Listening indicator hidden: ${elements.listeningIndicator.classList.contains('hidden')}`);
        } catch (error) {
            console.error('[MicBtn] Error toggling microphone:', error);
            // Fallback UI state on error
            isMicActive = false; // Reset state on error
            elements.micBtn.classList.remove('active');
            elements.micBtn.classList.add('inactive');
            elements.listeningIndicator.classList.add('hidden');
            console.log('[MicBtn] Error occurred. Classes set to inactive. isMicActive reset to false.');
        }
    });

    // Camera toggle handler
    elements.cameraBtn.addEventListener('click', async () => {
        try {
            await ensureAgentReady(agent);
            
            if (!isCameraActive) {
                await agent.startCameraCapture();
                elements.cameraBtn.classList.add('active');
                elements.cameraBtn.classList.remove('inactive');
            } else {
                await agent.stopCameraCapture();
                elements.cameraBtn.classList.remove('active');
                elements.cameraBtn.classList.add('inactive');
            }
            isCameraActive = !isCameraActive;
        } catch (error) {
            console.error('Error toggling camera:', error);
            elements.cameraBtn.classList.remove('active');
            elements.cameraBtn.classList.add('inactive');
            isCameraActive = false;
        }
    });

    // Screen sharing handler
    let isScreenShareActive = false;
    
    // Listen for screen share stopped events (from native browser controls)
    agent.on('screenshare_stopped', () => {
        elements.screenBtn.classList.remove('active');
        elements.screenBtn.classList.add('inactive');
        isScreenShareActive = false;
        console.info('Screen share stopped');
    });

    elements.screenBtn.addEventListener('click', async () => {
        try {
            await ensureAgentReady(agent);
            
            if (!isScreenShareActive) {
                await agent.startScreenShare();
                elements.screenBtn.classList.add('active');
                elements.screenBtn.classList.remove('inactive');
            } else {
                await agent.stopScreenShare();
                elements.screenBtn.classList.remove('active');
                elements.screenBtn.classList.add('inactive');
            }
            isScreenShareActive = !isScreenShareActive;
        } catch (error) {
            console.error('Error toggling screen share:', error);
            elements.screenBtn.classList.remove('active');
            elements.screenBtn.classList.add('inactive');
            isScreenShareActive = false;
        }
    });

    // Message sending handlers
    const sendMessage = async () => {
        console.log('[SendMessage] Entered sendMessage function.'); // New log
        try {
            await ensureAgentReady(agent);
            const text = elements.messageInput.value.trim();
            await agent.sendText(text);
            elements.messageInput.value = '';
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    elements.sendBtn.addEventListener('click', sendMessage);
    elements.messageInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            sendMessage();
        }
    });

    // Settings button click
    elements.settingsBtn.addEventListener('click', () => settingsManager.show());

    // Log button click
    if (elements.logBtn && elements.logModal && elements.closeLogModalBtn) {
        elements.logBtn.addEventListener('click', () => {
            elements.logModal.classList.remove('hidden');
            // Optionally, populate logs here or have a live update mechanism
        });

        elements.closeLogModalBtn.addEventListener('click', () => {
            elements.logModal.classList.add('hidden');
        });

        elements.logModal.addEventListener('click', (event) => {
            if (event.target === elements.logModal) {
                elements.logModal.classList.add('hidden');
            }
        });
    } else {
        console.warn('Log modal elements not found, log functionality might not work.');
    }

    // Initial state for control buttons
    [elements.cameraBtn, elements.screenBtn].forEach(btn => {
        btn.classList.add('inactive'); // Start as inactive
        btn.classList.remove('active');
    });
    // Mic button initial state based on isMicActive (which is false initially)
    elements.micBtn.classList.toggle('active', isMicActive);
    elements.micBtn.classList.toggle('inactive', !isMicActive);
    elements.listeningIndicator.classList.toggle('hidden', !isMicActive); // Hide listening indicator initially

    setupAppModeToggle(agent); // Initialize the app mode toggle
}

/**
 * Sets up the event listener and initial state for the app mode toggle.
 * @param {GeminiAgent} agent - The main application agent instance
 */
function setupAppModeToggle(agent) {
    if (!elements.whispererModeToggle || !elements.verbalCueHint || !elements.appModeStatus) {
        console.warn('App mode toggle, verbal cue hint, or app mode status element not found.');
        return;
    }

    const updateModeUI = (isWhisperer) => {
        if (isWhisperer) {
            elements.verbalCueHint.textContent = 'Hint: In Whisperer mode, use phrases like "Let me check...", "Let me see...", "What about...", "Would it help if..." for proactive help.';
            elements.appModeStatus.textContent = 'Whisperer';
        } else {
            elements.verbalCueHint.textContent = 'Hint: In Live mode, all conversation will be responded to.';
            elements.appModeStatus.textContent = 'Live';
        }
    };

    // Set initial state of the toggle, hint, and status label
    const initialModeIsWhisperer = isWhispererActive();
    elements.whispererModeToggle.checked = initialModeIsWhisperer;
    updateModeUI(initialModeIsWhisperer);

    elements.whispererModeToggle.addEventListener('change', async (event) => {
        const isChecked = event.target.checked; // true for Whisperer, false for Live
        const newMode = isChecked ? 'whisperer' : 'live';
        localStorage.setItem('appMode', newMode);
        updateModeUI(isChecked);
        console.log(`App mode changed to: ${newMode}. Reconnecting WebSocket...`);

        try {
            if (agent.connected) {
                await agent.disconnect();
                showConnectButton();
                [elements.cameraBtn, elements.screenBtn, elements.micBtn].forEach(btn => {
                    btn.classList.remove('active');
                    btn.classList.add('inactive');
                });
                elements.listeningIndicator.classList.add('hidden');
                isCameraActive = false;
                isMicActive = false;
            }

            await agent.connect();
            showDisconnectButton();

        } catch (error) {
            console.error('Error during WebSocket reconnection for app mode toggle:', error);
            showConnectButton();
            alert(`Failed to reconnect for app mode change. Please check your settings. Error: ${error.message}`);
            // Revert UI and localStorage if connection fails
            const previousModeIsWhisperer = !isChecked; // The mode it was before the failed attempt
            localStorage.setItem('appMode', previousModeIsWhisperer ? 'whisperer' : 'live');
            elements.whispererModeToggle.checked = previousModeIsWhisperer;
            updateModeUI(previousModeIsWhisperer);
        }
    });
}

// Initialize settings
settingsManager;

export function setupNewUIEventListeners() {
    // JavaScript for collapsible chat section
    const chatToggle = document.querySelector('.chat-section-toggle');
    const chatContent = document.getElementById('chatBoxContent');
    const chatToggleIcon = document.getElementById('chatToggleIcon');
    
    if (chatToggle && chatContent && chatToggleIcon) {
        // Start with chat hidden as per requirement "collapsible so its hidden"
        chatContent.classList.remove('expanded'); // Ensure it's not expanded by default
        chatToggleIcon.textContent = '▼'; // Set initial icon state

        chatToggle.addEventListener('click', () => {
            chatContent.classList.toggle('expanded');
            if (chatContent.classList.contains('expanded')) {
                chatToggleIcon.textContent = '▲';
            } else {
                chatToggleIcon.textContent = '▼';
            }
        });
    } else {
        console.warn('Chat toggle elements not found, collapsible chat UI might not work.');
    }

    // Help Modal listeners
    if (elements.helpBtn && elements.helpModal && elements.closeHelpModalBtn) {
        elements.helpBtn.addEventListener('click', () => {
            elements.helpModal.classList.remove('hidden');
        });

        elements.closeHelpModalBtn.addEventListener('click', () => {
            elements.helpModal.classList.add('hidden');
        });

        // Click on overlay (the modal backdrop itself) to close
        elements.helpModal.addEventListener('click', (event) => {
            if (event.target === elements.helpModal) { // Ensure click is on backdrop, not content
                elements.helpModal.classList.add('hidden');
            }
        });
    } else {
        console.warn('Help modal elements not found, help functionality might not work.');
    }
}
