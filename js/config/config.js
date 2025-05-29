export const getWebsocketUrl = () => {
    const apiKey = localStorage.getItem('apiKey');
    return `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;
};

export const getDeepgramApiKey = () => {
    return localStorage.getItem('deepgramApiKey') || '';
};

// Audio Configurations
export const MODEL_SAMPLE_RATE = parseInt(localStorage.getItem('sampleRate')) || 27000;

const thresholds = {
    0: "BLOCK_NONE",
    1: "BLOCK_ONLY_HIGH",
    2: "BLOCK_MEDIUM_AND_ABOVE",
    3: "BLOCK_LOW_AND_ABOVE"
}

export const getConfig = () => ({
    model: 'models/gemini-2.0-flash-live-001', // Changed to user's specified model for text mode
    generationConfig: {
        temperature: parseFloat(localStorage.getItem('temperature')) || 1.8,
        top_p: parseFloat(localStorage.getItem('top_p')) || 0.95,
        top_k: parseInt(localStorage.getItem('top_k')) || 65,
        responseModalities: ["TEXT"], // Ensuring text mode
        // speechConfig removed to ensure pure text mode and avoid voice extraction errors
    },
    systemInstruction: {
        parts: [{
            text: "You are a proactive AI assistant. Your primary role is to silently listen to the user and identify opportunities to provide helpful information or perform relevant actions using available tools, such as Google Search. When you detect a relevant topic or an implicit need based on the user's ongoing conversation or statements, proactively offer concise and useful content, search results, or tool outputs. Strive to be helpful without being intrusive, anticipating the user's needs for information or actions \
            Verbal cues are:\
            1. Let me check \
            2. Let me see \
            3. What about \
            4. Would it help \
            Try and only respond with a result when you hear this, do not speak or reply if you do not hear these verbal cues or wait for user confirmation for you to look online or use a tool, just execute and show the result\
            respond with a <silent> when you think no action is needed\
            "
        }]
    },
    tools: [ // Changed to an array to specify built-in Google Search
        { "googleSearch": {} } 
        // Any custom function declarations will be added by GeminiAgent constructor
    ]
});
