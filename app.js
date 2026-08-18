/* ==========================================
   SHELF-SCANNER APPLICATION LOGIC
   ========================================== */

// Global error logging to capture and alert any runtime errors immediately
window.addEventListener('error', (e) => {
    console.error("Global JS Error Captured:", e.error);
    alert(`JavaScript Error: ${e.message}\nFile: ${e.filename}\nLine: ${e.lineno}`);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error("Unhandled Promise Rejection Captured:", e.reason);
    alert(`Unhandled Promise Rejection: ${e.reason}`);
});

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

// 1. Global Application State
const state = {
    apiMode: 'backend',          // 'backend' or 'direct'
    geminiApiKey: '',            // Kept in localStorage
    activeTab: 'uploadTab',
    selectedImageBase64: null,   // Data URL of the selected image
    selectedImageFile: null,     // Raw file object for local multipart upload
    stream: null                 // Camera stream object
};

// Run script only after the DOM is fully parsed and loaded
document.addEventListener('DOMContentLoaded', () => {
    
    // 2. DOM Elements
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
    
    // Preferences Inputs
    const preferencesInput = document.getElementById('preferencesInput');

    const cameraTabTrigger = document.getElementById('cameraTabTrigger');
    const webcam = document.getElementById('webcam');
    const photoCanvas = document.getElementById('photoCanvas');
    const captureBtn = document.getElementById('captureBtn');

    const resultsPlaceholder = document.getElementById('resultsPlaceholder');
    const resultsLoading = document.getElementById('resultsLoading');
    const resultsContent = document.getElementById('resultsContent');

    const resultShelfSummary = document.getElementById('resultShelfSummary');
    const detectedBooksList = document.getElementById('detectedBooksList');
    const recommendationsContainer = document.getElementById('recommendationsContainer');

    // 3. Initialize Settings from safeStorage
    function initSettings() {
        const savedMode = safeStorage.getItem('shelf_scanner_mode');
        const savedKey = safeStorage.getItem('shelf_scanner_key');

        if (savedMode) {
            state.apiMode = savedMode;
            if (savedMode === 'backend') {
                if (radioModeBackend) radioModeBackend.checked = true;
                if (apiKeyContainer) apiKeyContainer.style.display = 'none';
            } else {
                if (radioModeDirect) radioModeDirect.checked = true;
                if (apiKeyContainer) apiKeyContainer.style.display = 'block';
            }
        }
        
        if (savedKey) {
            state.geminiApiKey = savedKey;
            if (apiKeyInput) apiKeyInput.value = savedKey;
        }
    }

    // Run settings initialization on page load
    initSettings();

    // 4. Modal event listeners
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            initSettings(); // Reload latest saved settings values
            if (settingsModal) settingsModal.style.display = 'flex';
        });
    }

    const hideModal = () => { 
        if (settingsModal) settingsModal.style.display = 'none'; 
    };
    
    if (closeSettings) closeSettings.addEventListener('click', hideModal);
    if (cancelSettings) cancelSettings.addEventListener('click', hideModal);

    // Close modal if user clicks outside content card
    window.addEventListener('click', (e) => {
        if (e.target === settingsModal) hideModal();
    });

    // Toggle backend/direct mode options
    document.getElementsByName('apiMode').forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (apiKeyContainer) {
                if (e.target.value === 'direct') {
                    apiKeyContainer.style.display = 'block';
                } else {
                    apiKeyContainer.style.display = 'none';
                }
            }
        });
    });

    // Toggle API Key text visibility
    if (toggleApiKey && apiKeyInput) {
        toggleApiKey.addEventListener('click', () => {
            const icon = toggleApiKey.querySelector('i');
            if (apiKeyInput.type === 'password') {
                apiKeyInput.type = 'text';
                if (icon) icon.classList.replace('fa-eye', 'fa-eye-slash');
            } else {
                apiKeyInput.type = 'password';
                if (icon) icon.classList.replace('fa-eye-slash', 'fa-eye');
            }
        });
    }

    // Save Settings Modal Options
    if (saveSettings) {
        saveSettings.addEventListener('click', () => {
            const checkedRadio = document.querySelector('input[name="apiMode"]:checked');
            const chosenMode = checkedRadio ? checkedRadio.value : 'backend';
            const enteredKey = apiKeyInput ? apiKeyInput.value.trim() : '';

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
    }

    // 5. Tab swapping navigation
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            
            const targetEl = document.getElementById(targetTab);
            if (targetEl) targetEl.classList.add('active');
            state.activeTab = targetTab;
            
            if (targetTab === 'cameraTab') {
                startCamera();
            } else {
                stopCamera();
            }
        });
    });

    // 6. Camera stream controls
    async function startCamera() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('Camera APIs are not supported by this browser or connection. Please upload an image cover instead.');
            // Fall back to upload tab
            const uploadTabBtn = document.querySelector('[data-tab="uploadTab"]');
            if (uploadTabBtn) uploadTabBtn.click();
            return;
        }

        try {
            state.stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false
            });
            if (webcam) webcam.srcObject = state.stream;
        } catch (err) {
            console.error('Camera Access Error:', err);
            alert('Could not access camera. Please check browser permissions or upload an image instead.');
            // Fall back to upload tab
            const uploadTabBtn = document.querySelector('[data-tab="uploadTab"]');
            if (uploadTabBtn) uploadTabBtn.click();
        }
    }

    function stopCamera() {
        if (state.stream) {
            state.stream.getTracks().forEach(track => track.stop());
            state.stream = null;
        }
        if (webcam) webcam.srcObject = null;
    }

    if (captureBtn) {
        captureBtn.addEventListener('click', () => {
            if (!state.stream || !webcam || !photoCanvas) return;
            
            photoCanvas.width = webcam.videoWidth || 640;
            photoCanvas.height = webcam.videoHeight || 480;
            
            const ctx = photoCanvas.getContext('2d');
            if (!ctx) return;
            
            // Mirror flip left-to-right to match screen preview
            ctx.translate(photoCanvas.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(webcam, 0, 0, photoCanvas.width, photoCanvas.height);
            ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset
            
            const dataUrl = photoCanvas.toDataURL('image/jpeg');
            state.selectedImageBase64 = dataUrl;
            state.selectedImageFile = dataURLtoFile(dataUrl, 'scanned_book.jpg');
            
            stopCamera();
            showPreview(dataUrl);
        });
    }

    function dataURLtoFile(dataurl, filename) {
        let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
            bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, {type:mime});
    }

    // 7. File Selection & Drag-and-Drop
    if (dropZone && fileInput) {
        // Trigger file selector on drop zone click
        dropZone.addEventListener('click', (e) => {
            // CRITICAL FIX: Only trigger programmatic click if we didn't click the input/label directly.
            // This prevents duplicate browser clicks which cancel the file dialogue.
            if (e.target !== fileInput && !e.target.closest('label')) {
                fileInput.click();
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                handleFileSelect(e.target.files[0]);
            }
        });

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
    }

    function handleFileSelect(file) {
        console.log("handleFileSelect triggered. File:", file.name, "Type:", file.type, "Size:", file.size);
        if (!file.type.startsWith('image/')) {
            alert(`Selected file is not an image (detected type: ${file.type || 'unknown'}). Please upload an image file.`);
            return;
        }
        
        state.selectedImageFile = file;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            console.log("FileReader load finished. Data URL length:", e.target.result.length);
            state.selectedImageBase64 = e.target.result;
            showPreview(e.target.result);
        };
        reader.onerror = (err) => {
            console.error("FileReader failed:", err);
            alert("Failed to read the selected file.");
        };
        reader.readAsDataURL(file);
    }

    function showPreview(dataUrl) {
        console.log("showPreview triggered. Checking targets...");
        const uploadTabEl = document.getElementById('uploadTab');
        const cameraTabEl = document.getElementById('cameraTab');
        const tabNavEl = document.querySelector('.tabs');
        
        console.log("Elements found:", {
            uploadTab: !!uploadTabEl,
            cameraTab: !!cameraTabEl,
            tabNav: !!tabNavEl,
            imagePreview: !!imagePreview,
            previewZone: !!previewZone
        });

        if (uploadTabEl) uploadTabEl.style.display = 'none';
        if (cameraTabEl) cameraTabEl.style.display = 'none';
        if (tabNavEl) tabNavEl.style.display = 'none';
        
        // Show Preview
        if (imagePreview) {
            imagePreview.src = dataUrl;
            console.log("Set imagePreview src");
        }
        if (previewZone) {
            previewZone.style.display = 'flex';
            console.log("Set previewZone display: flex");
        }
    }

    // Reset scanner layout to capture/upload state
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            state.selectedImageBase64 = null;
            state.selectedImageFile = null;
            if (fileInput) fileInput.value = '';
            
            if (previewZone) previewZone.style.display = 'none';
            
            const tabNavEl = document.querySelector('.tabs');
            if (tabNavEl) tabNavEl.style.display = 'flex';
            
            if (state.activeTab === 'cameraTab') {
                const cameraTabEl = document.getElementById('cameraTab');
                if (cameraTabEl) cameraTabEl.style.display = 'block';
                startCamera();
            } else {
                const uploadTabEl = document.getElementById('uploadTab');
                if (uploadTabEl) uploadTabEl.style.display = 'block';
            }
        });
    }

    // 8. Call API to scan book
    if (scanBtn) {
        scanBtn.addEventListener('click', async () => {
            if (!state.selectedImageBase64) return;
            
            if (resultsPlaceholder) resultsPlaceholder.style.display = 'none';
            if (resultsContent) resultsContent.style.display = 'none';
            if (resultsLoading) resultsLoading.style.display = 'flex';
            
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
                
                if (resultsLoading) resultsLoading.style.display = 'none';
                if (resultsPlaceholder) resultsPlaceholder.style.display = 'flex';
            }
        });
    }

    async function scanViaBackend() {
        const formData = new FormData();
        formData.append('file', state.selectedImageFile);
        
        const prefValue = preferencesInput ? preferencesInput.value.trim() : '';
        if (prefValue) {
            formData.append('preferences', prefValue);
        }
        
        const response = await fetch('http://localhost:8000/api/scan', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errDetails = await response.json().catch(() => ({}));
            throw new Error(errDetails.detail || `Server responded with status ${response.status}`);
        }
        
        return await response.json();
    }

    async function scanDirectly() {
        if (!state.geminiApiKey) {
            throw new Error("Gemini API Key is missing. Click Settings to enter your key.");
        }
        
        const commaIndex = state.selectedImageBase64.indexOf(',');
        const base64Data = state.selectedImageBase64.substring(commaIndex + 1);
        const mimeType = state.selectedImageBase64.substring(5, state.selectedImageBase64.indexOf(';'));
        
        const prefValue = preferencesInput ? preferencesInput.value.trim() : '';
        
        let prompt = `Analyze this image containing a bookshelf or a collection of books. Identify as many visible books as you can (up to 10 books) and list their titles, authors, and genres. Provide a brief 1-2 sentence summary of the user's reading taste based on these books. Finally, recommend 3 other books they might enjoy.`;
        
        if (prefValue) {
            prompt += `\nNote: The user has specified the following reading preferences/topics they are interested in right now: '${prefValue}'. Prioritize recommendations that match these topics while still complementing the existing books on the shelf.`;
        }
        
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${state.geminiApiKey}`;
        
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
                        scanned_books: {
                            type: "ARRAY",
                            items: {
                                type: "OBJECT",
                                properties: {
                                    title: { type: "STRING" },
                                    author: { type: "STRING" },
                                    genre: { type: "STRING" }
                                },
                                required: ["title", "author", "genre"]
                            }
                        },
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
                        },
                        shelf_summary: { type: "STRING" }
                    },
                    required: ["scanned_books", "recommendations", "shelf_summary"]
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
            throw new Error(errDetails.error?.message || `Gemini API responded with status ${response.status}`);
        }
        
        const responseData = await response.json();
        const textResponse = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!textResponse) {
            throw new Error("Empty response received from Gemini.");
        }
        
        return JSON.parse(textResponse);
    }

    // 9. Render Results to DOM
    function renderResults(data) {
        if (resultsLoading) resultsLoading.style.display = 'none';
        
        if (resultShelfSummary) resultShelfSummary.textContent = data.shelf_summary;
        
        // Populating the detected books list
        if (detectedBooksList) {
            detectedBooksList.innerHTML = '';
            if (data.scanned_books && data.scanned_books.length > 0) {
                data.scanned_books.forEach(book => {
                    const li = document.createElement('li');
                    li.textContent = `${book.title} by ${book.author}`;
                    li.title = `${book.title} by ${book.author} (${book.genre})`;
                    detectedBooksList.appendChild(li);
                });
            } else {
                detectedBooksList.innerHTML = '<li>No books recognized clearly. Try a clearer image.</li>';
            }
        }
        
        // Clear and build Recommendations Grid with horizontal cards housing mini 3D covers!
        if (recommendationsContainer) {
            recommendationsContainer.innerHTML = '';
            
            if (data.recommendations && data.recommendations.length > 0) {
                data.recommendations.forEach((rec, index) => {
                    const titleHue = Math.abs(hashCode(rec.title)) % 360;
                    
                    const cardHtml = `
                        <div class="rec-card card">
                            <div class="rec-card-inner">
                                <div class="dynamic-cover-wrapper mini-cover">
                                    <div class="css-book" id="recCover_${index}">
                                        <div class="book-spine" style="background: hsl(${titleHue}, 60%, 35%)"></div>
                                        <div class="book-page"></div>
                                        <div class="book-cover" style="background: linear-gradient(135deg, hsl(${titleHue}, 70%, 45%) 0%, hsl(${(titleHue + 40) % 360}, 75%, 25%) 100%)">
                                            <div class="cover-design">
                                                <div class="cover-accent-line"></div>
                                                <h4>${truncateText(rec.title, 40)}</h4>
                                                <p>${truncateText(rec.author, 20)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="rec-info">
                                    <h3 class="rec-title">${rec.title}</h3>
                                    <p class="rec-author">by ${rec.author}</p>
                                    <div class="rec-reason">
                                        <i class="fa-solid fa-quote-left quote-icon"></i>
                                        <p>${rec.reason}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                    recommendationsContainer.insertAdjacentHTML('beforeend', cardHtml);
                });
            } else {
                recommendationsContainer.innerHTML = '<div class="card" style="padding: 1.5rem; text-align: center; color: var(--text-muted);">No recommendations generated.</div>';
            }
        }
        
        if (resultsContent) resultsContent.style.display = 'block';
    }

    // Helper: Truncate cover title/author
    function truncateText(str, maxLength) {
        if (!str) return '';
        if (str.length <= maxLength) return str;
        return str.substring(0, maxLength - 3) + '...';
    }

    // Helper: Hashing string to get deterministic cover background colors
    function hashCode(str) {
        let hash = 0;
        if (!str) return hash;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        return hash;
    }
});
