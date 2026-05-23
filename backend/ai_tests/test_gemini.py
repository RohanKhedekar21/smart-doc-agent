import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

def test():
    api_key = os.getenv("GEMINI_API_KEY")
    print(f"API Key present: {bool(api_key)}")
    if api_key:
        print(f"API Key starts with: {api_key[:8]}...")
    
    try:
        client = genai.Client(api_key=api_key)
        print("Client initialized successfully.")
        
        print("Testing basic generation...")
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents="Say hello!",
        )
        print(f"Response: {response.text}")
    except Exception as e:
        print("Error during basic generation:")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test()
