import os
from dotenv import load_dotenv
from google import genai

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key)

try:
    result = client.models.embed_content(
        model="text-embedding-004",
        contents="hello world",
    )
    print("text-embedding-004 success")
except Exception as e:
    print("text-embedding-004 error:", e)

try:
    result2 = client.models.embed_content(
        model="gemini-embedding-001",
        contents="hello world",
    )
    print("gemini-embedding-001 success")
except Exception as e:
    print("gemini-embedding-001 error:", e)
