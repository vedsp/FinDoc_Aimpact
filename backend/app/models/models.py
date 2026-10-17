from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, Boolean, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base

class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    ANALYST = "ANALYST"
    BUSINESS_USER = "BUSINESS_USER"

class DocumentCategory(str, enum.Enum):
    BANK_STATEMENT = "BANK_STATEMENT"
    GST_RETURN = "GST_RETURN"
    ITR = "ITR"
    INVOICE = "INVOICE"
    BALANCE_SHEET = "BALANCE_SHEET"
    PROFIT_LOSS = "PROFIT_LOSS"
    SALARY_SLIP = "SALARY_SLIP"
    LOAN_DOCUMENT = "LOAN_DOCUMENT"
    OTHER = "OTHER"

class DocumentStatus(str, enum.Enum):
    UPLOADED = "UPLOADED"
    PROCESSING = "PROCESSING"
    EXTRACTED = "EXTRACTED"
    ANALYZED = "ANALYZED"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, default=UserRole.ANALYST.value)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    documents = relationship("Document", back_populates="owner", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user")

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename = Column(String, nullable=False)
    original_name = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # pdf, png, jpg, csv, xlsx
    mime_type = Column(String, nullable=True)
    file_size = Column(Integer, nullable=False)
    document_category = Column(String, default=DocumentCategory.OTHER.value)
    status = Column(String, default=DocumentStatus.UPLOADED.value)
    page_count = Column(Integer, default=1)
    storage_path = Column(String, nullable=False)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="documents")
    pages = relationship("DocumentPage", back_populates="document", cascade="all, delete-orphan")
    extracted_fields = relationship("ExtractedField", back_populates="document", cascade="all, delete-orphan")
    bank_transactions = relationship("BankTransaction", back_populates="document", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="document", cascade="all, delete-orphan")
    gst_records = relationship("GSTRecord", back_populates="document", cascade="all, delete-orphan")
    anomalies = relationship("Anomaly", back_populates="document", cascade="all, delete-orphan")

class DocumentPage(Base):
    __tablename__ = "document_pages"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    page_number = Column(Integer, nullable=False)
    extracted_text = Column(Text, nullable=True)
    metadata_json = Column(Text, nullable=True)

    document = relationship("Document", back_populates="pages")

class ExtractedField(Base):
    __tablename__ = "extracted_fields"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    field_name = Column(String, nullable=False)
    field_value = Column(String, nullable=True)
    confidence = Column(Float, default=1.0)
    source_page = Column(Integer, default=1)
    bounding_box_json = Column(Text, nullable=True)

    document = relationship("Document", back_populates="extracted_fields")

class BankTransaction(Base):
    __tablename__ = "bank_transactions"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    date = Column(String, nullable=False)
    description = Column(String, nullable=False)
    debit = Column(Float, default=0.0)
    credit = Column(Float, default=0.0)
    balance = Column(Float, default=0.0)
    reference_no = Column(String, nullable=True)
    is_anomaly = Column(Boolean, default=False)
    anomaly_reason = Column(String, nullable=True)

    document = relationship("Document", back_populates="bank_transactions")

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    invoice_number = Column(String, nullable=False)
    invoice_date = Column(String, nullable=True)
    vendor_name = Column(String, nullable=True)
    customer_name = Column(String, nullable=True)
    gstin = Column(String, nullable=True)
    hsn_sac = Column(String, nullable=True)
    taxable_amount = Column(Float, default=0.0)
    cgst = Column(Float, default=0.0)
    sgst = Column(Float, default=0.0)
    igst = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)
    is_duplicate = Column(Boolean, default=False)
    duplicate_of_id = Column(Integer, nullable=True)

    document = relationship("Document", back_populates="invoices")

class GSTRecord(Base):
    __tablename__ = "gst_records"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    gstin = Column(String, nullable=False)
    business_name = Column(String, nullable=True)
    filing_period = Column(String, nullable=True)
    taxable_turnover = Column(Float, default=0.0)
    cgst_paid = Column(Float, default=0.0)
    sgst_paid = Column(Float, default=0.0)
    igst_paid = Column(Float, default=0.0)
    total_tax = Column(Float, default=0.0)

    document = relationship("Document", back_populates="gst_records")

class FinancialMetric(Base):
    __tablename__ = "financial_metrics"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    metric_key = Column(String, nullable=False)
    metric_value = Column(Float, nullable=False)
    period = Column(String, nullable=True)
    details_json = Column(Text, nullable=True)

class Anomaly(Base):
    __tablename__ = "anomalies"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    anomaly_type = Column(String, nullable=False)  # UNUSUAL_AMOUNT, DUPLICATE_INVOICE, MISMATCH
    severity = Column(String, default="MEDIUM")    # LOW, MEDIUM, HIGH
    description = Column(Text, nullable=False)
    explanation = Column(Text, nullable=True)
    details_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="anomalies")

class RiskAssessment(Base):
    __tablename__ = "risk_assessments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    overall_score = Column(Integer, nullable=False)  # 0 to 100
    risk_level = Column(String, nullable=False)     # LOW, MODERATE, HIGH
    positive_factors_json = Column(Text, nullable=True)
    risk_factors_json = Column(Text, nullable=True)
    breakdown_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, default="Financial Query Session")
    created_at = Column(DateTime, default=datetime.utcnow)

    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"), nullable=False)
    sender = Column(String, nullable=False)  # user, assistant
    content = Column(Text, nullable=False)
    citations_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("ChatSession", back_populates="messages")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String, nullable=False)
    target_type = Column(String, nullable=True)
    target_id = Column(String, nullable=True)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="audit_logs")


class VendorBaseline(Base):
    __tablename__ = "vendor_baselines"

    id           = Column(Integer, primary_key=True, index=True)
    user_id      = Column(Integer, ForeignKey("users.id"), nullable=False)
    vendor_name  = Column(String, index=True, nullable=False)
    doc_type     = Column(String, nullable=False)          # INVOICE | BANK_STATEMENT etc.
    avg_amount   = Column(Float, default=0.0)
    max_amount   = Column(Float, default=0.0)
    sample_count = Column(Integer, default=0)
    updated_at   = Column(DateTime, default=datetime.utcnow)
