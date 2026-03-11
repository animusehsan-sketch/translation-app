// Configuration
const CONFIG = {
    EN: { code: 'en-US', lang: 'en' },
    FI: { code: 'fi-FI', lang: 'fi' }
};

// State
let isListening = false;
let currentMode = 'EN_TO_FI'; // Default: English to Finnish

// DOM Elements
const micBtn = document.getElementById('mic-btn');
const statusText = document.getElementById('status-text');
const inputText = document.getElementById('input-text');
const outputText = document.getElementById('output-text');
const toggle = document.getElementById('direction-toggle');
const langSrcLabel = document.getElementById('lang-src');
const langDestLabel = document.getElementById('lang-dest');

// Initialize Speech Recognition
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
        isListening = true;
        micBtn.classList.add('listening');
        statusText.textContent = "Listening...";
    };

    recognition.onend = () => {
        if (isListening) {
            recognition.start(); // Keep listening if we didn't manually stop
        } else {
            micBtn.classList.remove('listening');
            statusText.textContent = "Click to Start Listening";
        }
    };

    recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }

        if (finalTranscript) {
            inputText.textContent = finalTranscript;
            translateText(finalTranscript);
        } else if (interimTranscript) {
            inputText.textContent = interimTranscript;
        }
    };

    recognition.onerror = (event) => {
        console.error('Recognition error:', event.error);
        if (event.error === 'not-allowed') {
            statusText.textContent = "Permission Denied. Check Microphone settings.";
        }
    };
} else {
    statusText.textContent = "Speech Recognition not supported in this browser.";
    micBtn.disabled = true;
}

// Translation Function
async function translateText(text) {
    const srcLang = currentMode === 'EN_TO_FI' ? CONFIG.EN.lang : CONFIG.FI.lang;
    const destLang = currentMode === 'EN_TO_FI' ? CONFIG.FI.lang : CONFIG.EN.lang;

    try {
        outputText.textContent = "Translating...";

        // Using MyMemory API (Free, no key required for low volume)
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${srcLang}|${destLang}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.responseData && data.responseData.translatedText) {
            outputText.textContent = data.responseData.translatedText;
        } else {
            outputText.textContent = "Translation error. Please try again.";
        }
    } catch (error) {
        console.error('Translation error:', error);
        outputText.textContent = "Network error. Check connection.";
    }
}

// UI Handlers
micBtn.addEventListener('click', () => {
    if (!recognition) return;

    if (isListening) {
        isListening = false;
        recognition.stop();
    } else {
        updateRecognitionLang();
        recognition.start();
    }
});

toggle.addEventListener('change', () => {
    currentMode = toggle.checked ? 'FI_TO_EN' : 'EN_TO_FI';
    updateLabels();

    // If we're listening, restart recognition with new language
    if (isListening) {
        recognition.stop();
        setTimeout(() => {
            updateRecognitionLang();
            recognition.start();
        }, 100);
    }
});

function updateLabels() {
    if (currentMode === 'EN_TO_FI') {
        langSrcLabel.textContent = "English";
        langDestLabel.textContent = "Finnish";
        langSrcLabel.classList.add('active');
        langDestLabel.classList.remove('active');
    } else {
        langSrcLabel.textContent = "Finnish";
        langDestLabel.textContent = "English";
        langSrcLabel.classList.remove('active');
        langDestLabel.classList.add('active');
    }
}

function updateRecognitionLang() {
    recognition.lang = currentMode === 'EN_TO_FI' ? CONFIG.EN.code : CONFIG.FI.code;
}

// Initialize Labels
updateLabels();
