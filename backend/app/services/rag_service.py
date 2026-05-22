import json
import logging
import os

from dotenv import load_dotenv
from google import genai
from sqlalchemy.orm import Session as DBSession

from ..db import models

logger = logging.getLogger("smart_agent.rag")

load_dotenv()

MAX_QUERY_LENGTH = 4000

def sanitize_prompt_input(text: str) -> str:
    """Sanitize user input to prevent prompt injection and limit input length."""
    if not text:
        return ""
    if len(text) > MAX_QUERY_LENGTH:
        raise ValueError(f"Query exceeds the maximum allowed length of {MAX_QUERY_LENGTH} characters.")
    # Remove null bytes
    text = text.replace("\x00", "")
    # Replace markdown fences to prevent escaping context blocks
    text = text.replace("```", "'''")
    return text

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
        logger.error(f"Embedding failed (check API key): {e}", exc_info=True)
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
    """Search the vector store using document-aware retrieval and generate an answer."""
    query = sanitize_prompt_input(query)
    # Check if there are any chunks for this session
    chunk_count = db.query(models.DocumentChunk).filter(
        models.DocumentChunk.session_id == session_id
    ).count()

    if chunk_count == 0:
        # Generate a friendly response guiding the user to upload a document
        try:
            client = _get_client()
            prompt = (
                "You are Smart Document Agent, a helpful and friendly document analysis assistant.\n"
                "The user has NOT uploaded any documents to this workspace/session yet.\n\n"
                f"User message: \"{query}\"\n\n"
                "INSTRUCTIONS:\n"
                "1. If the message is a greeting, pleasantry, or casual conversation (e.g. 'Hi', 'Hello', 'Who are you?'), "
                "respond in a very warm, professional, and friendly manner. Welcome them to Smart Document Agent, and guide them to upload "
                "their first document (PDF, TXT, CSV, DOCX, XLSX) using the panel on the left to get started.\n"
                "2. If they are asking a specific question, politely explain that you cannot answer it yet because no documents "
                "have been uploaded. Guide them to upload a document first so you can analyze it for them.\n"
                "3. Keep the response concise, helpful, and invite interaction. Use relevant emojis."
            )
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
            )
            return {"answer": response.text, "sources": []}
        except Exception as e:
            logger.error(f"Failed to generate greeting when no docs: {e}", exc_info=True)
            return {
                "answer": "👋 Hello! Welcome to Smart Document Agent. Please upload a document using the left panel to get started!",
                "sources": []
            }

    query_vector = embed_text(query)

    # --- Document-Aware Retrieval ---
    # Get all unique filenames in this session
    unique_files = (
        db.query(models.DocumentChunk.filename)
        .filter(models.DocumentChunk.session_id == session_id)
        .distinct()
        .all()
    )
    unique_filenames = [f[0] for f in unique_files]

    # For each document, retrieve the top 3 most relevant chunks
    all_results = []
    for fname in unique_filenames:
        per_doc_results = (
            db.query(models.DocumentChunk)
            .filter(
                models.DocumentChunk.session_id == session_id,
                models.DocumentChunk.filename == fname,
            )
            .order_by(models.DocumentChunk.embedding.cosine_distance(query_vector))
            .limit(3)
            .all()
        )
        all_results.extend(per_doc_results)

    # Collect unique source filenames
    sources = list(dict.fromkeys([r.filename for r in all_results]))
    context = "\n\n".join([f"[Source: {r.filename}]\n{r.text}" for r in all_results])

    try:
        client = _get_client()
        prompt = (
            "You are Smart Document Agent, a professional and friendly document analysis assistant. "
            f"The user has uploaded {len(unique_filenames)} document(s) in this session: {', '.join(unique_filenames)}.\n\n"
            "IMPORTANT RULES:\n"
            "1. If the user's message is a greeting (e.g., 'Hi', 'Hello', 'Hey'), general conversational pleasantry, or casual chat, "
            "respond friendly and politely. Acknowledge the documents they have uploaded, and invite them to ask specific questions about them. Do NOT reference or try to answer from the document context for general greetings.\n"
            "2. Otherwise, answer the query based strictly on the provided context below.\n"
            "3. When the question is broad, reference ALL source documents — do not skip any.\n"
            "4. Clearly label which information comes from which source file.\n"
            "5. Use markdown formatting (tables, bold, lists) to organize data.\n"
            "6. Use relevant emojis to make your response engaging.\n"
            "7. If comparing across documents, use a structured table.\n\n"
            f"Context from {len(unique_filenames)} document(s):\n{context}\n\n"
            f"Question: {query}"
        )
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        # If it was a simple greeting/pleasantry, we don't want to show citation badges in the UI,
        # so let's let the backend return empty sources for greetings.
        # We can do a quick check on the LLM's response or query itself to see if it's a greeting,
        # but returning sources is fine since it's just metadata, but to be clean, let's keep sources.
        return {"answer": response.text, "sources": sources}
    except Exception as e:
        logger.error(f"Failed to generate answer in query_session: {e}", exc_info=True)
        return {
            "answer": "Failed to generate answer. Please try again later.",
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
        logger.error(f"Error in summarize_text: {e}", exc_info=True)
        return "Document uploaded successfully, but summary generation failed."


def extract_structured_data(db: DBSession, session_id: str, query: str) -> dict:
    """Extract structured data from ALL documents using document-aware retrieval."""
    query = sanitize_prompt_input(query)

    chunk_count = db.query(models.DocumentChunk).filter(
        models.DocumentChunk.session_id == session_id
    ).count()

    if chunk_count == 0:
        return {"columns": [], "rows": [], "error": "No documents found for this session."}

    query_vector = embed_text(query)

    # --- Document-Aware Retrieval ---
    unique_files = (
        db.query(models.DocumentChunk.filename)
        .filter(models.DocumentChunk.session_id == session_id)
        .distinct()
        .all()
    )
    unique_filenames = [f[0] for f in unique_files]

    # For each document, retrieve the top 3 most relevant chunks
    all_results = []
    for fname in unique_filenames:
        per_doc_results = (
            db.query(models.DocumentChunk)
            .filter(
                models.DocumentChunk.session_id == session_id,
                models.DocumentChunk.filename == fname,
            )
            .order_by(models.DocumentChunk.embedding.cosine_distance(query_vector))
            .limit(3)
            .all()
        )
        all_results.extend(per_doc_results)

    all_text = "\n\n".join([f"[Source: {r.filename}]\n{r.text}" for r in all_results])
    sources = list(dict.fromkeys([r.filename for r in all_results]))

    try:
        client = _get_client()
        prompt = (
            "You are a data extraction assistant. Extract structured data from the "
            f"following {len(unique_filenames)} document(s) based on the user's request.\n\n"
            "IMPORTANT RULES:\n"
            "1. Respond ONLY with valid JSON in this exact format:\n"
            '{"columns": ["Column1", "Column2"], "rows": [["value1", "value2"]]}\n\n'
            "2. Include data from EVERY source document — do not skip any.\n"
            "3. Add a 'Source File' column to identify which document each row came from.\n"
            "4. Do not include any text, explanation, or markdown outside the JSON.\n\n"
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
    except json.JSONDecodeError as jde:
        logger.error(f"JSONDecodeError in extract_structured_data: {jde}. Raw response: {response.text}", exc_info=True)
        return {"columns": [], "rows": [], "error": "Failed to parse structured data from AI response."}
    except Exception as e:
        logger.error(f"Error in extract_structured_data: {e}", exc_info=True)
        return {"columns": [], "rows": [], "error": "Failed to extract structured data."}


def compare_documents(db: DBSession, session_id: str, doc1_filename: str, doc2_filename: str, query: str) -> dict:
    """Compare two specific documents based on a user query."""
    query = sanitize_prompt_input(query)
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
        logger.error(f"Error in compare_documents: {e}", exc_info=True)
        return {"answer": "Comparison failed. Please try again later.", "error": True}
