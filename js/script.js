import { GeminiAgent } from './main/agent.js';
import { getConfig, getWebsocketUrl, getDeepgramApiKey, MODEL_SAMPLE_RATE } from './config/config.js';

import { GoogleSearchTool } from './tools/google-search.js'; // Keep import if other tools might be added later
import { ToolManager } from './tools/tool-manager.js';
import { ChatManager } from './chat/chat-manager.js';
import settingsManager from './settings/settings-manager.js'; // Import settingsManager
import { setupEventListeners, showConnectButton, showDisconnectButton } from './dom/events.js';

const url = getWebsocketUrl();
const config = getConfig(); // getConfig reads from localStorage, so API key is implicitly checked by getWebsocketUrl
const deepgramApiKey = getDeepgramApiKey();

const toolManager = new ToolManager();
// toolManager.registerTool('googleSearch', new GoogleSearchTool()); // Commented out to prioritize server-side Google Search

const chatManager = new ChatManager();

const geminiAgent = new GeminiAgent({
    url,
    config,
    deepgramApiKey,
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
