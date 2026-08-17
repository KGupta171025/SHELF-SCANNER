/* ==========================================
   SHELF-SCANNER APPLICATION LOGIC
   ========================================== */

// 1. App State & DOM Elements
const state = {
    apiMode: 'backend',          // 'backend' or 'direct'
    geminiApiKey: '',            // Kept in localStorage
    activeTab: 'uploadTab',
    selectedImageBase64: null,   // Data URL of the selected image
    selectedImageFile: null,     // Raw file object for local multipart upload
    stream: null                 // Camera stream object
};

// DOM Elements
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettings = document.getElementById('closeSettings');
const cancelSettings = document.getElementById('cancelSettings');
const saveSettings = document.getElementById('saveSettings');
const apiKeyContainer = document.getElementById('apiKeyContainer');
const apiKeyInput = document.getElementById('apiKeyInput');
const toggleApiKey = document.getElementById('toggleApiKey');
const radioModeBackend = document.querySelector('input[value="backend"]');
const radioModeDirect = document.querySelector('input[value="direct"]');

const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const previewZone = document.getElementById('previewZone');
const imagePreview = document.getElementById('imagePreview');
const resetBtn = document.getElementById('resetBtn');
const scanBtn = document.getElementById('scanBtn');

const cameraTabTrigger = document.getElementById('cameraTabTrigger');
const webcam = document.getElementById('webcam');
const photoCanvas = document.getElementById('photoCanvas');
const captureBtn = document.getElementById('captureBtn');

const resultsPlaceholder = document.getElementById('resultsPlaceholder');
const resultsLoading = document.getElementById('resultsLoading');
const resultsContent = document.getElementById('resultsContent');

const cssBookCover = document.getElementById('cssBookCover');
const resultBookTitleCover = document.getElementById('resultBookTitleCover');
const resultBookAuthorCover = document.getElementById('resultBookAuthorCover');
const resultBookGenre = document.getElementById('resultBookGenre');
const resultBookTitle = document.getElementById('resultBookTitle');
const resultBookAuthor = document.getElementById('resultBookAuthor');
const resultBookSummary = document.getElementById('resultBookSummary');
const recommendationsContainer = document.getElementById('recommendationsContainer');


// Safe localStorage wrapper to prevent browser crashes on file:// URLs or privacy sandbox blocks
const safeStorage = {
    getItem(key) {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            console.warn(`Storage reading failed for key "${key}":`, e);
            return null;
        }
    },
    setItem(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            console.warn(`Storage writing failed for key "${key}":`, e);
        }
    },
    removeItem(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.warn(`Storage removal failed for key "${key}":`, e);
        }
    }
};

// 2. Initialize Application Settings
function initSettings() {
    const savedMode = safeStorage.getItem('shelf_scanner_mode');
    const savedKey = safeStorage.getItem('shelf_scanner_key');

    if (savedMode) {
        state.apiMode = savedMode;
        if (savedMode === 'backend') {
            radioModeBackend.checked = true;
            apiKeyContainer.style.display = 'none';
        } else {
            radioModeDirect.checked = true;
            apiKeyContainer.style.display = 'block';
        }
    }
    
    if (savedKey) {
        state.geminiApiKey = savedKey;
        apiKeyInput.value = savedKey;
    }
}


// 3. Navigation & Modal Events
settingsBtn.addEventListener('click', () => {
    initSettings(); // Reload latest saved state
    settingsModal.style.display = 'flex';
});

const hideModal = () => { settingsModal.style.display = 'none'; };
closeSettings.addEventListener('click', hideModal);
cancelSettings.addEventListener('click', hideModal);

// Close modal if user clicks outside of it
window.addEventListener('click', (e) => {
    if (e.target === settingsModal) hideModal();
});

// Watch Mode Switch in Settings
document.getElementsByName('apiMode').forEach(radio => {
    radio.addEventListener('change', (e) => {
        if (e.target.value === 'direct') {
            apiKeyContainer.style.display = 'block';
        } else {
            apiKeyContainer.style.display = 'none';
        }
    });
});

