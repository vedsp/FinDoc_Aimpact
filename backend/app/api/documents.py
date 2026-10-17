import os
import uuid
import json
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.models.models import (
    User, Document, DocumentStatus, DocumentCategory, DocumentPage,
    ExtractedField, BankTransaction, Invoice, GSTRecord, Anomaly, RiskAssessment
)
from app.schemas.schemas import DocumentResponse, DocumentDetailResponse, DashboardOverview, MessageResponse
from app.api.deps import get_current_user
from app.services.document_classification import classify_text_content
from app.services.financial_parser import parse_and_store_financial_data
from app.core import storage

router = APIRouter(prefix="/documents", tags=["documents"])


ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".csv", ".xlsx", ".xls"}
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB limit

@router.post("/upload", response_model=List[DocumentResponse], status_code=status.HTTP_201_CREATED)
async def upload_documents(
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    uploaded_docs = []
    
    for file in files:
        # Validate filename and extension
        filename = file.filename
        ext = os.path.splitext(filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format '{ext}'. Allowed formats: PDF, PNG, JPG, JPEG, CSV, XLSX."
            )
            
        # Read content and validate size
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File '{filename}' exceeds maximum allowed size of 25MB."
            )

        # Upload to storage (Supabase bucket or local disk)
        storage_path = storage.upload_file(content, filename)

        # Extract initial raw text for classification
        extracted_text_preview = ""
        file_type = ext.replace(".", "")
        page_count = 1

        if ext == ".pdf":
            tmp_path = None
            try:
                import fitz
                # Download to a temp file so fitz can open it (works for both Supabase and local)
                tmp_path = storage.open_as_tempfile(storage_path, suffix=".pdf")
                doc = fitz.open(tmp_path)
                page_text_list = [page.get_text() for page in doc]
                extracted_text_preview = " ".join(page_text_list)
                page_count = len(doc)
                doc.close()
            except Exception:
                extracted_text_preview = filename
            finally:
                if tmp_path and os.path.exists(tmp_path):
                    try:
                        os.remove(tmp_path)
                    except OSError:
                        pass
        else:
            extracted_text_preview = filename
            
        # Auto-classify document type
        category = classify_text_content(extracted_text_preview, filename)
        
        # Create database record
        unique_filename = os.path.basename(storage_path.split("?")[0])  # strip query params if any
        doc_record = Document(
            user_id=current_user.id,
            filename=unique_filename,
            original_name=filename,
            file_type=file_type,
            mime_type=file.content_type,
            file_size=len(content),
            document_category=category,
            status=DocumentStatus.EXTRACTED.value if extracted_text_preview else DocumentStatus.UPLOADED.value,
            page_count=page_count,
            storage_path=storage_path
        )
        db.add(doc_record)
        db.commit()
        db.refresh(doc_record)
        # Save extracted page text for RAG (used by chat endpoint)
        if extracted_text_preview:
            db.add(DocumentPage(
                document_id=doc_record.id,
                page_number=1,
                extracted_text=extracted_text_preview[:4000],
            ))
            db.commit()

        # ── Parse & Store Financial Data (BankTransaction / Invoice / GSTRecord) ──
        # This populates the real rows so that dashboard totals are non-zero
        if extracted_text_preview:
            parse_and_store_financial_data(
                db=db,
                doc_id=doc_record.id,
                doc_category=category,
                extracted_text=extracted_text_preview
            )

        # ── LLM Anomaly Detection ─────────────────────────────────────────
        from app.services.anomaly_detection import run_anomaly_detection
        from app.services.vendor_baseline import get_baseline, update_baseline

        vendor_name = filename.split(".")[0][:40]   # no PII in prompt

        fields_dict = {
            "filename": filename,
            "category": category,
            "file_type": file_type,
            "file_size_kb": round(len(content) / 1024, 1),
            "text_preview": extracted_text_preview[:2000],
        }

        baseline = get_baseline(db, current_user.id, vendor_name, category)
        detection = run_anomaly_detection(fields_dict, baseline)

        for a in detection.get("anomalies", []):
            db.add(Anomaly(
                document_id=doc_record.id,
                anomaly_type=a.get("type", "UNKNOWN").upper()[:50],
                severity=a.get("severity", "low").upper(),
                description=a.get("reason", "")[:500],
                explanation=(
                    f"Field: {a.get('field', '')} | "
                    f"Value: {a.get('value', '')}"
                ),
                details_json=str(a),
            ))

        update_baseline(db, current_user.id, vendor_name, category, len(content))
        db.commit()
        # ─────────────────────────────────────────────────────────────────

        uploaded_docs.append(DocumentResponse.model_validate(doc_record))

        
    return uploaded_docs


