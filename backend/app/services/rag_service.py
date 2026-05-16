import json
import math
import os

from dotenv import load_dotenv
from google import genai

load_dotenv()

VECTOR_STORE_FILE = "vector_store.json"

# Initialize the Gemini client once
_client = None


def _get_client() -> genai.Client:
    """Get or create the singleton Gemini client."""
    global _client
    if _client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY is not set. Add it to backend/.env file.")
        _client = genai.Client(api_key=api_key)
    return _client


def embed_text(text: str) -> list:
    """Generate embedding vector for a text chunk using Gemini."""
    try:
        client = _get_client()
        result = client.models.embed_content(
            model="gemini-embedding-001",
            contents=text,
        )
        return result.embeddings[0].values
    except Exception as e:
        print(f"Embedding failed (check API key): {e}")
        return [0.0] * 768


def cosine_similarity(v1: list, v2: list) -> float:
    """Calculate cosine similarity between two vectors."""
    if len(v1) != len(v2):
        return 0.0
    dot_product = sum(a * b for a, b in zip(v1, v2))
    mag1 = math.sqrt(sum(a * a for a in v1))
    mag2 = math.sqrt(sum(b * b for b in v2))
    if mag1 == 0 or mag2 == 0:
        return 0.0
    return dot_product / (mag1 * mag2)


def save_chunks(session_id: str, chunks: list, filename: str):
    """Embed text chunks and save them to the local vector store."""
    store = {}
    if os.path.exists(VECTOR_STORE_FILE):
        with open(VECTOR_STORE_FILE, "r") as f:
            store = json.load(f)

    if session_id not in store:
        store[session_id] = []

    for chunk in chunks:
        vector = embed_text(chunk)
        store[session_id].append(
            {"text": chunk, "vector": vector, "filename": filename}
        )

    with open(VECTOR_STORE_FILE, "w") as f:
        json.dump(store, f)


def query_session(session_id: str, query: str) -> str:
    """Search the vector store and generate an answer using Gemini."""
    store = {}
    if os.path.exists(VECTOR_STORE_FILE):
        with open(VECTOR_STORE_FILE, "r") as f:
            store = json.load(f)

    if session_id not in store or not store[session_id]:
        return "No documents found for this session. Please upload a document first."

    query_vector = embed_text(query)

    results = []
    for item in store[session_id]:
        sim = cosine_similarity(query_vector, item["vector"])
        results.append((sim, item["text"], item["filename"]))

    results.sort(reverse=True, key=lambda x: x[0])
    top_chunks = results[:3]

    context = "\n\n".join([f"From {r[2]}:\n{r[1]}" for r in top_chunks])

    try:
        client = _get_client()
        prompt = (
            "Answer the user's question based strictly on the following context.\n\n"
            f"Context:\n{context}\n\n"
            f"Question: {query}"
        )
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        return response.text
    except Exception as e:
        return f"Failed to generate answer. Ensure GEMINI_API_KEY is set. Error: {e}"


def summarize_text(text: str, filename: str) -> str:
    """Generate a concise AI summary of an uploaded document."""
    try:
        client = _get_client()
        # Use only the first 3000 chars to stay within free-tier limits
        preview = text[:3000]
        prompt = (
            f"You are a document analysis assistant. The user just uploaded a file named \"{filename}\". "
            "Provide a concise 2-3 sentence summary of the document's contents. "
            "Focus on the key topics, purpose, and any notable details.\n\n"
            f"Document text:\n{preview}"
        )
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        return response.text
    except Exception as e:
        return f"Document uploaded successfully, but summary generation failed: {e}"
