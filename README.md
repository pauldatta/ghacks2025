# Gemini Whisperer

An ambient, always on AI assistant that listens silently in the background and show contextual information on conversations and tasks While using our devices for tasks, learning through videos, or engaging in online conversations, we frequently seek additional details about specific topics.
Imagine an ever-present, ambient AI that anticipates your needs and offers relevant information or assistance proactively.
This would eliminate the need to switch between applications or windows, allowing for a smooth continuation of your current task or conversation.


## Key Features

- **Proactive Assistance:** AI is guided by system instructions to listen and offer information proactively.
- **Text-Based Interaction:** Primarily uses text for communication with the Gemini model.
- **Voice, Webcam, and Screen Share Inputs:** Supports user input via microphone, camera, and screen sharing.

## Prerequisites

- Modern web browser with WebRTC, WebSocket, and Web Audio API support.
- Google AI Studio API key for the Gemini API.
- Node.js and npm (for running the build script).
- A local HTTP server to run the bundled `index.html` file (e.g., `npx serve`, Python's `http.server`, or VS Code Live Server extension). This is necessary for `localStorage` access (API keys, settings).

## UI Overview

- **Controls:** Buttons/tabs for Audio (microphone), Webcam, and Screen Share allow you to manage your input streams.
- **Collapsible Chat/Input:** The main section for text input and viewing conversation history can be collapsed/expanded by clicking its header ("Conversation / Input"). It starts collapsed to encourage voice/media-first interaction.
- **Current Output:** A dedicated area shows the live, streaming response from Gemini. This content persists until a new response from Gemini begins.
- **Conversation History:** Below the text input (when expanded), a log of the conversation is maintained.

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

This project is licensed under the MIT License.
