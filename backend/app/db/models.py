from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func

from .database import Base


class Session(Base):
    __tablename__ = "sessions"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("sessions.id"))
    filename = Column(String)
    extracted_text = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