@router.get("/", response_model=List[DocumentResponse])
def get_documents(
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Document).filter(Document.user_id == current_user.id)
    if category:
        query = query.filter(Document.document_category == category)
    if status:
        query = query.filter(Document.status == status)
    
    docs = query.order_by(Document.created_at.desc()).all()
    return [DocumentResponse.model_validate(d) for d in docs]

@router.get("/dashboard/overview", response_model=DashboardOverview)
def get_dashboard_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_docs = db.query(Document).filter(Document.user_id == current_user.id).all()

    category_counts = {}
    for cat in DocumentCategory:
        category_counts[cat.value] = 0
    for doc in user_docs:
        category_counts[doc.document_category] = category_counts.get(doc.document_category, 0) + 1

    # Calculate financial totals from bank transactions or invoices
    total_rev = 0.0
    total_exp = 0.0

    txs = db.query(BankTransaction).join(Document).filter(Document.user_id == current_user.id).all()
    for tx in txs:
        total_rev += tx.credit
        total_exp += tx.debit

    # Count anomalies
    anomalies_count = db.query(Anomaly).join(Document).filter(Document.user_id == current_user.id).count()

    recent_docs = db.query(Document).filter(Document.user_id == current_user.id).order_by(Document.created_at.desc()).limit(5).all()

    # Dynamic risk assessment lookup or calculation
    risk_record = db.query(RiskAssessment).filter(RiskAssessment.user_id == current_user.id).order_by(RiskAssessment.id.desc()).first()
    
    if len(user_docs) == 0:
        calculated_risk_score = 0
        calculated_risk_level = "NO DATA"
    elif risk_record:
        calculated_risk_score = risk_record.overall_score
        calculated_risk_level = risk_record.risk_level
    else:
        # Derive score from actual anomaly severities in the DB
        from app.models.models import Anomaly as AnomalyModel
        all_anomalies = (
            db.query(AnomalyModel)
            .join(Document)
            .filter(Document.user_id == current_user.id)
            .all()
        )
        severity_weights = {"HIGH": 20, "MEDIUM": 10, "LOW": 5}
        raw_score = sum(severity_weights.get(a.severity, 5) for a in all_anomalies)
        calculated_risk_score = min(100, raw_score) if all_anomalies else 10
        calculated_risk_level = (
            "HIGH" if calculated_risk_score >= 60 else
            "MODERATE" if calculated_risk_score >= 30 else
            "LOW"
        )

    # Extract assessee details from ExtractedField safely
    name_row = db.query(ExtractedField.field_value).filter(ExtractedField.document_id.in_([d.id for d in user_docs]), ExtractedField.field_name == "Account Holder").first()
    pan_row = db.query(ExtractedField.field_value).filter(ExtractedField.document_id.in_([d.id for d in user_docs]), ExtractedField.field_name == "PAN").first()
    gst_row = db.query(GSTRecord.gstin).filter(GSTRecord.document_id.in_([d.id for d in user_docs])).first()

    assessee_name = name_row[0] if name_row else None
    assessee_pan = pan_row[0] if pan_row else None
    assessee_gstin = gst_row[0] if gst_row else None
    if not assessee_gstin:
        gstin_field = db.query(ExtractedField.field_value).filter(ExtractedField.document_id.in_([d.id for d in user_docs]), ExtractedField.field_name == "GSTIN").first()
        assessee_gstin = gstin_field[0] if gstin_field else None

    return DashboardOverview(
        documents_processed=len(user_docs),
        total_revenue=round(total_rev, 2),
        total_expenses=round(total_exp, 2),
        net_cash_flow=round(total_rev - total_exp, 2),
        risk_score=calculated_risk_score,
        risk_level=calculated_risk_level,
        category_counts=category_counts,
        recent_documents=[DocumentResponse.model_validate(d) for d in recent_docs],
        active_alerts_count=anomalies_count,
        assessee_name=assessee_name,
        assessee_pan=assessee_pan,
        assessee_gstin=assessee_gstin
    )

