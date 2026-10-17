"""
Financial Data Parser — extracts structured financial rows (BankTransaction, Invoice, GSTRecord)
from raw OCR/PDF text using regex patterns and LLM fallback.
Called during document upload after text extraction.
"""
import re
from typing import Optional
from sqlalchemy.orm import Session
from app.models.models import BankTransaction, Invoice, GSTRecord, ExtractedField


# ─── Regex helpers ────────────────────────────────────────────────────────────

_CURRENCY_PATTERN = re.compile(
    r'(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)', re.IGNORECASE
)
_AMOUNT_PATTERN = re.compile(r'\b([\d]{1,3}(?:,[\d]{2,3})*(?:\.\d{1,2})?)\b')
_DATE_PATTERN = re.compile(
    r'\b(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})\b'
)
_PAN_PATTERN  = re.compile(r'\b([A-Z]{5}[0-9]{4}[A-Z])\b')
_GSTIN_PATTERN = re.compile(r'\b(\d{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]{3})\b')
_ACCOUNT_PATTERN = re.compile(
    r'(?:account\s*holder|name)[:\s]+([A-Za-z\s\.&]{4,60})', re.IGNORECASE
)


def _parse_amount(text: str) -> float:
    """Return the largest INR-looking amount found in text, else 0."""
    matches = _CURRENCY_PATTERN.findall(text)
    if not matches:
        matches = _AMOUNT_PATTERN.findall(text)
    amounts = []
    for m in matches:
        try:
            amounts.append(float(m.replace(',', '')))
        except ValueError:
            pass
    return max(amounts, default=0.0)


def _parse_all_amounts(text: str):
    """Return all amounts found."""
    matches = _CURRENCY_PATTERN.findall(text)
    amounts = []
    for m in matches:
        try:
            amounts.append(float(m.replace(',', '')))
        except ValueError:
            pass
    return amounts


def _first_date(text: str) -> str:
    m = _DATE_PATTERN.search(text)
    return m.group(1) if m else "2025-01-01"


def _normalize_date(d: str) -> str:
    """Convert common date formats to YYYY-MM-DD."""
    for sep in ['-', '/']:
        parts = d.split(sep)
        if len(parts) == 3:
            if len(parts[0]) == 4:   # YYYY-MM-DD
                return d
            if len(parts[2]) == 4:   # DD-MM-YYYY
                return f"{parts[2]}-{parts[1].zfill(2)}-{parts[0].zfill(2)}"
    return d


# ─── Bank Statement Parsing ───────────────────────────────────────────────────

_TX_LINE = re.compile(
    r'(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})'          # date
    r'\s+(.{5,60}?)\s+'                           # description
    r'([\d,]+\.\d{2}|-)\s+'                       # debit or -
    r'([\d,]+\.\d{2}|-)\s+'                       # credit or -
    r'([\d,]+\.\d{2})',                            # balance
    re.MULTILINE
)


def _parse_bank_statement(text: str, doc_id: int) -> list:
    rows = []
    for m in _TX_LINE.finditer(text):
        date_raw, desc, debit_raw, credit_raw, bal_raw = m.groups()
        debit  = float(debit_raw.replace(',', ''))  if debit_raw  != '-' else 0.0
        credit = float(credit_raw.replace(',', '')) if credit_raw != '-' else 0.0
        balance = float(bal_raw.replace(',', ''))
        rows.append(BankTransaction(
            document_id=doc_id,
            date=_normalize_date(date_raw),
            description=desc.strip(),
            debit=debit,
            credit=credit,
            balance=balance,
        ))
    return rows


