import sys
import os
from google import genai
from PIL import Image
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from typing import List

# 1. Load environment variables from the local .env file
load_dotenv()

# 2. Define the exact same schemas we used in the backend for consistency
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

def main():
    # 3. Ensure an image path is provided
    if len(sys.argv) < 2:
        print("Usage: uv run scripts/test_gemini.py <path_to_book_cover_image>")
        sys.exit(1)

    image_path = sys.argv[1]
    
    # Verify the image file exists
    if not os.path.exists(image_path):
        print(f"Error: File '{image_path}' does not exist.")
        sys.exit(1)

    # 4. Check for API key presence
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY environment variable is not set. Please check your .env file.")
        sys.exit(1)

    # 5. Initialize the client
    print("Connecting to Gemini API...")
    client = genai.Client()

    # 6. Open the image
    print(f"Reading image: {image_path}...")
    try:
        image = Image.open(image_path)
    except Exception as e:
        print(f"Error: Could not open image. Details: {e}")
        sys.exit(1)

    # 7. Query Gemini
    print("Analyzing book cover and generating recommendations...")
    prompt = (
        "Analyze this book cover image. Identify the book title and author. "
        "Then, provide a brief summary, its genre, and recommend 3 other books that a reader of "
        "this book would enjoy, along with a custom reasoning for each recommendation."
    )

    try:
        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=[image, prompt],
            config=dict(
                response_mime_type="application/json",
                response_schema=BookDetails,
                temperature=0.2
            )
        )
        
        # Output the parsed JSON response
        print("\n=== SUCCESS: AI ANALYSIS RESULT ===")
        print(response.text)
        print("===================================\n")
        
    except Exception as e:
        print(f"\nAPI Error: Could not generate content. Details: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
