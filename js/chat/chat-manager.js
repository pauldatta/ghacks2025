export class ChatManager {
    constructor() {
        this.chatContainer = document.getElementById('chatHistory');
        this.currentStreamingMessage = null;
        this.lastUserMessageType = null; // 'text' or 'audio'
        this.currentTranscript = ''; // Add this to store accumulated transcript
    }

    _escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') {
            return unsafe;
        }
        // Corrected HTML entity replacements
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }

    addUserMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message user-message';
        messageDiv.textContent = text;
        this.chatContainer.appendChild(messageDiv);
        this.lastUserMessageType = 'text';
        this.scrollToBottom();
    }

    addUserAudioMessage() {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message user-audio-info-message'; // Changed class
        messageDiv.textContent = 'User sent audio';
        this.chatContainer.appendChild(messageDiv);
        this.lastUserMessageType = 'audio';
        this.scrollToBottom();
    }

    startModelMessage() {
        // If there's already a streaming message, finalize it first
        if (this.currentStreamingMessage) {
            this.finalizeStreamingMessage();
        }

        // If no user message was shown yet, show audio message
        if (!this.lastUserMessageType) {
            this.addUserAudioMessage();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message model-message streaming';
        this.chatContainer.appendChild(messageDiv);
        this.currentStreamingMessage = messageDiv;
        this.currentTranscript = ''; // Reset transcript when starting new message
        this.scrollToBottom();
    }

    updateStreamingMessage(text) {
        if (!this.currentStreamingMessage) {
            this.startModelMessage();
        }
        // Trim leading space if currentTranscript is empty and text starts with space
        if (this.currentTranscript === '' && text.startsWith(' ')) {
            text = text.substring(1);
        }
        this.currentTranscript += text; // Append new text to the transcript (removed leading space)

        // Basic Markdown to HTML conversion
        let displayHtml = this.currentTranscript;
        const codeBlocks = [];

        // 1. Temporarily replace inline code content with placeholders and escape it
        displayHtml = displayHtml.replace(/`(.*?)`/g, (match, codeContent) => {
            codeBlocks.push(this._escapeHtml(codeContent));
            return `___CODEBLOCK_${codeBlocks.length - 1}___`;
        });

        // 2. Process other markdown (bold, italic, links) on displayHtml
        // Bold: **text** or __text__
        displayHtml = displayHtml.replace(/\*\*(.*?)\*\*|__(.*?)__/g, '<strong>$1$2</strong>');
        // Italic: *text* or _text_ (ensure it doesn't conflict with bold)
        displayHtml = displayHtml.replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)|(?<!_)_(?!_)(.*?)(?<!_)_(?!_)/g, '<em>$1$2</em>');
        // Links: [text](url)
        displayHtml = displayHtml.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
        
        // 3. Convert newlines (that are not part of code blocks)
        displayHtml = displayHtml.replace(/\n/g, '<br>');

        // 4. Restore code blocks
        displayHtml = displayHtml.replace(/___CODEBLOCK_(\d+)___/g, (match, index) => {
            return `<code>${codeBlocks[parseInt(index)]}</code>`;
        });

        this.currentStreamingMessage.innerHTML = displayHtml; // Use innerHTML
        this.scrollToBottom();
    }

    finalizeStreamingMessage() {
        if (this.currentStreamingMessage) {
            // Potentially apply more complex Markdown once full message is received
            // For now, the streaming conversion handles basic cases.
            this.currentStreamingMessage.classList.remove('streaming');
            this.currentStreamingMessage = null;
            this.lastUserMessageType = null;
            this.currentTranscript = ''; // Reset transcript when finalizing
        }
    }

    scrollToBottom() {
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }

    clear() {
        this.chatContainer.innerHTML = '';
        this.currentStreamingMessage = null;
        this.lastUserMessageType = null;
        this.currentTranscript = '';
    }
}
