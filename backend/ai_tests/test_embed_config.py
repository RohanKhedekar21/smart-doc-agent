import os
from dotenv import load_dotenv
from google import genai

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key)

try:
    result = client.models.embed_content(
        model="gemini-embedding-001",
        contents="hello world",
        config=dict(output_dimensionality=768),
    )
    print("gemini-embedding-001 success:", result.embeddings[0].values[:3])
except Exception as e:
    print("gemini-embedding-001 config error:", e)

try:
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents="Hello"
    )
    print("generate_content success:", response.text)
except Exception as e:
    print("generate_content error:", e)
