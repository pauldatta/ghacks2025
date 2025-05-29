// DOM elements object
const elements = {
    // Button elements
    disconnectBtn: document.getElementById('disconnectBtn'),
    connectBtn: document.getElementById('connectBtn'),
    micBtn: document.getElementById('micBtn'),
    cameraBtn: document.getElementById('cameraBtn'),
    screenBtn: document.getElementById('screenBtn'),
    settingsBtn: document.getElementById('settingsBtn'),
    helpBtn: document.getElementById('helpBtn'), // Added help button

    // Preview elements
    cameraPreview: document.getElementById('cameraPreview'),
    screenPreview: document.getElementById('screenPreview'),

    // Text input elements
    messageInput: document.getElementById('messageInput'),
    sendBtn: document.getElementById('sendBtn'),

    // Visualizer canvas
    visualizerCanvas: document.getElementById('visualizer'),

    // Help Modal elements
    helpModal: document.getElementById('helpModal'), // Added help modal
    closeHelpModalBtn: document.getElementById('closeHelpModalBtn') // Added close help modal button
};

export default elements;
