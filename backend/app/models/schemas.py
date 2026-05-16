from pydantic import BaseModel


class SessionResponse(BaseModel):
    session_id: str
    name: str


class RenameSessionRequest(BaseModel):
    name: str


class ChatRequest(BaseModel):
    message: str


class DocumentResponse(BaseModel):
    id: int
    filename: str
    session_id: str


class MessageResponse(BaseModel):
    id: int
    text: str
    sender: str
    session_id: str
