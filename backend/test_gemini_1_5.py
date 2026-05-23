import os
import traceback
from dotenv import load_dotenv
from google import genai

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

try:
    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model="gemini-1.5-flash",
        contents="Hello"
    )
    print("gemini-1.5-flash success:", response.text)
except Exception as e:
    print("gemini-1.5-flash error:")
    traceback.print_exc()