// Toggle API Key visibility
toggleApiKey.addEventListener('click', () => {
    const icon = toggleApiKey.querySelector('i');
    if (apiKeyInput.type === 'password') {
        apiKeyInput.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        apiKeyInput.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
});

// Save Settings Event
saveSettings.addEventListener('click', () => {
    const chosenMode = document.querySelector('input[name="apiMode"]:checked').value;
    const enteredKey = apiKeyInput.value.trim();

    if (chosenMode === 'direct' && !enteredKey) {
        alert('Please enter a valid Gemini API Key to use Direct Mode.');
        return;
    }

    safeStorage.setItem('shelf_scanner_mode', chosenMode);
    state.apiMode = chosenMode;

    if (enteredKey) {
        safeStorage.setItem('shelf_scanner_key', enteredKey);
        state.geminiApiKey = enteredKey;
    } else {
        safeStorage.removeItem('shelf_scanner_key');
        state.geminiApiKey = '';
    }

    hideModal();
});


// 4. Tab Navigation Events
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        btn.classList.add('active');
        document.getElementById(targetTab).classList.add('active');
        state.activeTab = targetTab;
        
        if (targetTab === 'cameraTab') {
            startCamera();
        } else {
            stopCamera();
        }
    });
});

// 5. Camera Capture Controls
async function startCamera() {
    try {
        state.stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false
        });
        webcam.srcObject = state.stream;
    } catch (err) {
        console.error('Camera Access Error:', err);
        alert('Could not access camera. Please check camera permissions or upload an image instead.');
        // Fall back to upload tab
        document.querySelector('[data-tab="uploadTab"]').click();
    }
}

function stopCamera() {
    if (state.stream) {
        state.stream.getTracks().forEach(track => track.stop());
        state.stream = null;
        webcam.srcObject = null;
    }
}

captureBtn.addEventListener('click', () => {
    if (!state.stream) return;
    
    // Draw the current video frame onto the hidden canvas
    photoCanvas.width = webcam.videoWidth;
    photoCanvas.height = webcam.videoHeight;
    const ctx = photoCanvas.getContext('2d');
    
    // Flip horizontally to match mirror preview if front facing, 
    // otherwise draw directly. Assuming front camera here for mirroring.
    ctx.translate(photoCanvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(webcam, 0, 0, photoCanvas.width, photoCanvas.height);
    
    // Reset transform
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    
    // Get base64 Data URL
    const dataUrl = photoCanvas.toDataURL('image/jpeg');
    state.selectedImageBase64 = dataUrl;
    state.selectedImageFile = dataURLtoFile(dataUrl, 'scanned_book.jpg');
    
    // Stop camera and show preview
    stopCamera();
    showPreview(dataUrl);
});

// Helper: Convert Data URL to File object for backend uploads
function dataURLtoFile(dataurl, filename) {
    let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
}


// 6. File Selection & Drag-and-Drop
// Trigger file selector on drop zone click
dropZone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
        handleFileSelect(e.target.files[0]);
    }
});

// Drag Over effects
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelect(e.dataTransfer.files[0]);
    }
});

function handleFileSelect(file) {
    if (!file.type.startsWith('image/')) {
        alert('Please upload an image file.');
        return;
    }
    
    state.selectedImageFile = file;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        state.selectedImageBase64 = e.target.result;
        showPreview(e.target.result);
    };
    reader.readAsDataURL(file);
}

function showPreview(dataUrl) {
    // Hide inputs
    document.getElementById('uploadTab').style.display = 'none';
    document.getElementById('cameraTab').style.display = 'none';
    document.querySelector('.tabs').style.display = 'none';
    
    // Show Preview
    imagePreview.src = dataUrl;
    previewZone.style.display = 'flex';
}

// Reset Scanner to original state
resetBtn.addEventListener('click', () => {
    state.selectedImageBase64 = null;
    state.selectedImageFile = null;
    fileInput.value = '';
    
    // Hide preview
    previewZone.style.display = 'none';
    
    // Restore tabs and original layouts
    document.querySelector('.tabs').style.display = 'flex';
    
    // Activate current selected tab layout
    if (state.activeTab === 'cameraTab') {
        document.getElementById('cameraTab').style.display = 'block';
        startCamera();
    } else {
        document.getElementById('uploadTab').style.display = 'block';
    }
});

// 7. Scanning & API Dispatch
scanBtn.addEventListener('click', async () => {
    if (!state.selectedImageBase64) return;
    
    // Update views to loading state
    resultsPlaceholder.style.display = 'none';
    resultsContent.style.display = 'none';
    resultsLoading.style.display = 'flex';
    
    try {
        let resultData;
        if (state.apiMode === 'backend') {
            resultData = await scanViaBackend();
        } else {
            resultData = await scanDirectly();
        }
        
        renderResults(resultData);
        
    } catch (err) {
        console.error(err);
        alert(`Scanning failed: ${err.message || err}`);
        
        // Return to placeholder view
        resultsLoading.style.display = 'none';
        resultsPlaceholder.style.display = 'flex';
    }
});

