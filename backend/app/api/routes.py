import uuid
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session as DBSession

from ..api.auth import get_current_user
from ..db import models
from ..db.database import get_db
from ..models import schemas
from ..services.document_service import chunk_text, extract_text_from_file
from ..services.rag_service import (
    compare_documents,
    extract_structured_data,
    query_session,
    save_chunks,
    summarize_text,
)

router = APIRouter(prefix="/api/v1")


# ── Session endpoints ──────────────────────────────────────────────

@router.get("/sessions", response_model=List[schemas.SessionResponse])
def get_sessions(
    db: DBSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    sessions = (
        db.query(models.Session)
        .filter(models.Session.user_id == current_user.id)
        .order_by(models.Session.created_at.desc())
        .all()
    )
    return [{"session_id": s.id, "name": s.name} for s in sessions]


@router.post("/sessions", response_model=schemas.SessionResponse)
def create_session(
    db: DBSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    new_session_id = str(uuid.uuid4())
    new_session = models.Session(
        id=new_session_id, name="New Workspace", user_id=current_user.id
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return {"session_id": new_session.id, "name": new_session.name}


@router.patch("/sessions/{session_id}", response_model=schemas.SessionResponse)
def rename_session(
    session_id: str,
    request: schemas.RenameSessionRequest,
    db: DBSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    session = (
        db.query(models.Session)
        .filter(models.Session.id == session_id, models.Session.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.name = request.name
    db.commit()
    db.refresh(session)
    return {"session_id": session.id, "name": session.name}


@router.delete("/sessions/{session_id}")
def delete_session(
    session_id: str,
    db: DBSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    session = (
        db.query(models.Session)
        .filter(models.Session.id == session_id, models.Session.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Cascade delete handles documents, chunks, and messages via relationships
    db.delete(session)
    db.commit()
    return {"status": "deleted"}


# ── Document endpoints ─────────────────────────────────────────────

@router.get(
    "/sessions/{session_id}/documents",
    response_model=List[schemas.DocumentResponse],
)
def get_documents(
    session_id: str,
    db: DBSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Verify session belongs to user
    session = (
        db.query(models.Session)
        .filter(models.Session.id == session_id, models.Session.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    docs = (
        db.query(models.Document)
        .filter(models.Document.session_id == session_id)
        .all()
    )
    return [
        {"id": d.id, "filename": d.filename, "session_id": d.session_id}
        for d in docs
    ]


@router.delete("/sessions/{session_id}/documents/{doc_id}")
def delete_document(
    session_id: str,
    doc_id: int,
    db: DBSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Verify session belongs to user
    session = (
        db.query(models.Session)
        .filter(models.Session.id == session_id, models.Session.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    doc = (
        db.query(models.Document)
        .filter(models.Document.id == doc_id, models.Document.session_id == session_id)
        .first()
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Cascade delete handles chunks via relationship
    db.delete(doc)
    db.commit()
    return {"status": "deleted", "filename": doc.filename}


# File upload constraints
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_EXTENSIONS = {".pdf", ".txt", ".csv"}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "text/plain",
    "text/csv",
    "application/octet-stream",
}


@router.post("/sessions/{session_id}/upload")
async def upload_document(
    session_id: str,
    file: UploadFile = File(...),
    db: DBSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Verify session belongs to user
    session = (
        db.query(models.Session)
        .filter(models.Session.id == session_id, models.Session.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Validate file extension
    import os
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # Validate MIME type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported MIME type '{file.content_type}'.",
        )

    content = await file.read()

    # Validate file size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)} MB.",
        )

    try:
        text = extract_text_from_file(content, file.filename)
        chunks = chunk_text(text)

        doc = models.Document(
            session_id=session_id,
            filename=file.filename,
            extracted_text=text[:500] + "...",
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)

        # Save chunks with embeddings to PostgreSQL via pgvector
        save_chunks(db, session_id, doc.id, chunks, file.filename)

        # Auto-summarize the uploaded document
        summary = summarize_text(text, file.filename)

        # Save the summary as an AI message in chat history
        ai_msg = models.Message(
            session_id=session_id,
            sender="ai",
            text=f"📄 **{file.filename}** processed ({len(chunks)} chunks).\n\n{summary}"
        )
        db.add(ai_msg)
        db.commit()

        return {
            "status": "success",
            "filename": file.filename,
            "chunks_processed": len(chunks),
            "summary": summary,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Chat & Messages ────────────────────────────────────────────────

@router.get("/sessions/{session_id}/messages", response_model=List[schemas.MessageResponse])
def get_messages(
    session_id: str,
    db: DBSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Verify session belongs to user
    session = (
        db.query(models.Session)
        .filter(models.Session.id == session_id, models.Session.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = (
        db.query(models.Message)
        .filter(models.Message.session_id == session_id)
        .order_by(models.Message.created_at.asc())
        .all()
    )
    return [
        {
            "id": m.id,
            "text": m.text,
            "sender": m.sender,
            "session_id": m.session_id
        }
        for m in messages
    ]

@router.post("/sessions/{session_id}/chat")
def chat_with_session(
    session_id: str,
    request: schemas.ChatRequest,
    db: DBSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Verify session belongs to user
    session = (
        db.query(models.Session)
        .filter(models.Session.id == session_id, models.Session.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Save user message
    user_msg = models.Message(
        session_id=session_id,
        sender="user",
        text=request.message
    )
    db.add(user_msg)
    db.commit()

    # Get AI answer with source citations (now uses pgvector)
    result = query_session(db, session_id, request.message)
    answer_text = result["answer"]
    sources = result["sources"]

    # Append source citations to the saved message
    if sources:
        citation_line = "\n\n📌 Sources: " + ", ".join(sources)
        saved_text = answer_text + citation_line
    else:
        saved_text = answer_text

    # Save AI message with citations
    ai_msg = models.Message(
        session_id=session_id,
        sender="ai",
        text=saved_text
    )
    db.add(ai_msg)
    db.commit()

    return {"answer": answer_text, "sources": sources}


# ── Data Extraction ────────────────────────────────────────────────

@router.post("/sessions/{session_id}/extract")
def extract_data(
    session_id: str,
    request: schemas.ChatRequest,
    db: DBSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    result = extract_structured_data(db, session_id, request.message)

    if "error" in result and result["error"]:
        raise HTTPException(status_code=400, detail=result["error"])

    return result


# ── Document Comparison ────────────────────────────────────────────

@router.post("/sessions/{session_id}/compare")
def compare_docs(
    session_id: str,
    request: schemas.CompareRequest,
    db: DBSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    result = compare_documents(db, session_id, request.doc1_filename, request.doc2_filename, request.query)

    if result.get("error"):
        raise HTTPException(status_code=400, detail=result.get("answer"))

    # Save the comparison as an AI message in the chat history
    ai_msg = models.Message(
        session_id=session_id,
        sender="ai",
        text=f"⚖️ **Comparison Report:** {request.doc1_filename} vs {request.doc2_filename}\n\n{result['answer']}"
    )
    db.add(ai_msg)
    db.commit()

    return result