@router.get("/risk/assessment")
def get_risk_assessment(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_docs_count = db.query(Document).filter(Document.user_id == current_user.id).count()
    if user_docs_count == 0:
        return {"has_data": False, "message": "No documents uploaded yet"}

    risk_record = db.query(RiskAssessment).filter(RiskAssessment.user_id == current_user.id).order_by(RiskAssessment.id.desc()).first()
    
    if risk_record:
        return {
            "has_data": True,
            "overall_score": risk_record.overall_score,
            "risk_level": risk_record.risk_level,
            "positive_factors": json.loads(risk_record.positive_factors_json) if risk_record.positive_factors_json else [],
            "risk_factors": json.loads(risk_record.risk_factors_json) if risk_record.risk_factors_json else [],
            "breakdown": json.loads(risk_record.breakdown_json) if risk_record.breakdown_json else {}
        }
    else:
        # Compute baseline score
        anomalies_count = db.query(Anomaly).join(Document).filter(Document.user_id == current_user.id).count()
        severity_weights = {"HIGH": 20, "MEDIUM": 10, "LOW": 5}
        raw = sum(severity_weights.get(a.severity, 5) for a in
                  db.query(Anomaly).join(Document)
                  .filter(Document.user_id == current_user.id).all())
        score = min(100, raw) if raw > 0 else 10
        level = "HIGH" if score >= 60 else "MODERATE" if score >= 30 else "LOW"
        user_docs = db.query(Document).filter(Document.user_id == current_user.id).all()
        txs = db.query(BankTransaction).join(Document).filter(Document.user_id == current_user.id).all()
        total_rev = sum(tx.credit for tx in txs)
        total_exp = sum(tx.debit for tx in txs)
        return {
            "has_data": True,
            "overall_score": score,
            "risk_level": level,
            "positive_factors": ["Documentation uploaded and processed", "Active transactions recorded"] if anomalies_count == 0 else ["Documentation uploaded"],
            "risk_factors": [f"{anomalies_count} anomalous patterns flagged for human review"] if anomalies_count > 0 else [],
            "breakdown": {
                "cash_flow_stability": min(100, int((total_rev / max(total_exp, 1.0)) * 50)) if total_exp > 0 else 80,
                "debt_burden": 70,
                "revenue_consistency": 75 if total_rev > 0 else 50,
                "cross_document_consistency": 55 if anomalies_count > 0 else 90,
                "transaction_anomalies": max(10, 100 - (anomalies_count * 15)),
                "document_completeness": min(100, len(user_docs) * 25)
            }
        }

@router.get("/anomalies/list")
def get_anomalies_list(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    anomalies = db.query(Anomaly).join(Document).filter(Document.user_id == current_user.id).order_by(Anomaly.created_at.desc()).all()
    results = []
    for a in anomalies:
        results.append({
            "id": a.id,
            "document_id": a.document_id,
            "document_name": a.document.original_name if a.document else "",
            "anomaly_type": a.anomaly_type,
            "severity": a.severity,
            "description": a.description,
            "explanation": a.explanation,
            "details": json.loads(a.details_json) if a.details_json else {},
            "created_at": a.created_at
        })
    return results


@router.get("/{document_id}", response_model=DocumentDetailResponse)
def get_document_detail(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(Document).filter(Document.id == document_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    extracted_fields = [
        {"id": ef.id, "field_name": ef.field_name, "field_value": ef.field_value, "confidence": ef.confidence, "page": ef.source_page}
        for ef in doc.extracted_fields
    ]
    
    tx_count = db.query(BankTransaction).filter(BankTransaction.document_id == doc.id).count()
    inv_count = db.query(Invoice).filter(Invoice.document_id == doc.id).count()
    gst_count = db.query(GSTRecord).filter(GSTRecord.document_id == doc.id).count()
    anomaly_count = db.query(Anomaly).filter(Anomaly.document_id == doc.id).count()

    detail = DocumentDetailResponse(
        id=doc.id,
        filename=doc.filename,
        original_name=doc.original_name,
        file_type=doc.file_type,
        file_size=doc.file_size,
        document_category=doc.document_category,
        status=doc.status,
        page_count=doc.page_count,
        storage_path=doc.storage_path,
        error_message=doc.error_message,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
        extracted_fields=extracted_fields,
        bank_transactions_count=tx_count,
        invoices_count=inv_count,
        gst_records_count=gst_count,
        anomalies_count=anomaly_count
    )
    return detail

@router.delete("/{document_id}", response_model=MessageResponse)
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(Document).filter(Document.id == document_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Delete file from storage (Supabase bucket or local disk)
    if doc.storage_path:
        storage.delete_file(doc.storage_path)
            
    db.delete(doc)
    db.commit()
    return MessageResponse(message="Document deleted successfully", status="success")

