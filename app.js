/* ==========================================
   SHELF-SCANNER APPLICATION LOGIC (PORTAL)
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
    stream: null,                // Camera stream object
    library: []                  // Local persistent library catalog
};

// Run script only after the DOM is fully parsed and loaded
document.addEventListener('DOMContentLoaded', () => {
    
    // 2. DOM Elements
    // Navigation & Portal Layout
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const sidebar = document.getElementById('sidebar');
    const navItems = document.querySelectorAll('.nav-item');
    const pageViews = document.querySelectorAll('.page-view');
    const ctaScanTriggers = document.querySelectorAll('.cta-scan-trigger');

    // Theme toggles
    const themeToggleBtn = document.getElementById('themeToggleBtn');

    // Modals & triggers
    const settingsBtn = document.getElementById('settingsBtn');
    const sidebarSettingsBtn = document.getElementById('sidebarSettingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettings = document.getElementById('closeSettings');
    const cancelSettings = document.getElementById('cancelSettings');
    const saveSettings = document.getElementById('saveSettings');
    const apiKeyContainer = document.getElementById('apiKeyContainer');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const toggleApiKey = document.getElementById('toggleApiKey');
    const radioModeBackend = document.querySelector('input[value="backend"]');
    const radioModeDirect = document.querySelector('input[value="direct"]');

    // Donate Modals
    const donateBtn = document.getElementById('donateBtn');
    const sidebarDonateBtn = document.getElementById('sidebarDonateBtn');
    const donateModal = document.getElementById('donateModal');
    const closeDonateModal = document.getElementById('closeDonateModal');
    const closeDonateBtn = document.getElementById('closeDonateBtn');

    // Contact Modals
    const contactBtn = document.getElementById('contactBtn');
    const contactModal = document.getElementById('contactModal');
    const closeContactModal = document.getElementById('closeContactModal');
    const cancelContact = document.getElementById('cancelContact');

    // Scanner components
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const previewZone = document.getElementById('previewZone');
    const imagePreview = document.getElementById('imagePreview');
    const resetBtn = document.getElementById('resetBtn');
    const scanBtn = document.getElementById('scanBtn');
    const preferencesInput = document.getElementById('preferencesInput');

    // Webcam components
    const webcam = document.getElementById('webcam');
    const photoCanvas = document.getElementById('photoCanvas');
    const captureBtn = document.getElementById('captureBtn');

    // Results components
    const resultsPlaceholder = document.getElementById('resultsPlaceholder');
    const resultsLoading = document.getElementById('resultsLoading');
    const resultsContent = document.getElementById('resultsContent');
    const resultShelfSummary = document.getElementById('resultShelfSummary');
    const detectedBooksList = document.getElementById('detectedBooksList');
    const recommendationsContainer = document.getElementById('recommendationsContainer');

    // Library DOM Components
    const virtualShelfContainer = document.getElementById('virtualShelfContainer');
    const librarySearchInput = document.getElementById('librarySearchInput');
    const libraryGenreFilter = document.getElementById('libraryGenreFilter');
    const importLibraryBtn = document.getElementById('importLibraryBtn');
    const importModal = document.getElementById('importModal');
    const closeImportModal = document.getElementById('closeImportModal');
    const cancelImport = document.getElementById('cancelImport');
    const saveImportBtn = document.getElementById('saveImportBtn');
    const loadSampleLibraryBtn = document.getElementById('loadSampleLibraryBtn');
    const importPastedTitles = document.getElementById('importPastedTitles');

    // 3. Initialize Settings, Themes & Library from safeStorage
    function initSettings() {
        // Mode & API Keys
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

        // Theme Initialization
        const savedTheme = safeStorage.getItem('shelf_scanner_theme') || 'dark';
        if (savedTheme === 'light') {
            document.body.classList.add('light-theme');
            updateThemeIcon(true);
        } else {
            document.body.classList.remove('light-theme');
            updateThemeIcon(false);
        }

        initLibrary();
    }

    function initLibrary() {
        const savedLib = safeStorage.getItem('shelf_scanner_library');
        if (savedLib) {
            try {
                state.library = JSON.parse(savedLib);
            } catch (e) {
                console.error("Failed to parse library:", e);
                state.library = [];
            }
        } else {
            state.library = [];
        }
        
        renderShelf();
        populateGenreFilter();
    }

    function saveLibrary() {
        safeStorage.setItem('shelf_scanner_library', JSON.stringify(state.library));
    }

    initSettings();

    // 4. SPA Page Navigation
    function showPage(pageId) {
        pageViews.forEach(view => {
            view.classList.remove('active');
        });
        const activeView = document.getElementById(pageId);
        if (activeView) activeView.classList.add('active');

        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-page') === pageId) {
                item.classList.add('active');
            }
        });

        // Close mobile drawer on routing
        if (sidebar) sidebar.classList.remove('open');

        // Stop camera stream if we navigate away from scanner workspace
        if (pageId !== 'scannerPage' || state.activeTab !== 'cameraTab') {
            stopCamera();
        } else if (pageId === 'scannerPage' && state.activeTab === 'cameraTab') {
            startCamera();
        }
    }

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const pageId = item.getAttribute('data-page');
            if (pageId) {
                e.preventDefault();
                showPage(pageId);
            }
        });
    });

    // Landing Page CTAs trigger scanner
    ctaScanTriggers.forEach(trigger => {
        trigger.addEventListener('click', () => {
            showPage('scannerPage');
        });
    });

    // Mobile Hamburger Toggle
    if (hamburgerBtn && sidebar) {
        hamburgerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('open');
        });

        // Close sidebar if user clicks out
        document.addEventListener('click', (e) => {
            if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== hamburgerBtn) {
                sidebar.classList.remove('open');
            }
        });
    }

    // Theme Switch toggles body class
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const isLight = document.body.classList.toggle('light-theme');
            safeStorage.setItem('shelf_scanner_theme', isLight ? 'light' : 'dark');
            updateThemeIcon(isLight);
        });
    }

    function updateThemeIcon(isLight) {
        const icon = themeToggleBtn ? themeToggleBtn.querySelector('.theme-icon') : null;
        if (icon) {
            if (isLight) {
                icon.classList.replace('fa-moon', 'fa-sun');
            } else {
                icon.classList.replace('fa-sun', 'fa-moon');
            }
        }
    }

    // 5. Modal Controllers
    const openModal = (m) => { if (m) m.style.display = 'flex'; };
    const hideModal = (m) => { if (m) m.style.display = 'none'; };

    // Settings Modal
    const triggerSettings = (e) => {
        e.preventDefault();
        initSettings();
        openModal(settingsModal);
        if (sidebar) sidebar.classList.remove('open');
    };
    if (settingsBtn) settingsBtn.addEventListener('click', triggerSettings);
    if (sidebarSettingsBtn) sidebarSettingsBtn.addEventListener('click', triggerSettings);
    if (closeSettings) closeSettings.addEventListener('click', () => hideModal(settingsModal));
    if (cancelSettings) cancelSettings.addEventListener('click', () => hideModal(settingsModal));

    // Toggle Mode Options
    document.getElementsByName('apiMode').forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (apiKeyContainer) {
                apiKeyContainer.style.display = (e.target.value === 'direct') ? 'block' : 'none';
            }
        });
    });

    // Toggle Password Visibility
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

            hideModal(settingsModal);
        });
    }

    // Donate Modals
    const donateTriggers = [donateBtn, sidebarDonateBtn];
    donateTriggers.forEach(t => {
        if (t) t.addEventListener('click', () => openModal(donateModal));
    });
    if (closeDonateModal) closeDonateModal.addEventListener('click', () => hideModal(donateModal));
    if (closeDonateBtn) closeDonateBtn.addEventListener('click', () => hideModal(donateModal));

    // Contact Modals
    if (contactBtn) contactBtn.addEventListener('click', () => openModal(contactModal));
    if (closeContactModal) closeContactModal.addEventListener('click', () => hideModal(contactModal));
    if (cancelContact) cancelContact.addEventListener('click', () => hideModal(contactModal));

    // Close modals on overlay clicks
    window.addEventListener('click', (e) => {
        if (e.target === settingsModal) hideModal(settingsModal);
        if (e.target === importModal) hideModal(importModal);
        if (e.target === donateModal) hideModal(donateModal);
        if (e.target === contactModal) hideModal(contactModal);
    });

    // 6. Camera stream controls
    async function startCamera() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('Camera APIs are not supported by this browser or connection. Please upload an image cover instead.');
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

    if (captureBtn) {
        captureBtn.addEventListener('click', () => {
            if (!state.stream || !webcam || !photoCanvas) return;
            
            photoCanvas.width = webcam.videoWidth || 640;
            photoCanvas.height = webcam.videoHeight || 480;
            
            const ctx = photoCanvas.getContext('2d');
            if (!ctx) return;
            
            ctx.translate(photoCanvas.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(webcam, 0, 0, photoCanvas.width, photoCanvas.height);
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            
            const dataUrl = photoCanvas.toDataURL('image/jpeg');
            state.selectedImageBase64 = dataUrl;
            state.selectedImageFile = dataURLtoFile(dataUrl, 'scanned_book.jpg');
            
            stopCamera();
            showPreview(dataUrl);
        });
    }

    // 7. File Selection & Drag-and-Drop
    if (dropZone && fileInput) {
        dropZone.addEventListener('click', (e) => {
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
        if (!file.type.startsWith('image/')) {
            alert(`Selected file is not an image (detected type: ${file.type || 'unknown'}). Please upload an image file.`);
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
        const uploadTabEl = document.getElementById('uploadTab');
        const cameraTabEl = document.getElementById('cameraTab');
        const tabNavEl = document.querySelector('.tabs');
        
        if (uploadTabEl) uploadTabEl.style.display = 'none';
        if (cameraTabEl) cameraTabEl.style.display = 'none';
        if (tabNavEl) tabNavEl.style.display = 'none';
        
        if (imagePreview) imagePreview.src = dataUrl;
        if (previewZone) previewZone.style.display = 'flex';
    }

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
                
                // Add recognized books to local persistent database
                if (resultData.scanned_books && resultData.scanned_books.length > 0) {
                    resultData.scanned_books.forEach(scannedBook => {
                        const exists = state.library.some(b => b.title.toLowerCase() === scannedBook.title.toLowerCase());
                        if (!exists) {
                            state.library.push({
                                title: scannedBook.title,
                                author: scannedBook.author,
                                genre: scannedBook.genre,
                                shelf_summary: resultData.shelf_summary,
                                recommendations: resultData.recommendations
                            });
                        }
                    });
                    saveLibrary();
                    renderShelf();
                    populateGenreFilter();
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

    // 10. Virtual Bookshelf Renderer
    function renderShelf() {
        if (!virtualShelfContainer) return;
        virtualShelfContainer.innerHTML = '';
        
        const searchQuery = librarySearchInput ? librarySearchInput.value.toLowerCase().trim() : '';
        const selectedGenre = libraryGenreFilter ? libraryGenreFilter.value : 'all';
        
        const filteredBooks = state.library.filter(book => {
            const matchesSearch = book.title.toLowerCase().includes(searchQuery) || 
                                 book.author.toLowerCase().includes(searchQuery);
            const matchesGenre = selectedGenre === 'all' || book.genre === selectedGenre;
            return matchesSearch && matchesGenre;
        });
        
        if (filteredBooks.length === 0) {
            virtualShelfContainer.innerHTML = '<div class="empty-shelf-message"><i class="fa-solid fa-folder-open" style="font-size: 2rem; margin-bottom: 0.5rem; display: block;"></i>Your reading list is empty. Go to the "Book Scanner" to scan or "Import Library".</div>';
            return;
        }
        
        const booksPerShelf = 6;
        for (let i = 0; i < filteredBooks.length; i += booksPerShelf) {
            const shelfBooks = filteredBooks.slice(i, i + booksPerShelf);
            const shelfRow = document.createElement('div');
            shelfRow.className = 'shelf-row';
            
            shelfBooks.forEach(book => {
                const titleHue = Math.abs(hashCode(book.title)) % 360;
                const bookItem = document.createElement('div');
                bookItem.className = 'shelf-book-item';
                bookItem.title = `${book.title} by ${book.author} (Click for details)`;
                
                bookItem.innerHTML = `
                    <div class="css-book">
                        <div class="book-spine" style="background: hsl(${titleHue}, 60%, 30%)"></div>
                        <div class="book-page"></div>
                        <div class="book-cover" style="background: linear-gradient(135deg, hsl(${titleHue}, 70%, 40%) 0%, hsl(${(titleHue + 40) % 360}, 75%, 20%) 100%)">
                           <div class="cover-design">
                               <div class="cover-accent-line"></div>
                               <h4>${truncateText(book.title, 35)}</h4>
                               <p>${truncateText(book.author, 18)}</p>
                           </div>
                        </div>
                    </div>
                `;
                
                bookItem.addEventListener('click', () => {
                    displayLibraryBookDetails(book);
                });
                
                shelfRow.appendChild(bookItem);
            });
            
            virtualShelfContainer.appendChild(shelfRow);
        }
    }

    function displayLibraryBookDetails(book) {
        showPage('scannerPage'); // Redirect to scanner workspace
        
        if (resultsPlaceholder) resultsPlaceholder.style.display = 'none';
        if (resultsLoading) resultsLoading.style.display = 'none';
        
        if (resultShelfSummary) {
            resultShelfSummary.textContent = book.shelf_summary;
        }
        
        if (detectedBooksList) {
            detectedBooksList.innerHTML = '';
            const li = document.createElement('li');
            li.textContent = `${book.title} by ${book.author}`;
            li.title = `${book.title} by ${book.author} (${book.genre || 'Unknown'})`;
            detectedBooksList.appendChild(li);
        }
        
        if (recommendationsContainer) {
            recommendationsContainer.innerHTML = '';
            if (book.recommendations && book.recommendations.length > 0) {
                book.recommendations.forEach((rec, index) => {
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
            }
        }
        
        if (resultsContent) resultsContent.style.display = 'block';
        
        const resultsEl = document.querySelector('.results-section');
        if (resultsEl) {
            resultsEl.scrollIntoView({ behavior: 'smooth' });
        }
    }

    function populateGenreFilter() {
        if (!libraryGenreFilter) return;
        const currentSelection = libraryGenreFilter.value;
        
        libraryGenreFilter.innerHTML = '<option value="all">All Genres</option>';
        const genres = new Set();
        state.library.forEach(book => {
            if (book.genre) genres.add(book.genre);
        });
        
        genres.forEach(genre => {
            const opt = document.createElement('option');
            opt.value = genre;
            opt.textContent = genre;
            libraryGenreFilter.appendChild(opt);
        });
        
        if (Array.from(libraryGenreFilter.options).some(o => o.value === currentSelection)) {
            libraryGenreFilter.value = currentSelection;
        }
    }

    // 11. Search and Filter Event Listeners
    if (librarySearchInput) {
        librarySearchInput.addEventListener('input', renderShelf);
    }
    if (libraryGenreFilter) {
        libraryGenreFilter.addEventListener('change', renderShelf);
    }

    // 12. Import Goodreads Library Modal Controls
    if (importLibraryBtn) {
        importLibraryBtn.addEventListener('click', () => openModal(importModal));
    }
    if (closeImportModal) closeImportModal.addEventListener('click', () => hideModal(importModal));
    if (cancelImport) cancelImport.addEventListener('click', () => hideModal(importModal));

    // Populate Sample Library (Goodreads Sim)
    if (loadSampleLibraryBtn) {
        loadSampleLibraryBtn.addEventListener('click', () => {
            const samples = [
                {
                    title: "Sapiens: A Brief History of Humankind",
                    author: "Yuval Noah Harari",
                    genre: "History",
                    shelf_summary: "You are fascinated by big-picture historical narratives, human evolution, anthropology, and how social structures shaped civilization.",
                    recommendations: [
                        { title: "Guns, Germs, and Steel", author: "Jared Diamond", reason: "Explores the environmental and geographic factors that allowed some societies to succeed and dominate." },
                        { title: "Homo Deus", author: "Yuval Noah Harari", reason: "The sequel to Sapiens, examining the future of humanity and our transition into godlike entities." },
                        { title: "The Silk Roads", author: "Peter Frankopan", reason: "A major reassessment of world history, focusing on the region where East meets West." }
                    ]
                },
                {
                    title: "Zero to One",
                    author: "Peter Thiel",
                    genre: "Business",
                    shelf_summary: "Your taste features entrepreneurship, technology, contrarian strategy, and building innovative systems in startups.",
                    recommendations: [
                        { title: "The Lean Startup", author: "Eric Ries", reason: "Introduces the validated learning and rapid experimentation cycle for launching products." },
                        { title: "Hard Things About Hard Things", author: "Ben Horowitz", reason: "Provides practical, raw advice on navigating the brutal challenges of leading startups." },
                        { title: "High Output Management", author: "Andrew Grove", reason: "The legendary management guide for building and scaling high-efficiency team output." }
                    ]
                },
                {
                    title: "Dune",
                    author: "Frank Herbert",
                    genre: "Sci-Fi",
                    shelf_summary: "You enjoy rich, immersive worldbuilding, epic space opera sagas, ecology, political intrigue, and philosophical sci-fi.",
                    recommendations: [
                        { title: "Foundation", author: "Isaac Asimov", reason: "A grand epic detailing the fall and rebirth of a galactic empire using mathematical psychohistory." },
                        { title: "Hyperion", author: "Dan Simmons", reason: "A complex, multi-perspective sci-fi masterpiece weaving time travel, religion, and galactic war." },
                        { title: "The Left Hand of Darkness", author: "Ursula K. Le Guin", reason: "A landmark work of science fiction exploring social structures, gender, and diplomacy." }
                    ]
                },
                {
                    title: "Atomic Habits",
                    author: "James Clear",
                    genre: "Self-Help",
                    shelf_summary: "You focus on personal growth, productivity systems, habit formation, behavioral psychology, and self-improvement.",
                    recommendations: [
                        { title: "The Power of Habit", author: "Charles Duhigg", reason: "Explores the scientific loop of cue, routine, and reward that defines human behavior." },
                        { title: "Deep Work", author: "Cal Newport", reason: "A guide on cultivating cognitive focus to succeed in a distracted, hyper-connected world." },
                        { title: "Tiny Habits", author: "BJ Fogg", reason: "Presents the behavioral psychology method of starting extremely small to construct massive changes." }
                    ]
                },
                {
                    title: "Thinking, Fast and Slow",
                    author: "Daniel Kahneman",
                    genre: "Psychology",
                    shelf_summary: "You study cognitive biases, decision-making systems, behavioral economics, and how humans make judgements.",
                    recommendations: [
                        { title: "Predictably Irrational", author: "Dan Ariely", reason: "Shows how human decisions are systematically and predictably irrational." },
                        { title: "Nudge", author: "Richard Thaler & Cass Sunstein", reason: "Explores how choice architecture can gently direct humans to make better life decisions." },
                        { title: "Influence: The Psychology of Persuasion", author: "Robert Cialdini", reason: "The classic study on the six universal psychological principles of persuasion." }
                    ]
                }
            ];
            
            samples.forEach(sample => {
                const exists = state.library.some(b => b.title.toLowerCase() === sample.title.toLowerCase());
                if (!exists) {
                    state.library.push(sample);
                }
            });
            
            saveLibrary();
            renderShelf();
            populateGenreFilter();
            hideImportModal();
        });
    }

    if (saveImportBtn && importPastedTitles) {
        saveImportBtn.addEventListener('click', () => {
            const text = importPastedTitles.value.trim();
            if (!text) {
                alert("Please paste some book titles first.");
                return;
            }
            
            const lines = text.split('\n');
            let importedCount = 0;
            
            lines.forEach(line => {
                if (!line.trim()) return;
                
                let title = line.trim();
                let author = "Unknown Author";
                
                if (line.includes('-')) {
                    const parts = line.split('-');
                    title = parts[0].trim();
                    author = parts[1].trim();
                }
                
                const exists = state.library.some(b => b.title.toLowerCase() === title.toLowerCase());
                if (!exists) {
                    state.library.push({
                        title: title,
                        author: author,
                        genre: "Imported",
                        shelf_summary: `Imported book profile. Select Scan Bookshelf to discover fresh insights for your library.`,
                        recommendations: [
                            { title: `Discoveries similar to ${title}`, author: author, reason: `This recommendation is customized for readers of ${title} by ${author}.` }
                        ]
                    });
                    importedCount++;
                }
            });
            
            if (importedCount > 0) {
                saveLibrary();
                renderShelf();
                populateGenreFilter();
                importPastedTitles.value = '';
            }
            
            hideImportModal();
        });
    }

    // Helper: Truncate cover text
    function truncateText(str, maxLength) {
        if (!str) return '';
        if (str.length <= maxLength) return str;
        return str.substring(0, maxLength - 3) + '...';
    }

    // Helper: Deterministic Hashing
    function hashCode(str) {
        let hash = 0;
        if (!str) return hash;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        return hash;
    }
});
