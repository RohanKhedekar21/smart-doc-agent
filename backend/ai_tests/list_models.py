import os
from dotenv import load_dotenv
from google import genai

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

try:
    client = genai.Client(api_key=api_key)
    print("Available models:")
    for model in client.models.list():
        if "gemini" in model.name or "flash" in model.name:
            print(f"- {model.name}")
except Exception as e:
    print("Error listing models:", e)
