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

def main():
    # 3. Ensure an image path is provided
    if len(sys.argv) < 2:
        print("Usage: uv run scripts/test_gemini.py <path_to_bookshelf_image> [optional_preferences]")
        sys.exit(1)

    image_path = sys.argv[1]
    
    # Optional reading preferences (concatenated if multiple arguments are passed)
    preferences = " ".join(sys.argv[2:]) if len(sys.argv) > 2 else ""

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
    print("Analyzing bookshelf and generating recommendations...")
    prompt = (
        "Analyze this image containing a bookshelf or a collection of books. "
        "Identify as many visible books as you can (up to 10 books) and list their titles, authors, and genres. "
        "Provide a brief 1-2 sentence summary of the user's reading taste based on these books. "
        "Finally, recommend 3 other books they might enjoy. "
    )
    
    if preferences:
        print(f"Applying user preferences: '{preferences}'")
        prompt += f"\nNote: The user has specified the following reading preferences/topics they are interested in right now: '{preferences}'. Prioritize recommendations that match these topics while still complementing the existing books on the shelf."

    try:
        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=[image, prompt],
            config=dict(
                response_mime_type="application/json",
                response_schema=BookshelfScanResult,
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
