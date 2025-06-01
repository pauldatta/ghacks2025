const fs = require('fs');
const path = require('path');

const HTML_INPUT_PATH = 'index.html';
const CSS_INPUT_PATH = 'css/styles.css';
const JS_BASE_DIR = 'js'; // Base directory for JS files listed in JS_FILE_ORDER
const AUDIO_WORKLET_PATH = 'js/audio/worklets/audio-processor.js';
const OUTPUT_DIR = 'dist';
const OUTPUT_HTML_PATH = path.join(OUTPUT_DIR, 'gemini_live_app.html');
// EVENT_EMITTER_CDN removed as we will inline the library

// Minimal EventEmitter UMD placeholder to avoid faulty minified code issues
const EVENT_EMITTER_UMD_CODE = `
(function(global) {
  'use strict';
  function EventEmitter() {
    this._events = Object.create(null); // Use Object.create(null) for a cleaner map
  }

  EventEmitter.prototype.on = function on(event, listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('The listener must be a function');
    }
    if (!this._events[event]) {
      this._events[event] = listener; // Store single listener
    } else if (typeof this._events[event] === 'function') {
      this._events[event] = [this._events[event], listener]; // Convert to array
    } else {
      this._events[event].push(listener); // Add to array
    }
    return this;
  };

  EventEmitter.prototype.emit = function emit(event) {
    let evt = this._events[event];
    if (!evt) {
      return false;
    }

    const args = Array.prototype.slice.call(arguments, 1);
    if (typeof evt === 'function') {
      evt.apply(this, args);
    } else {
      const listeners = evt.slice(); // Clone to avoid issues if listeners are modified during emit
      for (let i = 0; i < listeners.length; i++) {
        listeners[i].apply(this, args);
      }
    }
    return true;
  };

  // Add other methods like 'once', 'off', 'removeAllListeners' if they are used by the application.
  // For now, this minimal version covers 'on' and 'emit' which are commonly used.
  EventEmitter.prototype.addListener = EventEmitter.prototype.on;
  // Placeholder for other methods if needed:
  // EventEmitter.prototype.off = function(event, listener) { /* ... */ return this; };
  // EventEmitter.prototype.removeListener = EventEmitter.prototype.off;
  // EventEmitter.prototype.removeAllListeners = function(event) { /* ... */ return this; };
  // EventEmitter.prototype.once = function(event, listener) { /* ... */ return this; };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = EventEmitter;
  } else {
    global.EventEmitter3 = EventEmitter; // Expose as EventEmitter3 on window
  }
}(typeof window !== 'undefined' ? window : this));
`;

// Order is critical: from least dependent to most dependent (entry point last)
// This order needs careful manual verification based on actual imports.
const JS_FILE_ORDER = [
    'utils/utils.js',
    'dom/elements.js',
    'config/config.js',
    'settings/settings-template.js',
    'settings/settings-manager.js',
    'tools/google-search.js',
    'tools/tool-manager.js',
    'chat/chat-manager.js',
    'audio/recorder.js',
    'audio/streamer.js',
    'audio/visualizer.js',
    'camera/camera.js',
    'screen/screen.js',
    'ws/client.js',           // Uses global EventEmitter and utils.js
    'main/agent.js',
    'dom/events.js',
    'script.js'               // Main entry point
];

function readFileContent(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
        process.exit(1);
    }
}

