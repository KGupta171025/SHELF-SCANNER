import io
import os
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException, Form, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from PIL import Image
from google import genai
from google.genai import types
from dotenv import load_dotenv

# 1. Load environment variables from a .env file (if running locally)
load_dotenv()

# Verify that the Gemini API Key is available in the environment
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("Warning: GEMINI_API_KEY is not set in environment variables or .env file.")

# 2. Define the Pydantic models for Bookshelf Analysis AI Output
class ScannedBook(BaseModel):
    title: str = Field(description="Title of the recognized book on the shelf")
    author: str = Field(description="Author of the recognized book")
    genre: str = Field(description="Primary genre or category of this book")

class BookRecommendation(BaseModel):
    title: str = Field(description="Title of the recommended book")
    author: str = Field(description="Author of the recommended book")
    reason: str = Field(description="Detailed reason why this book is recommended based on the books found on the user's shelf and their preferences")

class BookshelfScanResult(BaseModel):
    scanned_books: List[ScannedBook] = Field(description="List of all visible books recognized on the shelf (up to 10 books)")
    recommendations: List[BookRecommendation] = Field(description="List of 3 similar books recommended to the user")
    shelf_summary: str = Field(description="A brief 1-2 sentence analysis of the user's reading taste based on the books detected on their shelf")

# 3. Initialize FastAPI App
app = FastAPI(
    title="SHELF-SCANNER Bookshelf API",
    description="Backend API for scanning bookshelves from images, analyzing taste, and recommending similar books using Gemini AI with full multi-user session isolation.",
    version="2.0.0"
)

# 4. Configure CORS (Cross-Origin Resource Sharing)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 5. Initialize the Google GenAI Client
client = genai.Client()

@app.post("/api/scan", response_model=BookshelfScanResult)
async def scan_bookshelf(
    file: UploadFile = File(...),
    preferences: Optional[str] = Form(None),
    x_device_session_id: Optional[str] = Header(None, alias="X-Device-Session-ID")
):
    """
    Receives an image of a bookshelf, uploads it to Gemini, 
    recognizes the books on it, incorporates user preferences,
    and returns a summary + recommendations with 100% stateless
    per-device session isolation (no cross-user data storage).
    """
    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")

    try:
        # Read the uploaded image bytes
        image_bytes = await file.read()
        
        # Load the image using PIL (Pillow)
        image = Image.open(io.BytesIO(image_bytes))
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process image: {str(e)}")

    try:
        # Build prompt incorporating bookshelf and optional preference parameters
        prompt = (
            "Analyze this image containing a bookshelf or a collection of books. "
            "Identify as many visible books as you can (up to 10 books) and list their titles, authors, and genres. "
            "Provide a brief 1-2 sentence summary of the user's reading taste based on these books. "
            "Finally, recommend 3 other books they might enjoy. "
        )
        
        if preferences and preferences.strip():
            prompt += f"\nNote: The user has specified the following reading preferences/topics they are interested in right now: '{preferences}'. Prioritize recommendations that match these topics while still complementing the existing books on the shelf."

        # Call Gemini using the latest Google GenAI SDK
        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=[image, prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=BookshelfScanResult,
                temperature=0.2, # Lower temperature for accurate book detection
            )
        )

        import json
        result_data = json.loads(response.text)
        return result_data

    except Exception as e:
        print(f"Gemini API Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI processing failed: {str(e)}")

@app.get("/api/health")
def health_check():
    """Simple health check endpoint to verify backend is running."""
    return {"status": "healthy", "model": "gemini-3.6-flash"}