def _parse_bank_statement_simple(text: str, doc_id: int) -> list:
    """
    Fallback: when no structured table is detected, extract aggregate
    credit/debit totals from keywords and create two synthetic rows.
    """
    lines = text.split('\n')
    total_credit = 0.0
    total_debit  = 0.0
    date = _first_date(text)

    credit_kws = ['total credit', 'total inflow', 'total deposit', 'credits', 'inflows', 'total receipts']
    debit_kws  = ['total debit',  'total outflow', 'total withdrawal', 'debits', 'outflows', 'total payments']

    for line in lines:
        ll = line.lower()
        amounts = _parse_all_amounts(line)
        if amounts:
            if any(k in ll for k in credit_kws):
                total_credit = max(total_credit, amounts[0])
            if any(k in ll for k in debit_kws):
                total_debit  = max(total_debit, amounts[0])

    # Also look for standalone large amounts in lines containing 'cr' or 'dr' suffix
    cr_pattern = re.compile(r'([\d,]+(?:\.\d{2})?)\s*cr\b', re.IGNORECASE)
    dr_pattern = re.compile(r'([\d,]+(?:\.\d{2})?)\s*dr\b', re.IGNORECASE)
    for m in cr_pattern.finditer(text):
        try:
            total_credit = max(total_credit, float(m.group(1).replace(',', '')))
        except ValueError:
            pass
    for m in dr_pattern.finditer(text):
        try:
            total_debit = max(total_debit, float(m.group(1).replace(',', '')))
        except ValueError:
            pass

    rows = []
    if total_credit > 0:
        rows.append(BankTransaction(
            document_id=doc_id,
            date=date,
            description="Aggregated Credit Entries (extracted)",
            debit=0.0,
            credit=total_credit,
            balance=total_credit - total_debit,
        ))
    if total_debit > 0:
        rows.append(BankTransaction(
            document_id=doc_id,
            date=date,
            description="Aggregated Debit Entries (extracted)",
            debit=total_debit,
            credit=0.0,
            balance=0.0,
        ))
    return rows


# ─── Invoice Parsing ──────────────────────────────────────────────────────────

_INV_NO_PATTERN = re.compile(
    r'(?:invoice\s*(?:no|number|#)[:\s.]+)([A-Z0-9/\-]{3,20})', re.IGNORECASE
)
_VENDOR_PATTERN = re.compile(
    r'(?:vendor|supplier|seller|from|bill\s+from)[:\s]+([A-Za-z\s\.&]{4,60})',
    re.IGNORECASE
)
_TOTAL_PATTERN = re.compile(
    r'(?:total|grand\s*total|net\s*amount|amount\s*due)[:\s₹Rs.]*'
    r'([\d,]+(?:\.\d{1,2})?)',
    re.IGNORECASE
)
_SGST_PATTERN = re.compile(r'sgst[:\s₹Rs.]*([\d,]+(?:\.\d{1,2})?)', re.IGNORECASE)
_CGST_PATTERN = re.compile(r'cgst[:\s₹Rs.]*([\d,]+(?:\.\d{1,2})?)', re.IGNORECASE)
_IGST_PATTERN = re.compile(r'igst[:\s₹Rs.]*([\d,]+(?:\.\d{1,2})?)', re.IGNORECASE)


def _parse_invoice(text: str, doc_id: int) -> list:
    inv_match     = _INV_NO_PATTERN.search(text)
    vendor_match  = _VENDOR_PATTERN.search(text)
    total_match   = _TOTAL_PATTERN.search(text)
    date          = _first_date(text)
    gstin_match   = _GSTIN_PATTERN.search(text)

    def _amt(m): return float(m.group(1).replace(',', '')) if m else 0.0

    sgst = _amt(_SGST_PATTERN.search(text))
    cgst = _amt(_CGST_PATTERN.search(text))
    igst = _amt(_IGST_PATTERN.search(text))
    total_amount = _amt(total_match)

    # Derive taxable amount from total if taxes found
    tax = sgst + cgst + igst
    taxable = total_amount - tax if tax > 0 and total_amount > tax else total_amount

    inv = Invoice(
        document_id=doc_id,
        invoice_number=inv_match.group(1) if inv_match else f"INV-DOC{doc_id}",
        invoice_date=_normalize_date(date),
        vendor_name=(vendor_match.group(1).strip() if vendor_match else None),
        gstin=(gstin_match.group(1) if gstin_match else None),
        taxable_amount=round(taxable, 2),
        cgst=round(cgst, 2),
        sgst=round(sgst, 2),
        igst=round(igst, 2),
        total_amount=round(total_amount, 2),
    )
    return [inv] if total_amount > 0 else []


# ─── GST Return Parsing ───────────────────────────────────────────────────────

