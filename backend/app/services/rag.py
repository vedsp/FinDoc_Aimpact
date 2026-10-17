import httpx
from sqlalchemy.orm import Session
from app.models.models import Document, DocumentPage
from app.core.config import settings

MODEL = "openai/gpt-oss-120b"

def answer_question(db: Session, user_id: int, question: str) -> dict:
    doc_ids = [d.id for d in db.query(Document).filter_by(user_id=user_id).all()]
    if not doc_ids:
        return {"answer": "No documents uploaded yet. Please upload documents or load the demo scenario first.", "sources": []}

    pages = db.query(DocumentPage).filter(DocumentPage.document_id.in_(doc_ids)).all()

    context_parts, char_budget = [], 6000
    for page in pages:
        if page.extracted_text and char_budget > 0:
            chunk = page.extracted_text[:char_budget]
            context_parts.append(chunk)
            char_budget -= len(chunk)

    context = "\n---\n".join(context_parts) or "No document text available."

    system = """You are FinDocAI Assistant, an expert financial auditor and forensic analyst.
Answer questions accurately based on the financial documents provided.
Cite specific numbers, dates, and entities whenever available.
If the answer is not in the documents, state so clearly and concisely."""

    api_key = settings.GROQ_API_KEY
    if not api_key or api_key == "your_groq_key_here":
        return {"answer": "GROQ_API_KEY is not configured in backend environment.", "sources": []}

    try:
        resp = httpx.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": MODEL,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user",   "content": f"DOCUMENTS:\n{context}\n\nQUESTION: {question}"}
                ],
                "max_tokens": 512,
                "temperature": 0.2
            },
            timeout=25
        )
        data = resp.json()
        if "choices" in data and len(data["choices"]) > 0:
            answer = data["choices"][0]["message"]["content"]
            return {"answer": answer, "sources": [f"DOC-{str(d).zfill(5)}" for d in doc_ids[:3]]}
        else:
            return {"answer": f"Unable to generate response: {data.get('error', {}).get('message', 'Unknown error')}", "sources": []}
    except Exception as e:
        return {"answer": f"Error querying financial copilot: {str(e)}", "sources": []}
