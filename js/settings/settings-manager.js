import { settingsTemplate } from './settings-template.js';

class SettingsManager {
    constructor() {
        this.initializeElements();
        this.setupEventListeners();
        this.loadSettings();
    }

    initializeElements() {
        // Create settings dialog and overlay
        this.dialog = document.createElement('div');
        this.dialog.className = 'settings-dialog';
        this.dialog.innerHTML = settingsTemplate;

        this.overlay = document.createElement('div');
        this.overlay.className = 'settings-overlay';

        // Add to document
        document.body.appendChild(this.dialog);
        document.body.appendChild(this.overlay);

        // Cache DOM elements
        this.elements = {
            dialog: this.dialog,
            overlay: this.overlay,
            apiKeyInput: this.dialog.querySelector('#apiKey'),
            // deepgramApiKeyInput removed
            voiceSelect: this.dialog.querySelector('#voice'),
            sampleRateInput: this.dialog.querySelector('#sampleRate'),
            sampleRateValue: this.dialog.querySelector('#sampleRateValue'),
            systemInstructionsToggle: this.dialog.querySelector('#systemInstructionsToggle'),
            systemInstructionsContent: this.dialog.querySelector('#systemInstructions').parentElement,
            systemInstructionsInput: this.dialog.querySelector('#systemInstructions'),
            screenCameraToggle: this.dialog.querySelector('#screenCameraToggle'),
            screenCameraContent: this.dialog.querySelector('#screenCameraToggle + .collapsible-content'),
            fpsInput: this.dialog.querySelector('#fps'),
            fpsValue: this.dialog.querySelector('#fpsValue'),
            resizeWidthInput: this.dialog.querySelector('#resizeWidth'),
            resizeWidthValue: this.dialog.querySelector('#resizeWidthValue'),
            qualityInput: this.dialog.querySelector('#quality'),
            qualityValue: this.dialog.querySelector('#qualityValue'),
            advancedToggle: this.dialog.querySelector('#advancedToggle'),
            advancedContent: this.dialog.querySelector('#advancedToggle + .collapsible-content'),
            temperatureInput: this.dialog.querySelector('#temperature'),
            temperatureValue: this.dialog.querySelector('#temperatureValue'),
            topPInput: this.dialog.querySelector('#topP'),
            topPValue: this.dialog.querySelector('#topPValue'),
            topKInput: this.dialog.querySelector('#topK'),
            topKValue: this.dialog.querySelector('#topKValue'),
            // safetyToggle and related elements removed
            saveBtn: this.dialog.querySelector('#settingsSaveBtn')
        };
    }

    setupEventListeners() {
        // Close settings when clicking overlay
        this.overlay.addEventListener('click', () => this.hide());

        // Prevent dialog close when clicking inside dialog
        this.dialog.addEventListener('click', (e) => e.stopPropagation());

        // Save settings
        this.elements.saveBtn.addEventListener('click', () => {
            this.saveSettings();
            this.hide();
            window.location.reload();
        });

        // Toggle collapsible sections
        this.elements.systemInstructionsToggle.addEventListener('click', () => {
            this.toggleCollapsible(this.elements.systemInstructionsToggle, this.elements.systemInstructionsContent);
        });

        this.elements.advancedToggle.addEventListener('click', () => {
            this.toggleCollapsible(this.elements.advancedToggle, this.elements.advancedContent);
        });

        this.elements.screenCameraToggle.addEventListener('click', () => {
            this.toggleCollapsible(this.elements.screenCameraToggle, this.elements.screenCameraContent);
        });

        // safetyToggle event listener removed

        // Add input listeners for real-time value updates
        const inputElements = [
            'sampleRateInput', 'temperatureInput', 'topPInput', 'topKInput',
            'fpsInput', 'resizeWidthInput', 'qualityInput' // safety inputs removed
        ];

        inputElements.forEach(elementName => {
            this.elements[elementName].addEventListener('input', () => this.updateDisplayValues());
        });
    }

    loadSettings() {
        // Load values from localStorage
        this.elements.apiKeyInput.value = localStorage.getItem('apiKey') || '';
        // deepgramApiKeyInput loading removed
        this.elements.voiceSelect.value = localStorage.getItem('voiceName') || 'Aoede';
        this.elements.sampleRateInput.value = localStorage.getItem('sampleRate') || '27000';
        this.elements.systemInstructionsInput.value = localStorage.getItem('systemInstructions') || 'You are a helpful assistant';
        this.elements.temperatureInput.value = localStorage.getItem('temperature') || '1.8';
        this.elements.topPInput.value = localStorage.getItem('top_p') || '0.95';
        this.elements.topKInput.value = localStorage.getItem('top_k') || '65';

        // Initialize screen & camera settings
        this.elements.fpsInput.value = localStorage.getItem('fps') || '1';
        this.elements.resizeWidthInput.value = localStorage.getItem('resizeWidth') || '640';
        this.elements.qualityInput.value = localStorage.getItem('quality') || '0.3';

        // Initialize safety settings removed

        this.updateDisplayValues();
    }

    saveSettings() {
        localStorage.setItem('apiKey', this.elements.apiKeyInput.value);
        // deepgramApiKey saving removed
        localStorage.setItem('voiceName', this.elements.voiceSelect.value);
        localStorage.setItem('sampleRate', this.elements.sampleRateInput.value);
        localStorage.setItem('systemInstructions', this.elements.systemInstructionsInput.value);
        localStorage.setItem('temperature', this.elements.temperatureInput.value);
        localStorage.setItem('top_p', this.elements.topPInput.value);
        localStorage.setItem('top_k', this.elements.topKInput.value);
        
        // Save screen & camera settings
        localStorage.setItem('fps', this.elements.fpsInput.value);
        localStorage.setItem('resizeWidth', this.elements.resizeWidthInput.value);
        localStorage.setItem('quality', this.elements.qualityInput.value);

        // Save safety settings removed
    }

    updateDisplayValues() {
        this.elements.sampleRateValue.textContent = this.elements.sampleRateInput.value + ' Hz';
        this.elements.temperatureValue.textContent = this.elements.temperatureInput.value;
        this.elements.topPValue.textContent = this.elements.topPInput.value;
        this.elements.topKValue.textContent = this.elements.topKInput.value;
        this.elements.fpsValue.textContent = this.elements.fpsInput.value + ' FPS';
        this.elements.resizeWidthValue.textContent = this.elements.resizeWidthInput.value + 'px';
        this.elements.qualityValue.textContent = this.elements.qualityInput.value;
        // Safety value display updates removed
    }

    // getThresholdLabel method can be removed as it's no longer used
    // getThresholdLabel(value) {
    //     const labels = {
    //         '0': 'None',
    //         '1': 'Low',
    //         '2': 'Medium',
    //         '3': 'High'
    //     };
    //     return labels[value] || value;
    // }

    toggleCollapsible(toggle, content) {
        const isActive = content.classList.contains('active');
        content.classList.toggle('active');
        toggle.textContent = toggle.textContent.replace(isActive ? '▼' : '▲', isActive ? '▲' : '▼');
    }

    show() {
        this.dialog.classList.add('active');
        this.overlay.classList.add('active');
    }

    hide() {
        this.dialog.classList.remove('active');
        this.overlay.classList.remove('active');
    }
}

const settingsManager = new SettingsManager();
export default settingsManager;
