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


def query_session(session_id: str, query: str) -> dict:
    """Search the vector store and generate an answer with source citations."""
    store = {}
    if os.path.exists(VECTOR_STORE_FILE):
        with open(VECTOR_STORE_FILE, "r") as f:
            store = json.load(f)

    if session_id not in store or not store[session_id]:
        return {
            "answer": "No documents found for this session. Please upload a document first.",
            "sources": []
        }

    query_vector = embed_text(query)

    results = []
    for item in store[session_id]:
        sim = cosine_similarity(query_vector, item["vector"])
        results.append((sim, item["text"], item["filename"]))

    results.sort(reverse=True, key=lambda x: x[0])
    top_chunks = results[:3]

    # Collect unique source filenames in relevance order
    sources = list(dict.fromkeys([r[2] for r in top_chunks]))

    context = "\n\n".join([f"[Source: {r[2]}]\n{r[1]}" for r in top_chunks])

    try:
        client = _get_client()
        prompt = (
            "You are a document analysis assistant. Answer the user's question "
            "based strictly on the provided context. When referencing specific "
            "information, mention which source document it came from.\n\n"
            f"Context:\n{context}\n\n"
            f"Question: {query}"
        )
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        return {"answer": response.text, "sources": sources}
    except Exception as e:
        return {
            "answer": f"Failed to generate answer. Ensure GEMINI_API_KEY is set. Error: {e}",
            "sources": []
        }


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


def extract_structured_data(session_id: str, query: str) -> dict:
    """Extract structured data from documents using Gemini and return as JSON table."""
    store = {}
    if os.path.exists(VECTOR_STORE_FILE):
        with open(VECTOR_STORE_FILE, "r") as f:
            store = json.load(f)

    if session_id not in store or not store[session_id]:
        return {"columns": [], "rows": [], "error": "No documents found for this session."}

    # Semantic Retrieval: Find the top 5 chunks most relevant to the extraction query
    query_vector = embed_text(query)
    results = []
    for item in store[session_id]:
        sim = cosine_similarity(query_vector, item["vector"])
        results.append((sim, item["text"], item["filename"]))

    # Sort by highest similarity
    results.sort(reverse=True, key=lambda x: x[0])
    top_chunks = results[:5]

    all_text = "\n\n".join([f"[Source: {r[2]}]\n{r[1]}" for r in top_chunks])
    sources = list(dict.fromkeys([r[2] for r in top_chunks]))

    try:
        client = _get_client()
        prompt = (
            "You are a data extraction assistant. Extract structured data from the "
            "following document text based on the user's request.\n\n"
            "IMPORTANT: Respond ONLY with valid JSON in this exact format:\n"
            '{"columns": ["Column1", "Column2"], "rows": [["value1", "value2"]]}\n\n'
            "Do not include any text, explanation, or markdown formatting outside the JSON.\n\n"
            f"Document text:\n{all_text}\n\n"
            f"Extraction request: {query}"
        )
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )

        # Parse JSON from the response (strip markdown fences if present)
        raw = response.text.strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1]
            raw = raw.rsplit("```", 1)[0]
        raw = raw.strip()

        data = json.loads(raw)
        data["sources"] = sources
        return data
    except json.JSONDecodeError:
        return {"columns": [], "rows": [], "error": "Failed to parse structured data from AI response."}
    except Exception as e:
        return {"columns": [], "rows": [], "error": str(e)}


def compare_documents(session_id: str, doc1_filename: str, doc2_filename: str, query: str) -> dict:
    """Compare two specific documents based on a user query."""
    store = {}
    if os.path.exists(VECTOR_STORE_FILE):
        with open(VECTOR_STORE_FILE, "r") as f:
            store = json.load(f)

    if session_id not in store or not store[session_id]:
        return {"answer": "No documents found for this session.", "error": True}

    # Embed the comparison query
    query_vector = embed_text(query)

    doc1_results = []
    doc2_results = []

    # Filter chunks by document and calculate similarity
    for item in store[session_id]:
        if item["filename"] == doc1_filename:
            sim = cosine_similarity(query_vector, item["vector"])
            doc1_results.append((sim, item["text"]))
        elif item["filename"] == doc2_filename:
            sim = cosine_similarity(query_vector, item["vector"])
            doc2_results.append((sim, item["text"]))

    if not doc1_results:
        return {"answer": f"Could not find document '{doc1_filename}' in this session.", "error": True}
    if not doc2_results:
        return {"answer": f"Could not find document '{doc2_filename}' in this session.", "error": True}

    # Sort and take top 4 chunks for each document
    doc1_results.sort(reverse=True, key=lambda x: x[0])
    doc2_results.sort(reverse=True, key=lambda x: x[0])

    doc1_text = "\n\n... ".join([r[1] for r in doc1_results[:4]])
    doc2_text = "\n\n... ".join([r[1] for r in doc2_results[:4]])

    try:
        client = _get_client()
        prompt = (
            "You are an expert document analysis assistant. The user wants you to compare two specific documents.\n"
            "Analyze the differences and similarities between Document A and Document B based strictly on the user's query.\n"
            "Provide a clear, structured comparison.\n\n"
            f"--- Document A: {doc1_filename} (Relevant Excerpts) ---\n{doc1_text}\n\n"
            f"--- Document B: {doc2_filename} (Relevant Excerpts) ---\n{doc2_text}\n\n"
            f"User's Comparison Query: {query}"
        )
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        return {"answer": response.text, "sources": [doc1_filename, doc2_filename], "error": False}
    except Exception as e:
        return {"answer": f"Comparison failed. Error: {e}", "error": True}