function processJsContent(content, filePath) {
    console.log(`Processing JS file: ${filePath}`);
    // Remove local ES6 imports (e.g., import ... from './module.js';)
    let processedContent = content.replace(/import\s+.*?from\s+['"](\.\/|\.\.\/).*?['"];?\s*\n?/g, '');

    // Remove ES6 exports more comprehensively
    // 1. export default ... (anything until semicolon or end of line)
    processedContent = processedContent.replace(/^export\s+default\s+.*?(;|$)/gm, '');
    // 2. export { name1, name2 as alias, ... };
    processedContent = processedContent.replace(/^export\s*\{[\s\S]*?\}\s*(from\s*['"].*?['"])?;?\s*\n?/gm, '');
    // 3. export const/let/var/class/function name ...
    processedContent = processedContent.replace(/^export\s+(class|const|let|var|function)\s+/gm, '$1 ');
    // 4. export * from ...;
    processedContent = processedContent.replace(/^export\s*\*\s*from\s*['"].*?['"];?\s*\n?/gm, '');
    // 5. export * as name from ...; (less common but good to cover)
    processedContent = processedContent.replace(/^export\s*\*\s*as\s+\w+\s*from\s*['"].*?['"];?\s*\n?/gm, '');
    
    // Special handling for EventEmitter CDN import
    // For this script, we assume EventEmitter is loaded globally via a separate script tag.
    // So, remove any `import { EventEmitter } from 'https://...';`
    processedContent = processedContent.replace(/import\s+\{\s*EventEmitter\s*\}\s+from\s+['"]https:\/\/cdn\.skypack\.dev\/eventemitter3['"];?\s*\n?/g, '');


    // Add a comment indicating the original file path
    return `// Original file: ${filePath}\n${processedContent}\n\n`;
}

async function buildSingleHtmlFile() {
    console.log('Starting build process...');

    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    let htmlContent = readFileContent(HTML_INPUT_PATH);
    const cssContent = readFileContent(CSS_INPUT_PATH);
    const audioWorkletContent = readFileContent(AUDIO_WORKLET_PATH);

    // Inline CSS
    console.log('Inlining CSS...');
    htmlContent = htmlContent.replace(
        /<link\s+rel="stylesheet"\s+href="css\/styles\.css">/,
        `<style>\n${cssContent}\n</style>`
    );

    // Concatenate and process JS files
    console.log('Processing JavaScript files...');
    let allJsContent = '';
    for (const jsFile of JS_FILE_ORDER) {
        const fullJsPath = path.join(JS_BASE_DIR, jsFile);
        const jsContent = readFileContent(fullJsPath);
        allJsContent += processJsContent(jsContent, fullJsPath);
    }
    
    // Prepare audio worklet code for inlining
    const audioWorkletString = JSON.stringify(audioWorkletContent)
        .replace(/\\n/g, '\\n') // Keep newlines escaped for the string
        .slice(1, -1); // Remove surrounding quotes from JSON.stringify

    // Note: workletLoaderCode was removed from here. Its logic is integrated below.
    
    // Prepare the main application code block that will go inside startGeminiLiveApp
    let mainAppCodeInner = `'use strict';\n`;
    // EventEmitter UMD code will be prepended to the entire script block, defining window.EventEmitter3
    mainAppCodeInner += `if (typeof window.EventEmitter3 === 'undefined') {\n`;
    mainAppCodeInner += `    console.error('ERROR: EventEmitter3 global not found even after inlining. Build script or UMD code might be faulty.');\n`;
    mainAppCodeInner += `    return;\n`;
    mainAppCodeInner += `}\n`;
    mainAppCodeInner += `const EventEmitter = window.EventEmitter3;\n\n`;

    // Define workletURL in a scope accessible by the concatenated JS
    mainAppCodeInner += `let workletURL = ''; // Define in higher scope for addModule\n`;
    mainAppCodeInner += `try {\n`;
    mainAppCodeInner += `    const audioWorkletCodeString = \`${audioWorkletContent.replace(/`/g, '\\`')}\`;\n`;
    mainAppCodeInner += `    const workletBlob = new Blob([audioWorkletCodeString], { type: 'application/javascript' });\n`;
    mainAppCodeInner += `    workletURL = URL.createObjectURL(workletBlob);\n`; // Assign to higher-scoped variable
    mainAppCodeInner += `    console.log('AudioWorklet Blob URL created:', workletURL);\n`;
    mainAppCodeInner += `} catch (e) {\n`;
    mainAppCodeInner += `    console.error('Error setting up audio worklet blob:', e);\n`;
    mainAppCodeInner += `}\n\n`;
    
    // Append the concatenated application scripts (which will be processed for addModule replacement)
    let processedAppScripts = allJsContent; 
    processedAppScripts = processedAppScripts.replace(
        /audioContext\.audioWorklet\.addModule\s*\(\s*['"]js\/audio\/worklets\/audio-processor\.js['"]\s*\)/g,
        "audioContext.audioWorklet.addModule(workletURL)" // Now uses the higher-scoped workletURL
    );
    mainAppCodeInner += processedAppScripts;

    // Prepend the EventEmitter UMD code, then wrap mainAppCodeInner in startGeminiLiveApp and add load listener
    allJsContent = `${EVENT_EMITTER_UMD_CODE}\n\nfunction startGeminiLiveApp() {\n${mainAppCodeInner}\n}\nwindow.addEventListener('load', startGeminiLiveApp);`;
    
    // Inline JavaScript
    console.log('Inlining JavaScript...');
    // Replace the module script tag with a regular script tag containing all JS
    // No separate CDN script tag needed now for EventEmitter
    htmlContent = htmlContent.replace(
        /<script\s+type="module"\s+src="js\/script\.js"><\/script>/,
        `<script>\n${allJsContent}\n</script>`
    );

    fs.writeFileSync(OUTPUT_HTML_PATH, htmlContent);
    console.log(`Build successful! Output file: ${OUTPUT_HTML_PATH}`);
}

buildSingleHtmlFile().catch(error => {
    console.error('Build process failed:', error);
    process.exit(1);
});
