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
# If total text across all docs is under this limit, send full text to the LLM
FULL_TEXT_CHAR_LIMIT = 200_000


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


# ── Helpers ────────────────────────────────────────────────────────


def _get_full_text_per_document(db: DBSession, session_id: str) -> dict[str, str]:
    """Return {filename: full_text} for every document in a session.

    Uses the stored ``extracted_text`` column first.  For legacy rows where
    the text was truncated (ends with ``...``), the function reconstructs
    the content by concatenating the ordered chunks instead.
    """
    docs = (
        db.query(models.Document)
        .filter(models.Document.session_id == session_id)
        .all()
    )

    result: dict[str, str] = {}
    for doc in docs:
        text = doc.extracted_text or ""
        # If text appears truncated, rebuild from chunks
        if text.endswith("...") and len(text) < 600:
            chunks = (
                db.query(models.DocumentChunk)
                .filter(
                    models.DocumentChunk.document_id == doc.id,
                    models.DocumentChunk.session_id == session_id,
                )
                .order_by(models.DocumentChunk.id.asc())
                .all()
            )
            if chunks:
                # Chunks have overlap, but concatenating gives a usable approximation
                text = "\n".join(c.text for c in chunks)
        result[doc.filename] = text
    return result


def _get_chat_history(db: DBSession, session_id: str, limit: int = 10) -> str:
    """Fetch the most recent messages and format them as conversation context."""
    messages = (
        db.query(models.Message)
        .filter(models.Message.session_id == session_id)
        .order_by(models.Message.created_at.desc())
        .limit(limit)
        .all()
    )
    if not messages:
        return ""

    # Reverse so they are in chronological order
    messages = list(reversed(messages))

    lines = []
    for m in messages:
        role = "User" if m.sender == "user" else "Assistant"
        # Truncate very long past messages to keep prompt manageable
        text = m.text if len(m.text) <= 500 else m.text[:500] + "…"
        lines.append(f"{role}: {text}")
    return "\n".join(lines)


def _get_chunk_context(db: DBSession, session_id: str, query_vector: list,
                       unique_filenames: list[str], chunks_per_doc: int = 5) -> str:
    """Retrieve the top-N most relevant chunks per document via cosine similarity."""
    all_results = []
    for fname in unique_filenames:
        per_doc_results = (
            db.query(models.DocumentChunk)
            .filter(
                models.DocumentChunk.session_id == session_id,
                models.DocumentChunk.filename == fname,
            )
            .order_by(models.DocumentChunk.embedding.cosine_distance(query_vector))
            .limit(chunks_per_doc)
            .all()
        )
        all_results.extend(per_doc_results)
    return "\n\n".join([f"[Source: {r.filename}]\n{r.text}" for r in all_results])


# Shared formatting rules injected into every prompt
_FORMAT_RULES = (
    "FORMATTING RULES:\n"
    "- Use valid markdown: **bold**, *italic*, bullet lists, numbered lists.\n"
    "- For tables, always use proper markdown table syntax with headers and alignment rows (e.g. |---|).\n"
    "- NEVER output rows of dashes (------), equals (======), or other separator lines outside of a markdown table.\n"
    "- Keep responses well-structured, concise, and scannable.\n"
    "- Use relevant emojis sparingly to make responses engaging.\n"
)


