import os

from dotenv import load_dotenv
from google import genai
from sqlalchemy.orm import Session as DBSession

from ..db import models

load_dotenv()

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
            config=dict(output_dimensionality=768),
        )
        return result.embeddings[0].values
    except Exception as e:
        print(f"Embedding failed (check API key): {e}")
        return [0.0] * 768


def save_chunks(db: DBSession, session_id: str, document_id: int, chunks: list, filename: str):
    """Embed text chunks and save them to the PostgreSQL vector store."""
    for chunk in chunks:
        vector = embed_text(chunk)
        db_chunk = models.DocumentChunk(
            document_id=document_id,
            session_id=session_id,
            filename=filename,
            text=chunk,
            embedding=vector,
        )
        db.add(db_chunk)
    db.commit()


def query_session(db: DBSession, session_id: str, query: str) -> dict:
    """Search the vector store and generate an answer with source citations."""
    # Check if there are any chunks for this session
    chunk_count = db.query(models.DocumentChunk).filter(
        models.DocumentChunk.session_id == session_id
    ).count()

    if chunk_count == 0:
        return {
            "answer": "No documents found for this session. Please upload a document first.",
            "sources": []
        }

    query_vector = embed_text(query)

    # Use pgvector cosine distance to find top 15 most relevant chunks to enable cross-document comparisons
    results = (
        db.query(models.DocumentChunk)
        .filter(models.DocumentChunk.session_id == session_id)
        .order_by(models.DocumentChunk.embedding.cosine_distance(query_vector))
        .limit(15)
        .all()
    )

    # Collect unique source filenames in relevance order
    sources = list(dict.fromkeys([r.filename for r in results]))
    context = "\n\n".join([f"[Source: {r.filename}]\n{r.text}" for r in results])

    try:
        client = _get_client()
        prompt = (
            "You are a document analysis assistant. Answer the user's question "
            "based strictly on the provided context. When referencing specific "
            "information, mention which source document it came from. "
            "Use markdown formatting (like tables, bold text, lists) where appropriate to organize data, "
            "and include relevant emojis to make your response engaging.\n\n"
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


def extract_structured_data(db: DBSession, session_id: str, query: str) -> dict:
    """Extract structured data from documents using Gemini and return as JSON table."""
    import json

    chunk_count = db.query(models.DocumentChunk).filter(
        models.DocumentChunk.session_id == session_id
    ).count()

    if chunk_count == 0:
        return {"columns": [], "rows": [], "error": "No documents found for this session."}

    # Semantic Retrieval: Find the top 5 chunks most relevant to the extraction query
    query_vector = embed_text(query)

    results = (
        db.query(models.DocumentChunk)
        .filter(models.DocumentChunk.session_id == session_id)
        .order_by(models.DocumentChunk.embedding.cosine_distance(query_vector))
        .limit(5)
        .all()
    )

    all_text = "\n\n".join([f"[Source: {r.filename}]\n{r.text}" for r in results])
    sources = list(dict.fromkeys([r.filename for r in results]))

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


def compare_documents(db: DBSession, session_id: str, doc1_filename: str, doc2_filename: str, query: str) -> dict:
    """Compare two specific documents based on a user query."""
    query_vector = embed_text(query)

    # Get top 4 chunks for doc1 filtered by filename
    doc1_results = (
        db.query(models.DocumentChunk)
        .filter(
            models.DocumentChunk.session_id == session_id,
            models.DocumentChunk.filename == doc1_filename,
        )
        .order_by(models.DocumentChunk.embedding.cosine_distance(query_vector))
        .limit(4)
        .all()
    )

    # Get top 4 chunks for doc2 filtered by filename
    doc2_results = (
        db.query(models.DocumentChunk)
        .filter(
            models.DocumentChunk.session_id == session_id,
            models.DocumentChunk.filename == doc2_filename,
        )
        .order_by(models.DocumentChunk.embedding.cosine_distance(query_vector))
        .limit(4)
        .all()
    )

    if not doc1_results:
        return {"answer": f"Could not find document '{doc1_filename}' in this session.", "error": True}
    if not doc2_results:
        return {"answer": f"Could not find document '{doc2_filename}' in this session.", "error": True}

    doc1_text = "\n\n... ".join([r.text for r in doc1_results])
    doc2_text = "\n\n... ".join([r.text for r in doc2_results])

    try:
        client = _get_client()
        prompt = (
            "You are an expert document analysis assistant. The user wants you to compare two specific documents.\n"
            "Analyze the differences and similarities between Document A and Document B based strictly on the user's query.\n"
            "Provide a clear, structured comparison. Use markdown formatting (like tables, bold text, lists) where appropriate to organize data, "
            "and include relevant emojis to make your response engaging.\n\n"
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
