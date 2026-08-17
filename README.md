# 📚 SHELF-SCANNER: AI-Powered Book Discovery Engine

SHELF-SCANNER is an interactive single-page web application that identifies books from their cover images and recommends similar titles using Google's state-of-the-art **Gemini 3.6 Flash** model. 

Designed for both **local development** and **production serverless hosting**, it runs as a dual-mode application:
1. **Local Mode:** Communicates with a local Python FastAPI backend server.
2. **Serverless Mode:** Runs 100% in-browser using direct Gemini REST APIs—perfect for free static hosting like **GitHub Pages**.

---

## ✨ Features

- **Multimodal Uploads:** Support for drag-and-drop image uploads, file browsing, or live webcam snapshot capture directly from your device.
- **AI Book Identification:** Recognizes title, author, primary genre, and outputs a concise summary.
- **Smart Recommendations:** Recommends 3 similar books based on the scanned title, along with a tailored explanation of *why* you'll like it.
- **Dynamic UI:** A responsive, dark glassmorphic design featuring interactive **3D CSS book covers** that dynamically shade themselves matching your book's cover art using color hashing.
- **Secure Key Management:** Settings modal to supply your own Gemini API key, stored only in your browser's local sandbox (`localStorage`).

---

## 🛠️ Project Structure

```text
SHELF-SCANNER/
├── backend/
│   └── main.py          # FastAPI server with CORS & Gemini GenAI API Integration
├── frontend/
│   ├── index.html       # Single Page Application HTML structure
│   ├── style.css        # Glassmorphic dark styling & keyframe animations
│   └── app.js           # Live camera, uploader, & API routing scripts
├── scripts/
│   └── test_gemini.py   # CLI testing script to verify Gemini integration
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

### 1. Clone & Install
Run the following in your shell:
```bash
# Add your Gemini API key to .env
echo "GEMINI_API_KEY=your_gemini_api_key_here" > .env
```

### 2. Test via Terminal (CLI Mode)
To verify your API key and AI connection, place any book cover image (e.g. `test_book.jpg`) in the project directory and run:
```bash
uv run scripts/test_gemini.py test_book.jpg
```

### 3. Run FastAPI Backend
To launch the backend API:
```bash
uv run uvicorn backend.main:app --reload
```
The backend API documentation will be available at `http://127.0.0.1:8000/docs`.

### 4. Open the Web Frontend
Serve the `frontend/` directory using any local server (e.g., Live Server in VS Code, or python server):
```bash
python -m http.server --directory frontend 5500
```
Open **`http://localhost:5500`** in your browser.

---

## 🌐 Deploying to GitHub Pages (Serverless)

Because the frontend is fully client-side and can connect directly to the Gemini API using your browser key, you can deploy it to **GitHub Pages** with zero hosting costs:

1. Push this repository to your GitHub account: `https://github.com/KGupta171025/SHELF-SCANNER`.
2. Go to your repository settings page: **Settings > Pages**.
3. Under **Build and deployment**, select:
   - **Source:** Deploy from a branch
   - **Branch:** `main` / `/frontend` (or select the `/root` and link to `frontend/index.html`).
   *Alternative: You can use a simple GitHub Action or move the frontend files to the repository root to host it directly.*
4. Open the live site, click the **Settings Gear Icon** in the top right, select **Direct Gemini API**, paste your key, and scan your bookshelf!
