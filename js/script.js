import { GeminiAgent } from './main/agent.js';
import { getConfig, getWebsocketUrl, MODEL_SAMPLE_RATE } from './config/config.js';

import { GoogleSearchTool } from './tools/google-search.js'; // Keep import if other tools might be added later
import { ToolManager } from './tools/tool-manager.js';
import { ChatManager } from './chat/chat-manager.js';
import settingsManager from './settings/settings-manager.js'; // Import settingsManager
import { setupEventListeners, showConnectButton, showDisconnectButton, setupNewUIEventListeners } from './dom/events.js'; // Added setupNewUIEventListeners
import elements from './dom/elements.js'; // Import elements for listening indicator

const url = getWebsocketUrl();
// const config = getConfig(); // getConfig will now be called by the agent

const toolManager = new ToolManager();
// toolManager.registerTool('googleSearch', new GoogleSearchTool()); // Commented out to prioritize server-side Google Search

const chatManager = new ChatManager();

const geminiAgent = new GeminiAgent({
    url,
    getConfigFunc: getConfig, // Pass the getConfig function itself
    modelSampleRate: MODEL_SAMPLE_RATE,
    toolManager,
    chatManager // Pass chatManager instance
});

// Handle chat-related events
geminiAgent.on('transcription', (transcript) => {
    chatManager.updateStreamingMessage(transcript);
});

geminiAgent.on('text_sent', (text) => {
    chatManager.finalizeStreamingMessage();
    chatManager.addUserMessage(text);
});

geminiAgent.on('interrupted', () => {
    chatManager.finalizeStreamingMessage();
    if (!chatManager.lastUserMessageType) {
        chatManager.addUserAudioMessage();
    }
});

geminiAgent.on('turn_complete', () => {
    chatManager.finalizeStreamingMessage();
});

geminiAgent.on('listening_started', () => {
    if (elements.listeningIndicator) {
        elements.listeningIndicator.classList.remove('hidden');
    }
});

geminiAgent.on('listening_stopped', () => {
    if (elements.listeningIndicator) {
        elements.listeningIndicator.classList.add('hidden');
    }
});

// Initial setup based on API key presence
const apiKey = localStorage.getItem('apiKey');
if (!apiKey) {
    console.log("No API key found. Displaying Connect button and prompting for settings.");
    showConnectButton();
    // Optionally, automatically show settings if no API key
    // settingsManager.show(); 
} else {
    console.log("API key found. Attempting to connect.");
    geminiAgent.connect().then(() => {
        showDisconnectButton(); // Show disconnect if connect is successful
        console.log("Agent connected successfully on load.");
    }).catch(error => {
        console.error("Failed to connect on load with existing API key:", error);
        showConnectButton(); // Show connect if auto-connect fails
        // Optionally, notify user or show settings
        // alert("Failed to connect with the saved API key. Please check your settings.");
        // settingsManager.show();
    });
}

setupEventListeners(geminiAgent);
setupNewUIEventListeners(); // Call to setup new UI interactions

// Capture console logs for the modal
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleInfo = console.info;

const logHistory = [];
const MAX_LOG_ENTRIES = 200; // Keep up to 200 log entries

function formatLogMessage(args, type) {
    const timestamp = new Date().toLocaleTimeString();
    const message = args.map(arg => {
        if (typeof arg === 'object' && arg !== null) {
            try {
                return JSON.stringify(arg, null, 2);
            } catch (e) {
                return '[Unserializable Object]';
            }
        }
        return String(arg);
    }).join(' ');
    return `<span class="log-timestamp">[${timestamp}]</span> <span class="log-type-${type}">${type.toUpperCase()}:</span> <span class="log-message">${message}</span>`;
}

function addToLogHistory(formattedMessage) {
    logHistory.push(formattedMessage);
    if (logHistory.length > MAX_LOG_ENTRIES) {
        logHistory.shift(); // Remove the oldest entry
    }
    if (elements.logOutput && elements.logModal && !elements.logModal.classList.contains('hidden')) {
        elements.logOutput.innerHTML = logHistory.join('<br>');
        elements.logOutput.scrollTop = elements.logOutput.scrollHeight; // Auto-scroll to bottom
    }
}

console.log = (...args) => {
    originalConsoleLog.apply(console, args);
    addToLogHistory(formatLogMessage(args, 'log'));
};

console.error = (...args) => {
    originalConsoleError.apply(console, args);
    addToLogHistory(formatLogMessage(args, 'error'));
};

console.warn = (...args) => {
    originalConsoleWarn.apply(console, args);
    addToLogHistory(formatLogMessage(args, 'warn'));
};

console.info = (...args) => {
    originalConsoleInfo.apply(console, args);
    addToLogHistory(formatLogMessage(args, 'info'));
};

// Add event listener to populate log output when modal is opened
if (elements.logBtn) {
    elements.logBtn.addEventListener('click', () => {
        if (elements.logOutput) {
            elements.logOutput.innerHTML = logHistory.join('<br>');
            elements.logOutput.scrollTop = elements.logOutput.scrollHeight;
        }
    });
}
