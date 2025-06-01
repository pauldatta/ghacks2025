// DOM elements object
const elements = {
    // Button elements
    disconnectBtn: document.getElementById('disconnectBtn'),
    connectBtn: document.getElementById('connectBtn'),
    micBtn: document.getElementById('micBtn'),
    cameraBtn: document.getElementById('cameraBtn'),
    screenBtn: document.getElementById('screenBtn'),
    settingsBtn: document.getElementById('settingsBtn'),
    logBtn: document.getElementById('logBtn'), // Added log button
    helpBtn: document.getElementById('helpBtn'), // Added help button

    // Indicator element
    listeningIndicator: document.getElementById('listeningIndicator'),

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
    closeHelpModalBtn: document.getElementById('closeHelpModalBtn'), // Added close help modal button

    // Log Modal elements
    logModal: document.getElementById('logModal'),
    closeLogModalBtn: document.getElementById('closeLogModalBtn'),
    logOutput: document.getElementById('logOutput'),

    // Whisperer Mode Toggle
    whispererModeToggle: document.getElementById('whispererModeToggle'),
    appModeStatus: document.getElementById('appModeStatus'), // Span to show current mode

    // Verbal Cue Hint
    verbalCueHint: document.getElementById('verbalCueHint')
};

export default elements;
