import io
import os
from typing import List
from fastapi import FastAPI, UploadFile, File, HTTPException
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

# 2. Define the Pydantic models for Structured AI Output
class BookRecommendation(BaseModel):
    title: str = Field(description="Title of the recommended book")
    author: str = Field(description="Author of the recommended book")
    reason: str = Field(description="Detailed reason why this book is recommended based on the scanned book")

class BookDetails(BaseModel):
    title: str = Field(description="Title of the book recognized from the cover")
    author: str = Field(description="Author of the book")
    genre: str = Field(description="Primary genre or categories of the book")
    summary: str = Field(description="A concise 2-3 sentence summary of the book")
    recommendations: List[BookRecommendation] = Field(description="List of 3 similar books recommended to the user")

# 3. Initialize FastAPI App
app = FastAPI(
    title="SHELF-SCANNER API",
    description="Backend API for recognizing books from images and recommending similar titles using Gemini AI.",
    version="1.0.0"
)


# 4. Configure CORS (Cross-Origin Resource Sharing)
# This is crucial so our frontend (running on GitHub Pages or a local live-server) can make requests to this backend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],                    # In production, specify our GitHub Pages URL instead of "*"
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


# 5. Initialize the Google GenAI Client
# SDK automatically uses the GEMINI_API_KEY environment variable.
client = genai.Client()

@app.post("/api/scan", response_model=BookDetails)
async def scan_book(file: UploadFile = File(...)):
    """
    Receives an image of a book cover, uploads it to Gemini, 
    recognizes the book, and returns book info with recommendations.
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
        # Ask Gemini to identify the book and recommend 3 similar books
        prompt = (
            "Analyze this book cover image. Identify the book title and author. "
            "Then, provide a brief summary, its genre, and recommend 3 other books that a reader of "
            "this book would enjoy, along with a custom reasoning for each recommendation."
        )

        # Call Gemini using the latest Google GenAI SDK
        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=[image, prompt],
            config=types.GenerateContentConfig(
                # Enforce structured output matching our Pydantic schema
                response_mime_type="application/json",
                response_schema=BookDetails,
                temperature=0.2 # Lower temperature for more accurate, consistent recognition
            )
        )

        # response.text is guaranteed to be a JSON string matching our BookDetails schema
        # FastAPI will automatically parse this and validate it against the response_model
        import json
        result_data = json.loads(response.text)
        return result_data

    except Exception as e:
        # Log the error and return HTTP 500
        print(f"Gemini API Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI processing failed: {str(e)}")


@app.get("/api/health")
def health_check():
    """Simple health check endpoint to verify backend is running."""
    return {"status": "healthy", "model": "gemini-3.6-flash"}