_TURNOVER_PATTERN = re.compile(
    r'(?:taxable\s*turnover|taxable\s*value|total\s*turnover|outward\s*supply)'
    r'[:\s₹Rs.]*([\d,]+(?:\.\d{1,2})?)',
    re.IGNORECASE
)
_ITC_PATTERN = re.compile(
    r'(?:input\s*tax\s*credit|itc\s*claimed|itc\s*availed)[:\s₹Rs.]*([\d,]+(?:\.\d{1,2})?)',
    re.IGNORECASE
)


def _parse_gst_return(text: str, doc_id: int) -> list:
    gstin_match    = _GSTIN_PATTERN.search(text)
    turnover_match = _TURNOVER_PATTERN.search(text)
    itc_match      = _ITC_PATTERN.search(text)
    date           = _first_date(text)

    def _amt(m): return float(m.group(1).replace(',', '')) if m else 0.0

    taxable_turnover = _amt(turnover_match)
    itc_claimed      = _amt(itc_match)

    tax_sgst = 0.0
    tax_cgst = 0.0
    m_sgst = _SGST_PATTERN.search(text)
    m_cgst = _CGST_PATTERN.search(text)
    m_igst = _IGST_PATTERN.search(text)
    tax_igst = _amt(m_igst)

    if m_sgst: tax_sgst = _amt(m_sgst)
    if m_cgst: tax_cgst = _amt(m_cgst)

    gst = GSTRecord(
        document_id=doc_id,
        gstin=(gstin_match.group(1) if gstin_match else "UNKNOWN"),
        filing_period=date[:7],
        taxable_turnover=round(taxable_turnover, 2),
        cgst_paid=round(tax_cgst, 2),
        sgst_paid=round(tax_sgst, 2),
        igst_paid=round(tax_igst, 2),
        total_tax=round(tax_sgst + tax_cgst + tax_igst, 2),
    )
    return [gst] if taxable_turnover > 0 else []


# ─── Extracted Fields (Account Holder, PAN, GSTIN) ────────────────────────────

def _extract_identity_fields(text: str, doc_id: int) -> list:
    fields = []
    name_m = _ACCOUNT_PATTERN.search(text)
    pan_m  = _PAN_PATTERN.search(text)
    gst_m  = _GSTIN_PATTERN.search(text)

    if name_m:
        fields.append(ExtractedField(
            document_id=doc_id,
            field_name="Account Holder",
            field_value=name_m.group(1).strip(),
            confidence=0.85
        ))
    if pan_m:
        fields.append(ExtractedField(
            document_id=doc_id,
            field_name="PAN",
            field_value=pan_m.group(1),
            confidence=0.95
        ))
    if gst_m:
        fields.append(ExtractedField(
            document_id=doc_id,
            field_name="GSTIN",
            field_value=gst_m.group(1),
            confidence=0.95
        ))
    return fields


# ─── Master Entry Point ────────────────────────────────────────────────────────

def parse_and_store_financial_data(
    db: Session,
    doc_id: int,
    doc_category: str,
    extracted_text: str
):
    """
    Called after text extraction. Parses financial rows from the extracted text
    and saves them to BankTransaction / Invoice / GSTRecord tables so that
    dashboard totals (total_revenue, total_expenses) show real values.
    """
    if not extracted_text or len(extracted_text.strip()) < 30:
        return

    text = extracted_text

    # Always try to extract identity fields (PAN, GSTIN, Account Holder)
    id_fields = _extract_identity_fields(text, doc_id)
    for f in id_fields:
        db.add(f)

    cat = (doc_category or '').upper()

    if cat == 'BANK_STATEMENT':
        rows = _parse_bank_statement(text, doc_id)
        if not rows:
            rows = _parse_bank_statement_simple(text, doc_id)
        for r in rows:
            db.add(r)

    elif cat == 'INVOICE':
        rows = _parse_invoice(text, doc_id)
        for r in rows:
            db.add(r)

    elif cat == 'GST_RETURN':
        rows = _parse_gst_return(text, doc_id)
        for r in rows:
            db.add(r)

    elif cat == 'ITR':
        # For ITR, parse as income + extract key fields
        amounts = _parse_all_amounts(text)
        if amounts:
            # Treat the largest amount as gross income → store as a credit entry
            db.add(BankTransaction(
                document_id=doc_id,
                date=_first_date(text),
                description="ITR Declared Gross Income",
                debit=0.0,
                credit=max(amounts),
                balance=max(amounts),
            ))

    db.commit()
