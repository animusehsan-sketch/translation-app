// Configuration
const CONFIG = {
    EN: { code: 'en-US', lang: 'en', name: 'English' },
    FI: { code: 'fi-FI', lang: 'fi', name: 'Finnish' },
    FA: { code: 'fa-IR', lang: 'fa', name: 'Persian' },
    DE: { code: 'de-DE', lang: 'de', name: 'German' },
    RU: { code: 'ru-RU', lang: 'ru', name: 'Russian' }
};

// State
let isListening = false;
let currentMode = 'EN_TO_FI'; // Default: English to Finnish
let debounceTimer;

// DOM Elements
const micBtn = document.getElementById('mic-btn');
const statusText = document.getElementById('status-text');
const inputText = document.getElementById('input-text');
const outputText = document.getElementById('output-text');
const srcSelect = document.getElementById('source-lang-select');
const destSelect = document.getElementById('dest-lang-select');
const swapBtn = document.getElementById('swap-btn');
const speakInputBtn = document.getElementById('speak-input');
const speakOutputBtn = document.getElementById('speak-output');
const clearBtn = document.getElementById('clear-btn');
const autoSpeakToggle = document.getElementById('auto-speak');
const pronunciationText = document.getElementById('pronunciation-text');
const webcamElement = document.getElementById('webcam');
const liveSubtitle = document.getElementById('live-subtitle');

// Initialize Webcam
async function initWebcam() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        webcamElement.srcObject = stream;
    } catch (err) {
        console.error("Error accessing webcam: ", err);
        liveSubtitle.textContent = "Webcam access denied";
    }
}

initWebcam();

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
            inputText.value = finalTranscript;
            liveSubtitle.textContent = finalTranscript;
            translateText(finalTranscript);
        } else if (interimTranscript) {
            inputText.value = interimTranscript;
            liveSubtitle.textContent = interimTranscript;
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
    const srcLang = CONFIG[srcSelect.value].lang;
    const destLang = CONFIG[destSelect.value].lang;

    // Handle RTL
    updateRTL();

    try {
        outputText.textContent = "Translating...";

        // Using MyMemory API (Free, no key required for low volume)
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${srcLang}|${destLang}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.responseData && data.responseData.translatedText) {
            const translation = data.responseData.translatedText;
            outputText.textContent = translation;
            liveSubtitle.textContent = translation; // Show translation as subtitle
            
            // Handle Transliteration for RU and FA
            updateTransliteration(translation, destLang);

            // Auto-speak if enabled
            if (autoSpeakToggle.checked) {
                speak(translation, CONFIG[destSelect.value].code);
            }
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

srcSelect.addEventListener('change', () => {
    handleLanguageChange();
});

destSelect.addEventListener('change', () => {
    handleLanguageChange();
});

swapBtn.addEventListener('click', () => {
    const temp = srcSelect.value;
    srcSelect.value = destSelect.value;
    destSelect.value = temp;
    handleLanguageChange();
});

function handleLanguageChange() {
    updateRTL();
    
    // Re-translate current text if present
    if (inputText.value.trim()) {
        translateText(inputText.value);
    }

    // If we're listening, restart recognition with new language
    if (isListening) {
        recognition.stop();
        setTimeout(() => {
            updateRecognitionLang();
            recognition.start();
        }, 100);
    }
}

function updateRTL() {
    // Add RTL class if the language is Persian
    if (srcSelect.value === 'FA') {
        inputText.classList.add('rtl-text');
    } else {
        inputText.classList.remove('rtl-text');
    }

    if (destSelect.value === 'FA') {
        outputText.classList.add('rtl-text');
    } else {
        outputText.classList.remove('rtl-text');
    }
}

function updateRecognitionLang() {
    recognition.lang = CONFIG[srcSelect.value].code;
}

// Text-to-Speech
function speak(text, langCode) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;
    window.speechSynthesis.speak(utterance);
}

// Action Button Listeners
speakInputBtn.addEventListener('click', () => {
    const text = inputText.value;
    if (text) speak(text, CONFIG[srcSelect.value].code);
});

speakOutputBtn.addEventListener('click', () => {
    const text = outputText.textContent;
    if (text && text !== "...") speak(text, CONFIG[destSelect.value].code);
});

clearBtn.addEventListener('click', () => {
    inputText.value = "";
    outputText.textContent = "...";
    pronunciationText.textContent = "";
    liveSubtitle.textContent = "Waiting for input...";
});

// Transliteration Helpers
function updateTransliteration(text, lang) {
    if (lang === 'ru') {
        pronunciationText.textContent = `Pronunciation: ${transliterateRussian(text)}`;
    } else if (lang === 'fa') {
        pronunciationText.textContent = "Persian Transliteration (Simplified)"; // Placeholder as FA translit is complex
    } else {
        pronunciationText.textContent = "";
    }
}

function transliterateRussian(text) {
    const map = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'j', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
    };
    return text.toLowerCase().split('').map(char => map[char] || char).join('');
}

// Initial RTL check
updateRTL();
inputText.addEventListener('input', (e) => {
    const text = e.target.value;
    
    // Clear existing timer
    clearTimeout(debounceTimer);
    
    if (!text.trim()) {
        outputText.textContent = "...";
        liveSubtitle.textContent = "Waiting for input...";
        return;
    }

    // Debounce translation calls (wait 500ms after user stops typing)
    debounceTimer = setTimeout(() => {
        translateText(text);
    }, 500);
});

// Initialize Labels
updateLabels();
