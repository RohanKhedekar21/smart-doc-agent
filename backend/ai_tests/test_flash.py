import os
from dotenv import load_dotenv
from google import genai

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

try:
    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents="Hello"
    )
    print("gemini-2.0-flash success:", response.text)
except Exception as e:
    print("gemini-2.0-flash error:", e)

try:
    response = client.models.generate_content(
        model="gemini-3.5-flash",
        contents="Hello"
    )
    print("gemini-3.5-flash success:", response.text)
except Exception as e:
    print("gemini-3.5-flash error:", e)
