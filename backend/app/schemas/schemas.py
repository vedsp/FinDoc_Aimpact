from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any, Dict
from datetime import datetime

# --- Auth Schemas ---
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# --- Document Schemas ---
class DocumentResponse(BaseModel):
    id: int
    filename: str
    original_name: str
    file_type: str
    file_size: int
    document_category: str
    status: str
    page_count: int
    storage_path: str
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class DocumentDetailResponse(DocumentResponse):
    extracted_fields: List[Dict[str, Any]] = []
    bank_transactions_count: int = 0
    invoices_count: int = 0
    gst_records_count: int = 0
    anomalies_count: int = 0

# --- Dashboard & Analytics Schemas ---
class DashboardOverview(BaseModel):
    documents_processed: int
    total_revenue: float
    total_expenses: float
    net_cash_flow: float
    risk_score: int
    risk_level: str
    category_counts: Dict[str, int]
    recent_documents: List[DocumentResponse]
    active_alerts_count: int
    assessee_name: Optional[str] = None
    assessee_pan: Optional[str] = None
    assessee_gstin: Optional[str] = None

# --- General Message Schema ---
class MessageResponse(BaseModel):
    message: str
    status: str = "success"