// Send image to local Python backend
async function scanViaBackend() {
    const formData = new FormData();
    formData.append('file', state.selectedImageFile);
    
    const response = await fetch('http://localhost:8000/api/scan', {
        method: 'POST',
        body: formData
    });
    
    if (!response.ok) {
        const errDetails = await response.json().catch(() => ({}));
        throw new Error(errDetails.detail || `Server responded with ${response.status}`);
    }
    
    return await response.json();
}

// Send image directly to Gemini API from browser (Serverless mode)
async function scanDirectly() {
    if (!state.geminiApiKey) {
        throw new Error("Gemini API Key is missing. Click Settings to enter your key.");
    }
    
    // Extract base64 details
    // Format: "data:image/jpeg;base64,/9j/4AAQSkZ..."
    const commaIndex = state.selectedImageBase64.indexOf(',');
    const base64Data = state.selectedImageBase64.substring(commaIndex + 1);
    const mimeType = state.selectedImageBase64.substring(5, state.selectedImageBase64.indexOf(';'));
    
    const prompt = (
        "Analyze this book cover image. Identify the book title and author. "
        "Then, provide a brief summary, its genre, and recommend 3 other books that a reader of "
        "this book would enjoy, along with a custom reasoning for each recommendation."
    );
    
    // Construct the endpoint
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${state.geminiApiKey}`;
    
    // Payload matching Google GenAI specifications with responseSchema
    const payload = {
        contents: [
            {
                parts: [
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: base64Data
                        }
                    },
                    {
                        text: prompt
                    }
                ]
            }
        ],
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: "OBJECT",
                properties: {
                    title: { type: "STRING" },
                    author: { type: "STRING" },
                    genre: { type: "STRING" },
                    summary: { type: "STRING" },
                    recommendations: {
                        type: "ARRAY",
                        items: {
                            type: "OBJECT",
                            properties: {
                                title: { type: "STRING" },
                                author: { type: "STRING" },
                                reason: { type: "STRING" }
                            },
                            required: ["title", "author", "reason"]
                        }
                    }
                },
                required: ["title", "author", "genre", "summary", "recommendations"]
            },
            temperature: 0.2
        }
    };
    
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
        const errDetails = await response.json().catch(() => ({}));
        throw new Error(errDetails.error?.message || `Gemini API responded with ${response.status}`);
    }
    
    const responseData = await response.json();
    
    // The structured response text is nested inside candidates -> content -> parts -> text
    const textResponse = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResponse) {
        throw new Error("Empty response received from Gemini.");
    }
    
    return JSON.parse(textResponse);
}

// 8. Result Rendering
function renderResults(data) {
    // Hide loader
    resultsLoading.style.display = 'none';
    
    // Fill text labels
    resultBookTitle.textContent = data.title;
    resultBookAuthor.textContent = `by ${data.author}`;
    resultBookGenre.textContent = data.genre;
    resultBookSummary.textContent = data.summary;
    
    // Update Dynamic CSS Book Cover
    resultBookTitleCover.textContent = truncateText(data.title, 40);
    resultBookAuthorCover.textContent = truncateText(data.author, 25);
    
    // Assign a beautiful dynamic background color to the book spine/cover based on title length
    // This generates unique colors for each book cover so they look beautiful!
    const titleHue = Math.abs(hashCode(data.title)) % 360;
    cssBookCover.querySelector('.book-cover').style.background = `linear-gradient(135deg, hsl(${titleHue}, 70%, 45%) 0%, hsl(${(titleHue + 40) % 360}, 75%, 25%) 100%)`;
    cssBookCover.querySelector('.book-spine').style.background = `hsl(${titleHue}, 60%, 35%)`;
    
    // Clear and build Recommendations Grid
    recommendationsContainer.innerHTML = '';
    data.recommendations.forEach((rec, index) => {
        const cardHtml = `
            <div class="rec-card card">
                <div class="rec-header">
                    <span class="rec-number">0${index + 1}</span>
                    <div>
                        <h3 class="rec-title">${rec.title}</h3>
                        <p class="rec-author">by ${rec.author}</p>
                    </div>
                </div>
                <div class="rec-reason">
                    <i class="fa-solid fa-quote-left quote-icon"></i>
                    <p>${rec.reason}</p>
                </div>
            </div>
        `;
        recommendationsContainer.insertAdjacentHTML('beforeend', cardHtml);
    });
    
    // Show results content
    resultsContent.style.display = 'block';
}


// Utilities
function truncateText(str, maxLength) {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
}


// String hashing helper to generate deterministic background colors
function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
}


// Run settings loader on startup
initSettings();