# ── Main Query ─────────────────────────────────────────────────────


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
                "2. If they are asking a general knowledge question (e.g. math, facts, trivia), answer it helpfully but also "
                "mention that you specialize in document analysis and invite them to upload a document.\n"
                "3. If they are asking a document-specific question, politely explain that you cannot answer it yet because no documents "
                "have been uploaded. Guide them to upload a document first so you can analyze it for them.\n"
                "4. Keep the response concise, helpful, and invite interaction. Use relevant emojis.\n\n"
                f"{_FORMAT_RULES}"
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

    # --- Build context ---
    # Get all unique filenames in this session
    unique_files = (
        db.query(models.DocumentChunk.filename)
        .filter(models.DocumentChunk.session_id == session_id)
        .distinct()
        .all()
    )
    unique_filenames = [f[0] for f in unique_files]

    # Decide: full text or chunk-based retrieval
    doc_texts = _get_full_text_per_document(db, session_id)
    total_chars = sum(len(t) for t in doc_texts.values())

    if total_chars <= FULL_TEXT_CHAR_LIMIT:
        # Use full document text for maximum context
        context = "\n\n".join(
            [f"=== Document: {fname} ===\n{text}" for fname, text in doc_texts.items()]
        )
        context_mode = "full"
    else:
        # Fallback to chunk-based semantic retrieval
        query_vector = embed_text(query)
        context = _get_chunk_context(db, session_id, query_vector, unique_filenames, chunks_per_doc=5)
        context_mode = "chunks"

    # Collect unique source filenames
    sources = list(doc_texts.keys())

    # Get recent chat history
    chat_history = _get_chat_history(db, session_id, limit=10)
    history_block = ""
    if chat_history:
        history_block = (
            "RECENT CONVERSATION HISTORY (for context — use this to understand follow-up questions):\n"
            f"{chat_history}\n\n"
        )

    try:
        client = _get_client()
        prompt = (
            "You are Smart Document Agent, a professional and friendly document analysis assistant. "
            f"The user has uploaded {len(unique_filenames)} document(s) in this session: {', '.join(unique_filenames)}.\n\n"
            f"{history_block}"
            "IMPORTANT RULES:\n"
            "1. If the user's message is a greeting (e.g., 'Hi', 'Hello', 'Hey'), general conversational pleasantry, or casual chat, "
            "respond friendly and politely. Acknowledge the documents they have uploaded, and invite them to ask specific questions about them. "
            "Do NOT reference or try to answer from the document context for general greetings.\n"
            "2. For document-related questions, answer based on the provided document context below. "
            "When the question is broad or comparative (e.g. 'which document is better formatted?', 'compare these'), "
            "analyze ALL documents holistically — consider layout, structure, completeness, formatting, and content quality.\n"
            "3. For follow-up questions (e.g. 'what is that?', 'tell me more', 'explain'), use the conversation history above to understand what the user is referring to.\n"
            "4. For general knowledge questions NOT related to the documents (e.g. 'what is 2+2?', 'who is the president?'), "
            "answer them helpfully using your general knowledge. Then gently remind the user you can also help with their documents.\n"
            "5. If you genuinely cannot find relevant information in the documents, say so honestly and suggest what the user could ask instead. "
            "Provide any partially relevant content you found as a reference.\n"
            "6. Clearly label which information comes from which source file when citing documents.\n"
            "7. When comparing across documents, use a structured markdown table.\n\n"
            f"{_FORMAT_RULES}\n"
            f"{'FULL DOCUMENT TEXT' if context_mode == 'full' else 'RELEVANT EXCERPTS'} from {len(unique_filenames)} document(s):\n{context}\n\n"
            f"User's Question: {query}"
        )
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        return {"answer": response.text, "sources": sources}
    except Exception as e:
        logger.error(f"Failed to generate answer in query_session: {e}", exc_info=True)
        return {
            "answer": "Sorry, I encountered an issue generating a response. Please try again in a moment. 🔄",
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

    # Dynamic context switching
    doc_texts = _get_full_text_per_document(db, session_id)
    total_chars = sum(len(t) for t in doc_texts.values())
    unique_filenames = list(doc_texts.keys())

    if total_chars <= FULL_TEXT_CHAR_LIMIT:
        all_text = "\n\n".join(
            [f"=== Document: {fname} ===\n{text}" for fname, text in doc_texts.items()]
        )
    else:
        query_vector = embed_text(query)
        all_text = _get_chunk_context(db, session_id, query_vector, unique_filenames, chunks_per_doc=5)

    sources = unique_filenames

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

    # Get full text for each document
    doc_texts = _get_full_text_per_document(db, session_id)

    doc1_text = doc_texts.get(doc1_filename, "")
    doc2_text = doc_texts.get(doc2_filename, "")

    if not doc1_text:
        return {"answer": f"Could not find document '{doc1_filename}' in this session.", "error": True}
    if not doc2_text:
        return {"answer": f"Could not find document '{doc2_filename}' in this session.", "error": True}

    # If combined text is too large, fall back to chunk retrieval
    combined_len = len(doc1_text) + len(doc2_text)
    if combined_len > FULL_TEXT_CHAR_LIMIT:
        query_vector = embed_text(query)
        doc1_chunks = (
            db.query(models.DocumentChunk)
            .filter(
                models.DocumentChunk.session_id == session_id,
                models.DocumentChunk.filename == doc1_filename,
            )
            .order_by(models.DocumentChunk.embedding.cosine_distance(query_vector))
            .limit(5)
            .all()
        )
        doc2_chunks = (
            db.query(models.DocumentChunk)
            .filter(
                models.DocumentChunk.session_id == session_id,
                models.DocumentChunk.filename == doc2_filename,
            )
            .order_by(models.DocumentChunk.embedding.cosine_distance(query_vector))
            .limit(5)
            .all()
        )
        doc1_text = "\n\n".join([r.text for r in doc1_chunks]) if doc1_chunks else doc1_text
        doc2_text = "\n\n".join([r.text for r in doc2_chunks]) if doc2_chunks else doc2_text

    try:
        client = _get_client()
        prompt = (
            "You are an expert document analysis assistant. The user wants you to compare two specific documents.\n"
            "Analyze the differences and similarities between Document A and Document B based on the user's query.\n"
            "Consider ALL aspects: content, structure, formatting, layout, completeness, and presentation quality.\n"
            "Provide a clear, structured comparison.\n\n"
            f"{_FORMAT_RULES}\n"
            f"--- Document A: {doc1_filename} (Full Content) ---\n{doc1_text}\n\n"
            f"--- Document B: {doc2_filename} (Full Content) ---\n{doc2_text}\n\n"
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
