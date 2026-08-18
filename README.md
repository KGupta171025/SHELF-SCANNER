# 📚 SHELF-SCANNER: AI-Powered Bookshelf Analyzer & Discovery Engine

SHELF-SCANNER is an interactive, single-page web application that scans entire physical bookshelves from a photo, identifies multiple books in the collection, analyzes your reading taste, and generates highly personalized recommendations using Google's state-of-the-art **Gemini 3.6 Flash** model.

Designed for both **local development** and **production serverless hosting**, it runs as a dual-mode application:
1. **Local Mode:** Communicates with a local Python FastAPI backend server.
2. **Serverless Mode:** Runs 100% in-browser using direct Gemini REST APIs—perfect for free static hosting like **GitHub Pages**.

---

## ✨ Features

- **Bookshelf Scanning:** Scans a photo of your bookshelf or multiple books to identify titles, authors, and genres (up to 10 books).
- **Personalized Recommendations:** Suggests 3 new books based on your shelf collection and your overall reading habits.
- **Reading Taste Refinement:** Provides an input box to customize recommendations in real-time (e.g. "philosophy", "startup advice", "quick fiction reads").
- **Dynamic 3D Covers:** Renders recommended books as interactive **3D CSS book covers** that shade themselves with a unique color gradient determined by the book's title hashing.
- **Multimodal Uploads:** Captures live images via your webcam or supports drag-and-drop file uploads.
- **Secure Key Management:** Input your own Gemini API key in the settings panel—stored safely in your browser's local sandbox (`localStorage`) so it's never checked into source control.

---

## 🛠️ Project Structure

```text
SHELF-SCANNER/
├── backend/
│   └── main.py          # FastAPI server with CORS & Gemini GenAI API Integration
├── scripts/
│   └── test_gemini.py   # CLI testing script to verify Gemini integration
├── index.html           # Single Page Application HTML structure (root level)
├── style.css            # Glassmorphic dark styling & keyframe animations (root level)
├── app.js               # Live camera, uploader, & API routing scripts (root level)
├── .env                 # Local secrets (ignored by Git)
├── .gitignore           # Excludes virtual environments and keys from git tracking
├── pyproject.toml       # Python package configuration (managed by uv)
└── README.md            # Project documentation (this file)
```

---

## 🚀 Local Setup & Run

### Prerequisites
- Install [uv](https://github.com/astral-sh/uv) (fast Python package installer).
- Get a Gemini API Key from Google AI Studio.

### 1. Configure local secrets
Add your Gemini API key to a `.env` file in the root folder:
```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

### 2. Test via Terminal (CLI Mode)
To verify your API key and AI connection, place any bookshelf image (e.g. `test_shelf.jpg`) in the project directory and run:
```bash
# General analysis
uv run scripts/test_gemini.py test_shelf.jpg

# Analysis with preferences
uv run scripts/test_gemini.py test_shelf.jpg "history fiction"
```

### 3. Run FastAPI Backend
To launch the backend API:
```bash
uv run uvicorn backend.main:scan_bookshelf --reload
```
*Note: Make sure your FastAPI app runs on port 8000.*

### 4. Serve the Frontend
Serve the root directory using any local server (e.g., Live Server in VS Code, or python server):
```bash
python -m http.server 5500
```
Open **`http://localhost:5500`** in your browser.

---

## 🌐 Deploying to GitHub Pages (Serverless)

Because the frontend is fully client-side and can connect directly to the Gemini API, you can deploy it to **GitHub Pages** with zero hosting costs:

1. Push this repository to your GitHub account: `https://github.com/KGupta171025/SHELF-SCANNER`.
2. Go to your repository settings page: **Settings > Pages**.
3. Under **Build and deployment**, select:
   - **Source:** Deploy from a branch
   - **Branch:** `main`
   - **Folder:** `/ (root)`
4. Click **Save**.
5. Open your live site, click the **Settings Gear Icon** in the top right, select **Direct Gemini API**, paste your key, and scan your bookshelf!
