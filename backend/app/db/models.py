from pgvector.sqlalchemy import Vector
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String)
    picture = Column(String)  # Google profile picture URL
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    sessions = relationship("Session", back_populates="owner", cascade="all, delete-orphan")


class Session(Base):
    __tablename__ = "sessions"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("User", back_populates="sessions")
    documents = relationship("Document", back_populates="session", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="session", cascade="all, delete-orphan")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("sessions.id", ondelete="CASCADE"))
    filename = Column(String)
    extracted_text = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("Session", back_populates="documents")
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")


class DocumentChunk(Base):
    """Stores text chunks with their embedding vectors for semantic search."""
    __tablename__ = "document_chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"))
    session_id = Column(String, ForeignKey("sessions.id", ondelete="CASCADE"), index=True)
    filename = Column(String)
    text = Column(Text)
    embedding = Column(Vector(768))  # Gemini embedding dimension
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    document = relationship("Document", back_populates="chunks")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("sessions.id", ondelete="CASCADE"))
    sender = Column(String)  # 'user' or 'ai'
    text = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("Session", back_populates="messages")
