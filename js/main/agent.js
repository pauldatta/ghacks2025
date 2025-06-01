/**
 * Core application class that orchestrates the interaction between various components
 * of the Gemini 2 Live API. Manages audio streaming, WebSocket communication, audio transcription,
 * and coordinates the overall application functionality.
 */
import { GeminiWebsocketClient } from '../ws/client.js';

import { AudioRecorder } from '../audio/recorder.js';
import { AudioStreamer } from '../audio/streamer.js';
import { AudioVisualizer } from '../audio/visualizer.js';

import { CameraManager } from '../camera/camera.js';
import { ScreenManager } from '../screen/screen.js';

export class GeminiAgent{
    constructor({
        name = 'GeminiAgent',
        url,
        getConfigFunc, // Changed from static config to a function
        transcribeModelsSpeech = true,
        transcribeUsersSpeech = false,
        modelSampleRate = 24000,
        toolManager = null,
        chatManager = null // Added chatManager
    } = {}) {
        if (!url) throw new Error('WebSocket URL is required');
        if (!getConfigFunc) throw new Error('getConfigFunc is required');

        this.initialized = false;
        this.connected = false;
        this.getConfigFunc = getConfigFunc; // Store the function
        this.chatManager = chatManager; // Store chatManager instance

        // For audio components
        this.audioContext = null;
        this.audioRecorder = null;
        this.audioStreamer = null;
        
        // For transcribers
        this.transcribeModelsSpeech = transcribeModelsSpeech;
        this.transcribeUsersSpeech = transcribeUsersSpeech;
        this.modelSampleRate = modelSampleRate;

        // Initialize screen & camera settings
        this.fps = localStorage.getItem('fps') || '5';
        this.captureInterval = 1000 / this.fps;
        this.resizeWidth = localStorage.getItem('resizeWidth') || '640';
        this.quality = localStorage.getItem('quality') || '0.4';
        
        // Initialize camera
        this.cameraManager = new CameraManager({
            width: this.resizeWidth,
            quality: this.quality,
            facingMode: localStorage.getItem('facingMode') || 'environment'
        });
        this.cameraInterval = null;

        // Initialize screen sharing
        this.screenManager = new ScreenManager({
            width: this.resizeWidth,
            quality: this.quality,
            onStop: () => {
                // Clean up interval and emit event when screen sharing stops
                if (this.screenInterval) {
                    clearInterval(this.screenInterval);
                    this.screenInterval = null;
                }
                // Emit screen share stopped event
                this.emit('screenshare_stopped');
            }
        });
        this.screenInterval = null;
        
        // Add function declarations to config
        this.toolManager = toolManager;
        // We'll get the current config when needed, but tool setup might need an initial config.
        // For now, let's assume tool setup in constructor uses an initial fetch of config.
        // This part might need refinement if tool declarations depend on dynamic config aspects
        // not available at construction.
        let initialConfig = this.getConfigFunc(); // Get initial config for tool setup
        if (initialConfig.tools && Array.isArray(initialConfig.tools)) {
            const customFunctionDeclarations = this.toolManager.getToolDeclarations() || [];
            if (customFunctionDeclarations.length > 0) {
                let funcDeclToolEntry = initialConfig.tools.find(tool => tool.hasOwnProperty('functionDeclarations'));
                if (funcDeclToolEntry && Array.isArray(funcDeclToolEntry.functionDeclarations)) {
                    funcDeclToolEntry.functionDeclarations.push(...customFunctionDeclarations);
                } else {
                    initialConfig.tools.push({ functionDeclarations: customFunctionDeclarations });
                }
            }
        } else {
            console.warn('initialConfig.tools is not an array. Setting up default for functionDeclarations.');
            initialConfig.tools = [{ functionDeclarations: this.toolManager.getToolDeclarations() || [] }];
        }
        // Note: this.config is no longer stored as a persistent agent property.
        // It's fetched fresh in connect(). The initialConfig here is just for constructor-time setup.

        this.name = name;
        this.url = url;
        this.client = null;
    }

