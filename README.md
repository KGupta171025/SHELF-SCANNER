# 📚 SHELF-SCANNER: AI-Powered Bookshelf Analyzer & Discovery Engine

[![Cloudflare Workers](https://img.shields.io/badge/Main%20Live%20Site-Cloudflare%20Workers-F38020?style=for-the-badge&logo=cloudflare)](https://shelf-scanner.hg497kg.workers.dev/)
[![GitHub Pages](https://img.shields.io/badge/Mirror%20(Auto--Redirect)-GitHub%20Pages-blue?style=for-the-badge&logo=github)](https://kgupta171025.github.io/SHELF-SCANNER/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Google Gemini](https://img.shields.io/badge/AI-Google%20Gemini-4285F4?style=for-the-badge&logo=google)](https://ai.google.dev/)

**🌟 Main Live Application:** [https://shelf-scanner.hg497kg.workers.dev/](https://shelf-scanner.hg497kg.workers.dev/)  
**🔄 GitHub Pages (Auto-Redirects to Main):** [https://kgupta171025.github.io/SHELF-SCANNER/](https://kgupta171025.github.io/SHELF-SCANNER/)  
**GitHub Repository:** [https://github.com/KGupta171025/SHELF-SCANNER](https://github.com/KGupta171025/SHELF-SCANNER)

**SHELF-SCANNER** is an interactive web application that scans entire physical bookshelves from a single photograph, recognizes multiple book titles and authors, builds your personal reading taste profile, and generates personalized book recommendations using Google's state-of-the-art **Gemini Vision** AI.

Designed for both **local development** and **production serverless hosting**, it runs seamlessly in two modes:
1. **Local Mode:** Connects to a local Python FastAPI backend server (`http://localhost:8000`).
2. **Serverless Mode:** Runs 100% in-browser using direct Gemini REST APIs on Cloudflare Workers / GitHub Pages.

---

## ✨ Features

- **📸 Bookshelf AI Vision:** Scans photos of bookshelves to identify titles, authors, and genres (up to 10 books at once).
- **💡 Personalized Recommendations:** Suggests 3 companion reads with AI rationale explaining why you'll love each book.
- **✨ Reading Taste Refinement:** Add optional interests in real-time (e.g., *"sci-fi with philosophical themes"*, *"startup scaling"*, *"fast-paced thrillers"*).
- **🧪 1-Click Demo Shelf:** Test the analyzer instantly without needing a physical bookshelf photo.
- **📖 My Reading Library:** Persistent virtual bookshelf gallery that organizes scanned and imported books on wooden shelves with search and genre filtering.
- **🔍 Quick Book Discovery Links:** 1-click links to Google Books, Goodreads, and Amazon for every detected and recommended title.
- **📋 Copy & Share Recommendations:** Copy structured recommendation lists and taste profiles to your clipboard in 1 click.
- **📥 Import & Export Library:** Import Goodreads libraries or paste book lists; export your collection to JSON, CSV, Markdown, or Plain Text.
- **🎨 3D CSS Book Covers:** Generates interactive 3D books with deterministic color grading based on book titles.
- **🌓 Light & Dark Themes:** Smooth glassmorphic design system with persistent theme toggling.
- **🔒 Private & Secure:** Your Gemini API key is stored strictly in your browser's `localStorage` and is never sent to third-party servers.

---

## 🛠️ Project Structure

```text
SHELF-SCANNER/
├── backend/
│   └── main.py          # FastAPI server with CORS & Gemini SDK integration
├── scripts/
│   └── test_gemini.py   # CLI testing script to verify Gemini integration
├── index.html           # Single Page Application HTML structure (root level)
├── style.css            # Glassmorphic dark/light styling & 3D CSS keyframes
├── app.js               # Camera stream, uploader, library CRUD & Gemini API client
├── favicon.svg          # Open-book brand favicon icon
├── test_book.jpg        # Demo sample bookshelf image
├── .nojekyll            # Ensures GitHub Pages serves all assets
├── .env                 # Local secrets (ignored by Git)
├── .gitignore           # Excludes virtual environments and keys from git tracking
├── pyproject.toml       # Python package configuration (managed by uv)
└── README.md            # Project documentation
```

---

## 🚀 Local Setup & Run

### Prerequisites
- Install [uv](https://github.com/astral-sh/uv) (fast Python package installer & manager).
- Get a Gemini API Key from [Google AI Studio](https://aistudio.google.com/).

### 1. Configure local secrets
Add your Gemini API key to a `.env` file in the root directory:
```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

### 2. Test via Terminal (CLI Mode)
To verify your API key and AI connection from the command line:
```bash
# General analysis
uv run scripts/test_gemini.py test_book.jpg

# Analysis with custom preferences
uv run scripts/test_gemini.py test_book.jpg "machine learning deep dive"
```

### 3. Run FastAPI Backend
Launch the backend server on port 8000:
```bash
uv run uvicorn backend.main:app --reload --port 8000
```
Backend API documentation will be available at: `http://localhost:8000/docs`.

### 4. Serve the Frontend
Serve the root directory using any local HTTP server:
```bash
# Using Python
python -m http.server 5500
```
Open **`http://localhost:5500`** in your browser.

---

## 🌐 Deploying to GitHub Pages (Serverless)

Because the frontend is 100% client-side and can connect directly to the Gemini API, it runs on **GitHub Pages** with zero hosting costs:

1. Push this repository to GitHub: `https://github.com/KGupta171025/SHELF-SCANNER`.
2. Go to **Settings > Pages** in your GitHub repository.
3. Under **Build and deployment**:
   - **Source:** Deploy from a branch
   - **Branch:** `main`
   - **Folder:** `/ (root)`
4. Click **Save**.
5. Open your live site, click **Settings** (gear icon in the top navigation), select **Direct Gemini API**, paste your API key, and start scanning!

---

## 📄 License
This project is open-source and available under the MIT License.
