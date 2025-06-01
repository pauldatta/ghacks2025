const SILENT_VARIATIONS = ["<silent>", "silent>", "<silent", "<", ">"];

export class ChatManager {
    constructor() {
        this.chatHistoryContainer = document.getElementById('chatHistory'); // Renamed for clarity
        this.geminiOutputArea = document.getElementById('geminiOutputArea'); // New element for streaming output
        
        this.currentStreamingTranscript = ''; // For the live output area
        this.lastFinalizedMarkdown = ''; // To store the last complete raw markdown
        this.lastUserMessageType = null; // 'text' or 'audio'
        
        if (!this.chatHistoryContainer) {
            console.error("Chat history container #chatHistory not found!");
        }
        if (!this.geminiOutputArea) {
            console.error("Gemini output area #geminiOutputArea not found!");
        }

        // Configure marked.js to handle line breaks like GitHub Flavored Markdown
        if (typeof marked !== 'undefined') {
            marked.setOptions({
                breaks: true, // Convert single newlines in markdown to <br>
                gfm: true       // Enable GitHub Flavored Markdown
            });
        } else {
            console.warn('marked.js is not loaded. Markdown rendering will be basic.');
        }
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

    // Creates a styled list item for the conversation history
    _createHistoryEntry(sender, htmlContent, type = 'general') {
        if (!this.chatHistoryContainer) return;

        const entryDiv = document.createElement('div');
        // Basic styling; Tailwind classes from mockup are preferred if this were a direct li
        // For now, using simple classes that can be styled via css/styles.css or Tailwind if applied to #chatHistory children
        entryDiv.classList.add('history-entry', `history-entry-${type}`); // e.g., history-entry-user, history-entry-model
        
        let prefix = '';
        if (sender === 'User') {
            prefix = '<strong class="text-blue-600">User:</strong> ';
            entryDiv.classList.add('text-right', 'my-1'); // Align user messages to right
        } else if (sender === 'Agent') {
            prefix = '<strong class="text-green-600">Agent:</strong> ';
            entryDiv.classList.add('text-left', 'my-1'); // Align agent messages to left
        } else { // System/Info
            prefix = `<strong class="text-gray-500">${sender}:</strong> `;
            entryDiv.classList.add('text-center', 'text-sm', 'text-gray-500', 'my-1');
        }

        entryDiv.innerHTML = `${prefix}${htmlContent}`;
        this.chatHistoryContainer.appendChild(entryDiv);
        this.scrollToHistoryBottom();
    }

    addUserMessage(text) {
        if (!this.chatHistoryContainer) return;
        this._createHistoryEntry('User', this._escapeHtml(text), 'user');
        this.lastUserMessageType = 'text';
        // Do NOT clear geminiOutputArea here.
        this.scrollToHistoryBottom();
    }

    addUserAudioMessage() {
        if (!this.chatHistoryContainer) return;
        const messageDiv = document.createElement('div');
        messageDiv.className = 'text-center italic text-gray-500 text-sm py-2 my-1'; 
        messageDiv.textContent = 'User sent audio';
        this.chatHistoryContainer.appendChild(messageDiv);
        this.lastUserMessageType = 'audio';
        this.scrollToHistoryBottom();
        // Do NOT clear geminiOutputArea here.
    }

    startModelMessage() {
        // This method is called when a new model turn is expected.
        // If there's an unfinished stream in geminiOutputArea, finalize it to history.
        if (this.currentStreamingTranscript) {
            const finalHtml = this.geminiOutputArea ? this.geminiOutputArea.innerHTML : this.currentStreamingTranscript;
            const indicator = this.geminiOutputArea ? this.geminiOutputArea.querySelector('.streaming-indicator') : null;
            if (indicator) indicator.remove();
            
            let historyHtml = this.geminiOutputArea ? this.geminiOutputArea.innerHTML : this.currentStreamingTranscript; // Use rendered HTML if possible
            const streamingIndicatorHtml = '<span class="streaming-indicator">▋</span>';
            if (historyHtml.endsWith(streamingIndicatorHtml)) {
                historyHtml = historyHtml.substring(0, historyHtml.length - streamingIndicatorHtml.length);
            }

            if (this.currentStreamingTranscript.trim() && !SILENT_VARIATIONS.includes(this.currentStreamingTranscript.trim().toLowerCase())) {
                this._createHistoryEntry('Agent', historyHtml, 'model');
            }
        }
        // Do NOT clear geminiOutputArea here. It will be cleared by updateStreamingMessage
        // if a new *displayable* message part arrives.
        this.currentStreamingTranscript = ''; // Reset for the new potential message stream.
    }

    updateStreamingMessage(text) {
        if (!this.geminiOutputArea) return;

        const trimmedText = text.trim();
        const lcTrimmedText = trimmedText.toLowerCase();
        // const silentVariations = ["<silent>", "silent>", "<silent", "<", ">"]; // Moved to module scope
        const isSilentCommand = SILENT_VARIATIONS.includes(lcTrimmedText);

        if (isSilentCommand) {
            console.log(`Received silent-like command from model, ignoring for display: "${text}"`);
            // If it's a silent command, and it's the only thing received so far in this stream,
            // we don't want to clear the output area yet.
            // If other text follows, that will handle clearing.
            // If this is ALL that comes for this turn, finalize will handle not clearing.
            return; 
        }
        
        // If we received non-silent text, and it's the start of a new stream:
        if (this.currentStreamingTranscript === '') { 
            this.geminiOutputArea.innerHTML = ''; // Clear previous content for the new message
        }
        
        // Trim leading space only for the very first part of the actual displayable transcript
        if (this.currentStreamingTranscript === '' && text.startsWith(' ')) {
            text = text.substring(1);
        }
        this.currentStreamingTranscript += text;

        if (typeof marked === 'undefined') {
            console.error('marked.js is not loaded. Displaying raw text.');
            // Fallback to simple text display, escaping HTML to be safe if setting innerHTML.
            // Or use innerText for maximum safety if no HTML is intended.
            this.geminiOutputArea.innerText = this.currentStreamingTranscript; 
            // Consider adding indicator back if using innerHTML and styling allows
        } else {
            // Use marked.parse for rendering.
            // marked.js handles HTML escaping for markdown syntax by default.
            // The 'breaks: true' option set in constructor handles newlines.
            let parsedHtml = marked.parse(this.currentStreamingTranscript);
            this.geminiOutputArea.innerHTML = parsedHtml + '<span class="streaming-indicator">▋</span>';
        }
    }

    finalizeStreamingMessage() {
        if (this.geminiOutputArea) {
            const indicator = this.geminiOutputArea.querySelector('.streaming-indicator');
            if (indicator) indicator.remove();
        }

        const finalTranscript = this.currentStreamingTranscript.trim();
        const lcFinalTranscript = finalTranscript.toLowerCase();
        // Use the same silent variations check for final transcript
        const isEffectivelySilent = finalTranscript === '' || SILENT_VARIATIONS.includes(lcFinalTranscript);

        if (finalTranscript && !isEffectivelySilent && this.geminiOutputArea && this.geminiOutputArea.innerHTML) {
            // Use the already rendered HTML from geminiOutputArea (which includes Markdown)
            // but ensure no trailing streaming indicator is part of the history entry.
            let historyHtml = this.geminiOutputArea.innerHTML;
            const streamingIndicatorHtml = '<span class="streaming-indicator">▋</span>';
            if (historyHtml.endsWith(streamingIndicatorHtml)) {
                historyHtml = historyHtml.substring(0, historyHtml.length - streamingIndicatorHtml.length);
            }
            this._createHistoryEntry('Agent', historyHtml, 'model');
        }
        
        // Do NOT clear geminiOutputArea here. It persists until a new stream starts.
        
        if (finalTranscript && !isEffectivelySilent) {
            this.lastFinalizedMarkdown = finalTranscript; // Store the raw markdown
        }

        this.currentStreamingTranscript = ''; // Crucial: reset for the next stream.
        this.lastUserMessageType = null; 
    }

    scrollToHistoryBottom() {
        if (!this.chatHistoryContainer) return;
        this.chatHistoryContainer.scrollTop = this.chatHistoryContainer.scrollHeight;
    }

    clear() {
        if (this.chatHistoryContainer) this.chatHistoryContainer.innerHTML = '';
        if (this.geminiOutputArea) this.geminiOutputArea.innerHTML = '';
        this.currentStreamingTranscript = '';
        this.lastFinalizedMarkdown = ''; // Clear stored markdown
        this.lastUserMessageType = null;
    }
}
