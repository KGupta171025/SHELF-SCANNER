/* ==========================================
   SHELF-SCANNER APPLICATION LOGIC (PORTAL)
   ========================================== */

// 1. Safe localStorage wrapper
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

// 2. Global Toast Notification Helper
function showToast(message, type = 'info', duration = 3200) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-circle-exclamation';
    if (type === 'warning') icon = 'fa-triangle-exclamation';
    
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 350);
    }, duration);
}

// 3. Helper: Convert Base64 DataURL to File object
function dataURLtoFile(dataurl, filename) {
    try {
        const arr = dataurl.split(',');
        const mimeMatch = arr[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, { type: mime });
    } catch (e) {
        console.error("dataURLtoFile conversion failed:", e);
        return null;
    }
}

// 4. Global Application State
const state = {
    apiMode: 'backend',          // 'backend' or 'direct'
    geminiApiKey: '',            // Kept in localStorage
    activeTab: 'uploadTab',
    selectedImageBase64: null,   // Data URL of the selected image
    selectedImageFile: null,     // Raw file object for local multipart upload
    stream: null,                // Camera stream object
    library: [],                 // Local persistent library catalog
    currentResults: null,        // Currently scanned AI results
    exportFormat: 'json'         // Active export format
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    
    // DOM Elements - Header & Navigation
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const sidebar = document.getElementById('sidebar');
    const navItems = document.querySelectorAll('.nav-item');
    const pageViews = document.querySelectorAll('.page-view');
    const ctaScanTriggers = document.querySelectorAll('.cta-scan-trigger');
    const themeToggleBtn = document.getElementById('themeToggleBtn');

    // Modals & Triggers
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
    const contactForm = document.getElementById('contactForm');

    // Legal Modals
    const footerPrivacyLink = document.getElementById('footerPrivacyLink');
    const footerTermsLink = document.getElementById('footerTermsLink');
    const privacyModal = document.getElementById('privacyModal');
    const termsModal = document.getElementById('termsModal');
    const closePrivacyModal = document.getElementById('closePrivacyModal');
    const closePrivacyBtn = document.getElementById('closePrivacyBtn');
    const closeTermsModal = document.getElementById('closeTermsModal');
    const closeTermsBtn = document.getElementById('closeTermsBtn');

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
    const demoShelfBtn = document.getElementById('demoShelfBtn');
    const homeDemoShelfBtn = document.getElementById('homeDemoShelfBtn');

    // Webcam components
    const webcam = document.getElementById('webcam');
    const photoCanvas = document.getElementById('photoCanvas');
    const captureBtn = document.getElementById('captureBtn');

    // Results components
    const resultsPlaceholder = document.getElementById('resultsPlaceholder');
    const resultsLoading = document.getElementById('resultsLoading');
    const resultsContent = document.getElementById('resultsContent');
    const resultShelfTaste = document.getElementById('resultShelfTaste');
    const resultShelfTitle = document.getElementById('resultShelfTitle');
    const resultShelfSummary = document.getElementById('resultShelfSummary');
    const detectedBooksList = document.getElementById('detectedBooksList');
    const detectedCountBadge = document.getElementById('detectedCountBadge');
    const recommendationsContainer = document.getElementById('recommendationsContainer');
    const copyResultsBtn = document.getElementById('copyResultsBtn');
    const saveAllToLibraryBtn = document.getElementById('saveAllToLibraryBtn');

    // Library DOM Components
    const virtualShelfContainer = document.getElementById('virtualShelfContainer');
    const librarySearchInput = document.getElementById('librarySearchInput');
    const libraryGenreFilter = document.getElementById('libraryGenreFilter');
    const statTotalBooks = document.getElementById('statTotalBooks');
    const statTotalGenres = document.getElementById('statTotalGenres');
    const addBookManualBtn = document.getElementById('addBookManualBtn');
    const importLibraryBtn = document.getElementById('importLibraryBtn');
    const exportLibraryBtn = document.getElementById('exportLibraryBtn');
    const clearLibraryBtn = document.getElementById('clearLibraryBtn');

    // Import Modal
    const importModal = document.getElementById('importModal');
    const closeImportModal = document.getElementById('closeImportModal');
    const cancelImport = document.getElementById('cancelImport');
    const saveImportBtn = document.getElementById('saveImportBtn');
    const loadSampleLibraryBtn = document.getElementById('loadSampleLibraryBtn');
    const importPastedTitles = document.getElementById('importPastedTitles');

    // Manual Add Modal
    const addBookModal = document.getElementById('addBookModal');
    const closeAddBookModal = document.getElementById('closeAddBookModal');
    const cancelAddBook = document.getElementById('cancelAddBook');
    const saveManualBookBtn = document.getElementById('saveManualBookBtn');
    const manualBookTitle = document.getElementById('manualBookTitle');
    const manualBookAuthor = document.getElementById('manualBookAuthor');
    const manualBookGenre = document.getElementById('manualBookGenre');
    const manualBookNotes = document.getElementById('manualBookNotes');

    // Book Detail Modal
    const bookDetailModal = document.getElementById('bookDetailModal');
    const closeBookDetailModal = document.getElementById('closeBookDetailModal');
    const bookDetailContent = document.getElementById('bookDetailContent');

    // Export Modal
    const exportModal = document.getElementById('exportModal');
    const closeExportModal = document.getElementById('closeExportModal');
    const closeExportBtn = document.getElementById('closeExportBtn');
    const exportPreviewArea = document.getElementById('exportPreviewArea');
    const copyExportBtn = document.getElementById('copyExportBtn');
    const downloadExportBtn = document.getElementById('downloadExportBtn');
    const exportTypeBtns = document.querySelectorAll('.export-type-btn');

    // ==========================================
    // 5. Initializers
    // ==========================================
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
        renderShelf();
        populateGenreFilter();
    }

    initSettings();

    // ==========================================
    // 6. Navigation & Routing
    // ==========================================
    function showPage(pageId) {
        pageViews.forEach(view => view.classList.remove('active'));
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

        // Manage camera lifecycle
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

        document.addEventListener('click', (e) => {
            if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== hamburgerBtn) {
                sidebar.classList.remove('open');
            }
        });
    }

    // Theme Switch
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const isLight = document.body.classList.toggle('light-theme');
            safeStorage.setItem('shelf_scanner_theme', isLight ? 'light' : 'dark');
            updateThemeIcon(isLight);
            showToast(`Switched to ${isLight ? 'Light' : 'Dark'} theme`, 'info', 1800);
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

    // ==========================================
    // 7. Modals Manager
    // ==========================================
    const openModal = (m) => { if (m) m.style.display = 'flex'; };
    const hideModal = (m) => { if (m) m.style.display = 'none'; };

    // Settings Modal
    const triggerSettings = (e) => {
        if (e) e.preventDefault();
        initSettings();
        openModal(settingsModal);
        if (sidebar) sidebar.classList.remove('open');
    };
    if (settingsBtn) settingsBtn.addEventListener('click', triggerSettings);
    if (sidebarSettingsBtn) sidebarSettingsBtn.addEventListener('click', triggerSettings);
    if (closeSettings) closeSettings.addEventListener('click', () => hideModal(settingsModal));
    if (cancelSettings) cancelSettings.addEventListener('click', () => hideModal(settingsModal));

    document.getElementsByName('apiMode').forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (apiKeyContainer) {
                apiKeyContainer.style.display = (e.target.value === 'direct') ? 'block' : 'none';
            }
        });
    });

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
                showToast('Please enter a valid Gemini API Key for Direct Mode.', 'warning');
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
            showToast('Settings saved successfully!', 'success');
        });
    }

    // Donate Modals
    [donateBtn, sidebarDonateBtn].forEach(t => {
        if (t) t.addEventListener('click', () => openModal(donateModal));
    });
    if (closeDonateModal) closeDonateModal.addEventListener('click', () => hideModal(donateModal));
    if (closeDonateBtn) closeDonateBtn.addEventListener('click', () => hideModal(donateModal));

    // Contact Modals
    if (contactBtn) contactBtn.addEventListener('click', () => openModal(contactModal));
    if (closeContactModal) closeContactModal.addEventListener('click', () => hideModal(contactModal));
    if (cancelContact) cancelContact.addEventListener('click', () => hideModal(contactModal));
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            contactForm.reset();
            hideModal(contactModal);
            showToast('Message sent successfully! We will get back to you.', 'success');
        });
    }

    // Legal Modals
    if (footerPrivacyLink) {
        footerPrivacyLink.addEventListener('click', (e) => {
            e.preventDefault();
            openModal(privacyModal);
        });
    }
    if (closePrivacyModal) closePrivacyModal.addEventListener('click', () => hideModal(privacyModal));
    if (closePrivacyBtn) closePrivacyBtn.addEventListener('click', () => hideModal(privacyModal));

    if (footerTermsLink) {
        footerTermsLink.addEventListener('click', (e) => {
            e.preventDefault();
            openModal(termsModal);
        });
    }
    if (closeTermsModal) closeTermsModal.addEventListener('click', () => hideModal(termsModal));
    if (closeTermsBtn) closeTermsBtn.addEventListener('click', () => hideModal(termsModal));

    // Global backdrop click to dismiss modals
    window.addEventListener('click', (e) => {
        const modals = [settingsModal, importModal, addBookModal, bookDetailModal, exportModal, donateModal, contactModal, privacyModal, termsModal];
        modals.forEach(m => {
            if (e.target === m) hideModal(m);
        });
    });

    // ==========================================
    // 8. Camera Controls & Capturing
    // ==========================================
    async function startCamera() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showToast('Camera APIs are not supported on this device/connection.', 'warning');
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
            showToast('Could not access camera. Please check permissions.', 'error');
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
            state.selectedImageFile = dataURLtoFile(dataUrl, 'scanned_shelf.jpg');
            
            stopCamera();
            showPreview(dataUrl);
            showToast('Bookshelf image captured! Click Scan Bookshelf.', 'info');
        });
    }

    // ==========================================
    // 9. File Selection & Drag-and-Drop
    // ==========================================
    if (dropZone && fileInput) {
        dropZone.addEventListener('click', (e) => {
            if (e.target !== fileInput && !e.target.closest('label') && !e.target.closest('#demoShelfBtn')) {
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
            showToast(`Selected file is not an image (${file.type || 'unknown'}).`, 'error');
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

    // Demo Bookshelf Loader
    async function loadDemoShelf() {
        try {
            showPage('scannerPage');
            const response = await fetch('./test_book.jpg');
            if (!response.ok) throw new Error('Demo bookshelf asset not found');
            const blob = await response.blob();
            const file = new File([blob], 'demo_bookshelf.jpg', { type: 'image/jpeg' });
            handleFileSelect(file);
            showToast('Demo bookshelf loaded! Click Scan Bookshelf to test.', 'success');
        } catch (err) {
            console.error('Failed to load demo shelf:', err);
            showToast('Could not load demo shelf photo.', 'error');
        }
    }

    if (demoShelfBtn) demoShelfBtn.addEventListener('click', loadDemoShelf);
    if (homeDemoShelfBtn) homeDemoShelfBtn.addEventListener('click', loadDemoShelf);

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

    // ==========================================
    // 10. AI Bookshelf Scanning Logic
    // ==========================================
    if (scanBtn) {
        scanBtn.addEventListener('click', async () => {
            if (!state.selectedImageBase64) {
                showToast('Please upload or snap a photo of your bookshelf first.', 'warning');
                return;
            }
            
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
                
                state.currentResults = resultData;

                // Automatically merge newly discovered books to library
                if (resultData.scanned_books && resultData.scanned_books.length > 0) {
                    let addedCount = 0;
                    resultData.scanned_books.forEach(scannedBook => {
                        const exists = state.library.some(b => b.title.toLowerCase() === scannedBook.title.toLowerCase());
                        if (!exists) {
                            state.library.push({
                                title: scannedBook.title,
                                author: scannedBook.author,
                                genre: scannedBook.genre || 'General',
                                shelf_summary: resultData.shelf_summary,
                                notes: `Scanned from bookshelf on ${new Date().toLocaleDateString()}`,
                                recommendations: resultData.recommendations
                            });
                            addedCount++;
                        }
                    });
                    if (addedCount > 0) {
                        saveLibrary();
                    }
                }

                renderResults(resultData);
                showToast('Bookshelf analyzed successfully!', 'success');
                
            } catch (err) {
                console.error("Scan error:", err);
                showToast(`Scanning failed: ${err.message || err}`, 'error', 5000);
                
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
            throw new Error(errDetails.detail || `Backend server error (${response.status})`);
        }
        
        return await response.json();
    }

    async function scanDirectly() {
        if (!state.geminiApiKey) {
            triggerSettings();
            throw new Error("Gemini API Key is missing. Please enter your API key in Settings.");
        }
        
        const commaIndex = state.selectedImageBase64.indexOf(',');
        const base64Data = state.selectedImageBase64.substring(commaIndex + 1);
        const mimeType = state.selectedImageBase64.substring(5, state.selectedImageBase64.indexOf(';'));
        
        const prefValue = preferencesInput ? preferencesInput.value.trim() : '';
        
        let prompt = `Analyze this image containing a bookshelf or a collection of books. Identify as many visible books as you can (up to 10 books) and list their titles, authors, and genres. Provide a brief 1-2 sentence summary of the user's reading taste based on these books. Finally, recommend 3 other books they might enjoy with thoughtful reasons.`;
        
        if (prefValue) {
            prompt += `\nNote: The user has specified the following reading preferences/topics they are interested in right now: '${prefValue}'. Prioritize recommendations that match these topics while still complementing the existing books on the shelf.`;
        }
        
        // Models supported: gemini-2.5-flash / gemini-1.5-flash / gemini-2.0-flash
        const modelName = 'gemini-2.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${state.geminiApiKey}`;
        
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
            throw new Error(errDetails.error?.message || `Gemini API error (${response.status})`);
        }
        
        const responseData = await response.json();
        const textResponse = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!textResponse) {
            throw new Error("Empty response received from Gemini.");
        }
        
        return JSON.parse(textResponse);
    }

    // ==========================================
    // 11. Render Results
    // ==========================================
    function renderResults(data) {
        if (resultsLoading) resultsLoading.style.display = 'none';
        
        if (resultShelfSummary) resultShelfSummary.textContent = data.shelf_summary;
        
        // Render Scanned Books List
        if (detectedBooksList) {
            detectedBooksList.innerHTML = '';
            const books = data.scanned_books || [];
            
            if (detectedCountBadge) {
                detectedCountBadge.textContent = `${books.length} book${books.length === 1 ? '' : 's'}`;
            }

            if (books.length > 0) {
                books.forEach(book => {
                    const li = document.createElement('li');
                    li.className = 'detected-book-item';
                    
                    const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(book.title + ' ' + book.author + ' book')}`;
                    
                    li.innerHTML = `
                        <div class="detected-item-info">
                            <span class="detected-title">${book.title}</span>
                            <span class="detected-author">by ${book.author}</span>
                        </div>
                        <div class="detected-item-actions">
                            <span class="genre-tag">${book.genre || 'General'}</span>
                            <a href="${googleSearchUrl}" target="_blank" class="detected-link-btn" title="Search Online"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>
                        </div>
                    `;
                    detectedBooksList.appendChild(li);
                });
            } else {
                detectedBooksList.innerHTML = '<li class="no-books-msg">No books recognized clearly. Try a clearer or closer shot.</li>';
            }
        }
        
        // Render Recommendations
        if (recommendationsContainer) {
            recommendationsContainer.innerHTML = '';
            const recs = data.recommendations || [];
            
            if (recs.length > 0) {
                recs.forEach((rec, index) => {
                    const titleHue = Math.abs(hashCode(rec.title)) % 360;
                    const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(rec.title + ' ' + rec.author + ' book')}`;
                    const goodreadsUrl = `https://www.goodreads.com/search?q=${encodeURIComponent(rec.title + ' ' + rec.author)}`;
                    
                    const card = document.createElement('div');
                    card.className = 'rec-card card';
                    
                    card.innerHTML = `
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
                                <div class="rec-top-row">
                                    <h3 class="rec-title">${rec.title}</h3>
                                    <div class="rec-actions-group">
                                        <a href="${googleSearchUrl}" target="_blank" class="btn btn-icon btn-sm" title="Google Books Search"><i class="fa-solid fa-magnifying-glass"></i> Google</a>
                                        <a href="${goodreadsUrl}" target="_blank" class="btn btn-icon btn-sm" title="Goodreads"><i class="fa-solid fa-book-bookmark"></i> Goodreads</a>
                                        <button class="btn btn-primary btn-sm add-rec-to-lib-btn" title="Save to Reading Library"><i class="fa-solid fa-plus"></i> Add to Shelf</button>
                                    </div>
                                </div>
                                <p class="rec-author">by ${rec.author}</p>
                                <div class="rec-reason">
                                    <i class="fa-solid fa-quote-left quote-icon"></i>
                                    <p>${rec.reason}</p>
                                </div>
                            </div>
                        </div>
                    `;
                    
                    const addBtn = card.querySelector('.add-rec-to-lib-btn');
                    if (addBtn) {
                        addBtn.addEventListener('click', () => {
                            const exists = state.library.some(b => b.title.toLowerCase() === rec.title.toLowerCase());
                            if (!exists) {
                                state.library.push({
                                    title: rec.title,
                                    author: rec.author,
                                    genre: 'Recommendation',
                                    shelf_summary: rec.reason,
                                    notes: `Recommended because: ${rec.reason}`,
                                    recommendations: []
                                });
                                saveLibrary();
                                showToast(`Saved "${rec.title}" to Reading Library!`, 'success');
                                addBtn.innerHTML = '<i class="fa-solid fa-check"></i> Added';
                                addBtn.classList.replace('btn-primary', 'btn-secondary');
                                addBtn.disabled = true;
                            } else {
                                showToast(`"${rec.title}" is already in your library.`, 'info');
                            }
                        });
                    }
                    
                    recommendationsContainer.appendChild(card);
                });
            } else {
                recommendationsContainer.innerHTML = '<div class="card empty-state-box">No recommendations generated.</div>';
            }
        }
        
        if (resultsContent) resultsContent.style.display = 'block';
    }

    // Copy Results
    if (copyResultsBtn) {
        copyResultsBtn.addEventListener('click', () => {
            if (!state.currentResults) return;
            const res = state.currentResults;
            
            let text = `📚 ShelfScanner Analysis & Recommendations\n\n`;
            text += `Taste Profile:\n${res.shelf_summary}\n\n`;
            
            if (res.scanned_books && res.scanned_books.length > 0) {
                text += `Scanned Books:\n`;
                res.scanned_books.forEach(b => {
                    text += `• ${b.title} by ${b.author} (${b.genre})\n`;
                });
                text += `\n`;
            }
            
            if (res.recommendations && res.recommendations.length > 0) {
                text += `Recommended for You:\n`;
                res.recommendations.forEach((r, i) => {
                    text += `${i + 1}. ${r.title} by ${r.author}\n   Why: ${r.reason}\n\n`;
                });
            }
            
            navigator.clipboard.writeText(text).then(() => {
                showToast('Recommendations copied to clipboard!', 'success');
            }).catch(err => {
                console.error("Copy failed:", err);
                showToast('Failed to copy to clipboard.', 'error');
            });
        });
    }

    // Save All to Library
    if (saveAllToLibraryBtn) {
        saveAllToLibraryBtn.addEventListener('click', () => {
            if (!state.currentResults) return;
            const res = state.currentResults;
            let addedCount = 0;
            
            if (res.scanned_books) {
                res.scanned_books.forEach(b => {
                    const exists = state.library.some(item => item.title.toLowerCase() === b.title.toLowerCase());
                    if (!exists) {
                        state.library.push({
                            title: b.title,
                            author: b.author,
                            genre: b.genre || 'General',
                            shelf_summary: res.shelf_summary,
                            notes: `Scanned on ${new Date().toLocaleDateString()}`,
                            recommendations: res.recommendations
                        });
                        addedCount++;
                    }
                });
            }
            
            if (res.recommendations) {
                res.recommendations.forEach(r => {
                    const exists = state.library.some(item => item.title.toLowerCase() === r.title.toLowerCase());
                    if (!exists) {
                        state.library.push({
                            title: r.title,
                            author: r.author,
                            genre: 'Recommendation',
                            shelf_summary: r.reason,
                            notes: `Recommended read: ${r.reason}`,
                            recommendations: []
                        });
                        addedCount++;
                    }
                });
            }
            
            saveLibrary();
            showToast(`Saved ${addedCount} new books to your Reading Library!`, 'success');
        });
    }

    // ==========================================
    // 12. Reading Library Management (CRUD + Shelf)
    // ==========================================
    function renderShelf() {
        if (!virtualShelfContainer) return;
        virtualShelfContainer.innerHTML = '';
        
        const searchQuery = librarySearchInput ? librarySearchInput.value.toLowerCase().trim() : '';
        const selectedGenre = libraryGenreFilter ? libraryGenreFilter.value : 'all';
        
        const filteredBooks = state.library.filter(book => {
            const matchesSearch = (book.title || '').toLowerCase().includes(searchQuery) || 
                                 (book.author || '').toLowerCase().includes(searchQuery);
            const matchesGenre = selectedGenre === 'all' || (book.genre || 'General') === selectedGenre;
            return matchesSearch && matchesGenre;
        });
        
        // Update stats
        if (statTotalBooks) statTotalBooks.textContent = state.library.length;
        if (statTotalGenres) {
            const uniqueGenres = new Set(state.library.map(b => b.genre || 'General'));
            statTotalGenres.textContent = uniqueGenres.size;
        }
        
        if (filteredBooks.length === 0) {
            virtualShelfContainer.innerHTML = `
                <div class="empty-shelf-message">
                    <i class="fa-solid fa-folder-open empty-shelf-icon"></i>
                    <h3>Your reading library is empty</h3>
                    <p>Go to the <strong>Book Scanner</strong> to scan books, click <strong>Add Book</strong>, or <strong>Import</strong> your Goodreads library.</p>
                </div>
            `;
            return;
        }
        
        const booksPerShelf = 7;
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
                    openBookDetailModal(book);
                });
                
                shelfRow.appendChild(bookItem);
            });
            
            virtualShelfContainer.appendChild(shelfRow);
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

    if (librarySearchInput) {
        librarySearchInput.addEventListener('input', renderShelf);
    }
    if (libraryGenreFilter) {
        libraryGenreFilter.addEventListener('change', renderShelf);
    }

    // ==========================================
    // 13. Book Details Modal
    // ==========================================
    function openBookDetailModal(book) {
        if (!bookDetailContent) return;
        
        const titleHue = Math.abs(hashCode(book.title)) % 360;
        const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(book.title + ' ' + book.author + ' book')}`;
        const goodreadsUrl = `https://www.goodreads.com/search?q=${encodeURIComponent(book.title + ' ' + book.author)}`;
        const amazonUrl = `https://www.amazon.com/s?k=${encodeURIComponent(book.title + ' ' + book.author + ' book')}`;

        bookDetailContent.innerHTML = `
            <div class="detail-left">
                <div class="dynamic-cover-wrapper">
                    <div class="css-book modal-cover">
                        <div class="book-spine" style="background: hsl(${titleHue}, 60%, 35%)"></div>
                        <div class="book-page"></div>
                        <div class="book-cover" style="background: linear-gradient(135deg, hsl(${titleHue}, 70%, 45%) 0%, hsl(${(titleHue + 40) % 360}, 75%, 25%) 100%)">
                            <div class="cover-design">
                                <div class="cover-accent-line"></div>
                                <h4>${truncateText(book.title, 40)}</h4>
                                <p>${truncateText(book.author, 20)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="detail-right">
                <span class="badge">${book.genre || 'General'}</span>
                <h1 class="detail-title">${book.title}</h1>
                <h3 class="detail-author">by ${book.author}</h3>
                
                <div class="detail-section">
                    <h4><i class="fa-solid fa-align-left"></i> Summary & Notes</h4>
                    <p class="detail-summary">${book.shelf_summary || book.notes || 'No description available for this book.'}</p>
                </div>
                
                <div class="detail-actions-row">
                    <a href="${googleUrl}" target="_blank" class="btn btn-secondary btn-sm"><i class="fa-solid fa-magnifying-glass"></i> Google Books</a>
                    <a href="${goodreadsUrl}" target="_blank" class="btn btn-secondary btn-sm"><i class="fa-solid fa-book-bookmark"></i> Goodreads</a>
                    <a href="${amazonUrl}" target="_blank" class="btn btn-secondary btn-sm"><i class="fa-brands fa-amazon"></i> Amazon</a>
                    <button id="deleteBookBtn" class="btn btn-danger-icon" title="Remove from Library"><i class="fa-solid fa-trash-can"></i> Remove</button>
                </div>
            </div>
        `;

        const deleteBtn = bookDetailContent.querySelector('#deleteBookBtn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                state.library = state.library.filter(b => b.title.toLowerCase() !== book.title.toLowerCase());
                saveLibrary();
                hideModal(bookDetailModal);
                showToast(`Removed "${book.title}" from your library.`, 'info');
            });
        }

        openModal(bookDetailModal);
    }

    if (closeBookDetailModal) {
        closeBookDetailModal.addEventListener('click', () => hideModal(bookDetailModal));
    }

    // ==========================================
    // 14. Manual Add Book Modal
    // ==========================================
    if (addBookManualBtn) {
        addBookManualBtn.addEventListener('click', () => {
            if (manualBookTitle) manualBookTitle.value = '';
            if (manualBookAuthor) manualBookAuthor.value = '';
            if (manualBookGenre) manualBookGenre.value = '';
            if (manualBookNotes) manualBookNotes.value = '';
            openModal(addBookModal);
        });
    }

    if (closeAddBookModal) closeAddBookModal.addEventListener('click', () => hideModal(addBookModal));
    if (cancelAddBook) cancelAddBook.addEventListener('click', () => hideModal(addBookModal));

    if (saveManualBookBtn) {
        saveManualBookBtn.addEventListener('click', () => {
            const title = manualBookTitle ? manualBookTitle.value.trim() : '';
            const author = manualBookAuthor ? manualBookAuthor.value.trim() : '';
            const genre = manualBookGenre ? manualBookGenre.value.trim() : 'General';
            const notes = manualBookNotes ? manualBookNotes.value.trim() : '';

            if (!title || !author) {
                showToast('Please enter both Title and Author.', 'warning');
                return;
            }

            const exists = state.library.some(b => b.title.toLowerCase() === title.toLowerCase());
            if (exists) {
                showToast('A book with this title is already on your shelf.', 'warning');
                return;
            }

            state.library.push({
                title: title,
                author: author,
                genre: genre || 'General',
                shelf_summary: notes || `Added manually to library on ${new Date().toLocaleDateString()}`,
                notes: notes,
                recommendations: []
            });

            saveLibrary();
            hideModal(addBookModal);
            showToast(`Added "${title}" to your Reading Library!`, 'success');
        });
    }

    // ==========================================
    // 15. Export Library Modal
    // ==========================================
    function generateExportPreview(format) {
        if (!exportPreviewArea) return '';
        
        let output = '';
        if (format === 'json') {
            output = JSON.stringify(state.library, null, 2);
        } else if (format === 'csv') {
            output = 'Title,Author,Genre,Notes\n';
            state.library.forEach(b => {
                const cleanTitle = `"${(b.title || '').replace(/"/g, '""')}"`;
                const cleanAuthor = `"${(b.author || '').replace(/"/g, '""')}"`;
                const cleanGenre = `"${(b.genre || '').replace(/"/g, '""')}"`;
                const cleanNotes = `"${(b.shelf_summary || b.notes || '').replace(/"/g, '""')}"`;
                output += `${cleanTitle},${cleanAuthor},${cleanGenre},${cleanNotes}\n`;
            });
        } else if (format === 'markdown') {
            output = `# My ShelfScanner Reading Library\n\n`;
            output += `| Title | Author | Genre |\n| :--- | :--- | :--- |\n`;
            state.library.forEach(b => {
                output += `| ${b.title} | ${b.author} | ${b.genre || 'General'} |\n`;
            });
        } else if (format === 'text') {
            output = `MY READING LIBRARY (${state.library.length} Books)\n====================================\n\n`;
            state.library.forEach((b, i) => {
                output += `${i + 1}. ${b.title} - ${b.author} [${b.genre || 'General'}]\n`;
            });
        }
        
        exportPreviewArea.value = output;
        return output;
    }

    if (exportLibraryBtn) {
        exportLibraryBtn.addEventListener('click', () => {
            if (state.library.length === 0) {
                showToast('Your reading library is empty. Nothing to export.', 'warning');
                return;
            }
            generateExportPreview(state.exportFormat);
            openModal(exportModal);
        });
    }

    if (closeExportModal) closeExportModal.addEventListener('click', () => hideModal(exportModal));
    if (closeExportBtn) closeExportBtn.addEventListener('click', () => hideModal(exportModal));

    exportTypeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            exportTypeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.exportFormat = btn.getAttribute('data-format') || 'json';
            generateExportPreview(state.exportFormat);
        });
    });

    if (copyExportBtn && exportPreviewArea) {
        copyExportBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(exportPreviewArea.value).then(() => {
                showToast('Library exported text copied to clipboard!', 'success');
            }).catch(() => {
                showToast('Failed to copy export to clipboard.', 'error');
            });
        });
    }

    if (downloadExportBtn && exportPreviewArea) {
        downloadExportBtn.addEventListener('click', () => {
            const content = exportPreviewArea.value;
            const format = state.exportFormat;
            let mime = 'text/plain';
            let ext = 'txt';
            
            if (format === 'json') { mime = 'application/json'; ext = 'json'; }
            if (format === 'csv') { mime = 'text/csv'; ext = 'csv'; }
            if (format === 'markdown') { mime = 'text/markdown'; ext = 'md'; }
            
            const blob = new Blob([content], { type: mime });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `shelfscanner_library.${ext}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast(`Downloaded shelfscanner_library.${ext}!`, 'success');
        });
    }

    // Clear Library
    if (clearLibraryBtn) {
        clearLibraryBtn.addEventListener('click', () => {
            if (state.library.length === 0) {
                showToast('Library is already empty.', 'info');
                return;
            }
            if (confirm('Are you sure you want to clear your entire reading library?')) {
                state.library = [];
                saveLibrary();
                showToast('Reading Library cleared.', 'info');
            }
        });
    }

    // ==========================================
    // 16. Import Goodreads Library Modal
    // ==========================================
    if (importLibraryBtn) {
        importLibraryBtn.addEventListener('click', () => openModal(importModal));
    }
    if (closeImportModal) closeImportModal.addEventListener('click', () => hideModal(importModal));
    if (cancelImport) cancelImport.addEventListener('click', () => hideModal(importModal));

    // Populate Starter Goodreads Library
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
                        { title: "Homo Deus", author: "Yuval Noah Harari", reason: "The sequel to Sapiens, examining the future of humanity and our transition into tech entities." },
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
            
            let added = 0;
            samples.forEach(sample => {
                const exists = state.library.some(b => b.title.toLowerCase() === sample.title.toLowerCase());
                if (!exists) {
                    state.library.push(sample);
                    added++;
                }
            });
            
            saveLibrary();
            hideModal(importModal);
            showToast(`Loaded ${added} curated sample books into your library!`, 'success');
        });
    }

    if (saveImportBtn && importPastedTitles) {
        saveImportBtn.addEventListener('click', () => {
            const text = importPastedTitles.value.trim();
            if (!text) {
                showToast("Please paste some book titles first.", "warning");
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
                        shelf_summary: `Imported book profile.`,
                        notes: `Imported title: ${title} by ${author}`,
                        recommendations: []
                    });
                    importedCount++;
                }
            });
            
            if (importedCount > 0) {
                saveLibrary();
                importPastedTitles.value = '';
                showToast(`Imported ${importedCount} books successfully!`, 'success');
            } else {
                showToast("No new books were added (they might already exist in your library).", "info");
            }
            
            hideModal(importModal);
        });
    }

    // ==========================================
    // 17. Helpers
    // ==========================================
    function truncateText(str, maxLength) {
        if (!str) return '';
        if (str.length <= maxLength) return str;
        return str.substring(0, maxLength - 3) + '...';
    }

    function hashCode(str) {
        let hash = 0;
        if (!str) return hash;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        return hash;
    }
});