    setupEventListeners() {
        // Handle incoming audio data from the model
        this.client.on('audio', async (data) => {
            try {
                if (!this.audioStreamer.isInitialized) {
                    this.audioStreamer.initialize();
                }
                this.audioStreamer.streamAudio(new Uint8Array(data));

            } catch (error) {
                throw new Error('Audio processing error:' + error);
            }
        });

        // Handle model interruptions by stopping audio playback
        this.client.on('interrupted', () => {
            this.audioStreamer.stop();
            this.audioStreamer.isInitialized = false;
            this.emit('interrupted');
        });

        // Add an event handler when the model finishes speaking if needed
        this.client.on('turn_complete', () => {
            console.info('Model finished speaking');
            this.emit('turn_complete');
        });

        this.client.on('tool_call', async (toolCall) => {
            await this.handleToolCall(toolCall);
        });

        // Handle incoming text content from the model
        this.client.on('content', (data) => {
            console.log('GeminiAgent received content event:', JSON.stringify(data, null, 2));
            if (this.chatManager && data.modelTurn && data.modelTurn.parts) {
                let textFoundInEvent = false;
                data.modelTurn.parts.forEach(part => {
                    console.log('GeminiAgent processing part:', JSON.stringify(part, null, 2));
                    if (part.text) {
                        console.log('GeminiAgent found text in part:', part.text);
                        this.chatManager.updateStreamingMessage(part.text);
                        textFoundInEvent = true;
                    } else {
                        console.log('GeminiAgent: part does not contain text property.', part);
                    }
                });
                if (!textFoundInEvent) {
                    console.log('GeminiAgent: No text found in any parts of this content event.');
                }
            } else {
                let reason = [];
                if (!this.chatManager) reason.push("chatManager is missing");
                if (!data.modelTurn) reason.push("data.modelTurn is missing");
                else if (!data.modelTurn.parts) reason.push("data.modelTurn.parts is missing");
                console.log(`GeminiAgent: Cannot process content event because: ${reason.join(', ')}.`);
            }
        });
    }
        
    // TODO: Handle multiple function calls
    async handleToolCall(toolCall) {
        const functionCall = toolCall.functionCalls[0];
        const response = await this.toolManager.handleToolCall(functionCall);
        await this.client.sendToolResponse(response);
    }

    /**
     * Connects to the Gemini API using the GeminiWebsocketClient.connect() method.
     * Fetches the latest configuration before connecting.
     */
    async connect() {
        const currentConfig = this.getConfigFunc(); // Get the latest config
        // If tool declarations need to be merged every time, do it here with currentConfig
        // For simplicity, assuming tool declarations merged at construction are sufficient,
        // or that getConfigFunc already returns a fully prepared config including tools.
        // If dynamic tool changes are needed per connection, the logic from constructor
        // for merging tool declarations would need to be replicated here with currentConfig.

        this.client = new GeminiWebsocketClient(this.name, this.url, currentConfig);
        await this.client.connect();
        this.setupEventListeners();
        this.connected = true;
    }

    /**
     * Sends a text message to the Gemini API.
     * @param {string} text - The text message to send.
     */
    async sendText(text) {
        await this.client.sendText(text);
        this.emit('text_sent', text);
    }

    /**
     * Starts camera capture and sends images at regular intervals
     */
    async startCameraCapture() {
        if (!this.connected) {
            throw new Error('Must be connected to start camera capture');
        }

        try {
            await this.cameraManager.initialize();
            
            // Set up interval to capture and send images
            this.cameraInterval = setInterval(async () => {
                const imageBase64 = await this.cameraManager.capture();
                this.client.sendImage(imageBase64);                
            }, this.captureInterval);
            
            console.info('Camera capture started');
        } catch (error) {
            await this.disconnect();
            throw new Error('Failed to start camera capture: ' + error);
        }
    }

    /**
     * Stops camera capture and cleans up resources
     */
    async stopCameraCapture() {
        if (this.cameraInterval) {
            clearInterval(this.cameraInterval);
            this.cameraInterval = null;
        }
        
        if (this.cameraManager) {
            this.cameraManager.dispose();
        }
        
        console.info('Camera capture stopped');
    }

