import uuid
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session as DBSession

from ..db import models
from ..db.database import get_db
from ..models import schemas
from ..services.document_service import chunk_text, extract_text_from_file
from ..services.rag_service import query_session, save_chunks, summarize_text

router = APIRouter(prefix="/api/v1")


# ── Session endpoints ──────────────────────────────────────────────

@router.get("/sessions", response_model=List[schemas.SessionResponse])
def get_sessions(db: DBSession = Depends(get_db)):
    sessions = (
        db.query(models.Session).order_by(models.Session.created_at.desc()).all()
    )
    return [{"session_id": s.id, "name": s.name} for s in sessions]


@router.post("/sessions", response_model=schemas.SessionResponse)
def create_session(db: DBSession = Depends(get_db)):
    new_session_id = str(uuid.uuid4())
    new_session = models.Session(id=new_session_id, name="New Workspace")
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return {"session_id": new_session.id, "name": new_session.name}


@router.patch("/sessions/{session_id}", response_model=schemas.SessionResponse)
def rename_session(
    session_id: str,
    request: schemas.RenameSessionRequest,
    db: DBSession = Depends(get_db),
):
    session = db.query(models.Session).filter(models.Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.name = request.name
    db.commit()
    db.refresh(session)
    return {"session_id": session.id, "name": session.name}


@router.delete("/sessions/{session_id}")
def delete_session(session_id: str, db: DBSession = Depends(get_db)):
    session = db.query(models.Session).filter(models.Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Delete associated documents and messages
    db.query(models.Document).filter(
        models.Document.session_id == session_id
    ).delete()
    db.query(models.Message).filter(
        models.Message.session_id == session_id
    ).delete()
    
    db.delete(session)
    db.commit()
    return {"status": "deleted"}


# ── Document endpoints ─────────────────────────────────────────────

@router.get(
    "/sessions/{session_id}/documents",
    response_model=List[schemas.DocumentResponse],
)
def get_documents(session_id: str, db: DBSession = Depends(get_db)):
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
def delete_document(session_id: str, doc_id: int, db: DBSession = Depends(get_db)):
    doc = (
        db.query(models.Document)
        .filter(models.Document.id == doc_id, models.Document.session_id == session_id)
        .first()
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    db.delete(doc)
    db.commit()
    return {"status": "deleted", "filename": doc.filename}


@router.post("/sessions/{session_id}/upload")
async def upload_document(
    session_id: str, file: UploadFile = File(...), db: DBSession = Depends(get_db)
):
    session = db.query(models.Session).filter(models.Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    content = await file.read()
    try:
        text = extract_text_from_file(content, file.filename)
        chunks = chunk_text(text)

        save_chunks(session_id, chunks, file.filename)

        doc = models.Document(
            session_id=session_id,
            filename=file.filename,
            extracted_text=text[:500] + "...",
        )
        db.add(doc)
        db.commit()

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
def get_messages(session_id: str, db: DBSession = Depends(get_db)):
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
def chat_with_session(session_id: str, request: schemas.ChatRequest, db: DBSession = Depends(get_db)):
    # Save user message
    user_msg = models.Message(
        session_id=session_id,
        sender="user",
        text=request.message
    )
    db.add(user_msg)
    db.commit()

    # Get AI answer with source citations
    result = query_session(session_id, request.message)
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
