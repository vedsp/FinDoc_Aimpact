import json
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.models import User, ChatSession, ChatMessage
from app.services.rag import answer_question

router = APIRouter(prefix="/chat", tags=["chat"])

class ChatRequest(BaseModel):
    question: str
    session_id: Optional[int] = None

class MessageOut(BaseModel):
    sender: str
    content: str
    created_at: str

@router.post("/ask")
def ask(
    req: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session = (
        db.query(ChatSession).filter_by(id=req.session_id, user_id=current_user.id).first()
        if req.session_id else None
    )
    if not session:
        session = ChatSession(user_id=current_user.id, title=req.question[:50])
        db.add(session)
        db.commit()
        db.refresh(session)

    db.add(ChatMessage(session_id=session.id, sender="user", content=req.question))
    db.commit()

    result = answer_question(db, current_user.id, req.question)

    citations_str = json.dumps(result.get("sources", []))
    db.add(ChatMessage(
        session_id=session.id,
        sender="assistant",
        content=result.get("answer", ""),
        citations_json=citations_str
    ))
    db.commit()

    return {
        "session_id": session.id,
        "answer": result.get("answer", ""),
        "sources": result.get("sources", [])
    }

@router.get("/history/{session_id}")
def history(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session = db.query(ChatSession).filter_by(id=session_id, user_id=current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    msgs = db.query(ChatMessage).filter_by(session_id=session_id).order_by(ChatMessage.created_at.asc()).all()
    return [
        {
            "id": m.id,
            "sender": m.sender,
            "content": m.content,
            "citations": json.loads(m.citations_json) if m.citations_json else [],
            "created_at": m.created_at.isoformat() if m.created_at else None
        }
        for m in msgs
    ]