    /**
     * Starts screen sharing and sends screenshots at regular intervals
     */
    async startScreenShare() {
        if (!this.connected) {
            throw new Error('Websocket must be connected to start screen sharing');
        }

        try {
            await this.screenManager.initialize();
            
            // Set up interval to capture and send screenshots
            this.screenInterval = setInterval(async () => {
                const imageBase64 = await this.screenManager.capture();
                this.client.sendImage(imageBase64);
            }, this.captureInterval);
            
            console.info('Screen sharing started');
        } catch (error) {
            await this.stopScreenShare();
            throw new Error('Failed to start screen sharing: ' + error);
        }
    }

    /**
     * Stops screen sharing and cleans up resources
     */
    async stopScreenShare() {
        if (this.screenInterval) {
            clearInterval(this.screenInterval);
            this.screenInterval = null;
        }
        
        if (this.screenManager) {
            this.screenManager.dispose();
        }
        
        console.info('Screen sharing stopped');
    }

    /**
     * Gracefully terminates all active connections and streams.
     * Ensures proper cleanup of audio, screen sharing, and WebSocket resources.
     */
    async disconnect() {
        try {
            // Stop camera capture first
            await this.stopCameraCapture();

            // Stop screen sharing
            await this.stopScreenShare();

            // Cleanup audio resources in correct order
            if (this.audioRecorder) {
                this.audioRecorder.stop();
                this.audioRecorder = null;
            }

            // Cleanup audio visualizer before audio context
            if (this.visualizer) {
                this.visualizer.cleanup();
                this.visualizer = null;
            }

            // Clean up audio streamer before closing context
            if (this.audioStreamer) {
                this.audioStreamer.stop();
                this.audioStreamer = null;
            }

            // Finally close audio context
            if (this.audioContext) {
                await this.audioContext.close();
                this.audioContext = null;
            }

            // Cleanup WebSocket
            this.client.disconnect();
            this.client = null;
            this.initialized = false;
            this.connected = false;
            
            console.info('Disconnected and cleaned up all resources');
        } catch (error) {
            throw new Error('Disconnect error:' + error);
        }
    }

    /**
     * Initiates audio recording from the microphone.
     * Streams audio data to the model in real-time, handling interruptions
     */
    async initialize() {
        console.log('[AgentInitialize] Method entered.'); // New log
        try {
            console.log('[AgentInitialize] Try block entered.'); // New log
            // Initialize audio components
            this.audioContext = new AudioContext();
            this.audioStreamer = new AudioStreamer(this.audioContext);
            this.audioStreamer.initialize();
            this.visualizer = new AudioVisualizer(this.audioContext, 'visualizer');
            this.audioStreamer.gainNode.connect(this.visualizer.analyser);
            this.visualizer.start();
            this.audioRecorder = new AudioRecorder();
            
            console.warn('Deepgram transcription disabled');
            
            this.initialized = true;
            console.info(`${this.client.name} initialized successfully`);
            this.client.sendText('.');  // Trigger the model to start speaking first
        } catch (error) {
            console.error('Initialization error:', error);
            throw new Error('Error during the initialization of the client: ' + error.message);
        }
    }

    async startRecording() {
        // Start recording with callback to send audio data to websocket and transcriber
        await this.audioRecorder.start(async (audioData) => {
            try {
                this.client.sendAudio(audioData);
            } catch (error) {
                console.error('Error sending audio data:', error);
                this.audioRecorder.stop();
            }
        });
    }

    /**
     * Toggles the microphone state between active and suspended
     */
    async toggleMic() {
        if (!this.audioRecorder.stream) {
            await this.startRecording();
            return;
        }
        await this.audioRecorder.toggleMic();
    }           

    // Add event emitter functionality
    on(eventName, callback) {
        if (!this._eventListeners) {
            this._eventListeners = new Map();
        }
        if (!this._eventListeners.has(eventName)) {
            this._eventListeners.set(eventName, []);
        }
        this._eventListeners.get(eventName).push(callback);
    }

    emit(eventName, data) {
        if (!this._eventListeners || !this._eventListeners.has(eventName)) {
            return;
        }
        for (const callback of this._eventListeners.get(eventName)) {
            callback(data);
        }
    }
}
