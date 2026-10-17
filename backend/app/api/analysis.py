from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.models import User, Document, BankTransaction, Invoice, GSTRecord

router = APIRouter(prefix="/analysis", tags=["analysis"])

@router.get("/cross-verify")
def cross_verify(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc_ids = [d.id for d in db.query(Document).filter_by(user_id=current_user.id).all()]
    bank_credits = sum(t.credit for t in db.query(BankTransaction).filter(BankTransaction.document_id.in_(doc_ids)).all())
    gst_turnover = sum(g.taxable_turnover for g in db.query(GSTRecord).filter(GSTRecord.document_id.in_(doc_ids)).all())
    inv_total    = sum(i.total_amount for i in db.query(Invoice).filter(Invoice.document_id.in_(doc_ids)).all())
    diff = bank_credits - gst_turnover
    return {
        "bank_credits":  round(bank_credits, 2),
        "gst_turnover":  round(gst_turnover, 2),
        "invoice_total": round(inv_total, 2),
        "bank_gst_diff": round(diff, 2),
        "flag": abs(diff) > 0.1 * max(bank_credits, gst_turnover, 1)
    }

@router.get("/duplicates")
def find_duplicates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc_ids = [d.id for d in db.query(Document).filter_by(user_id=current_user.id).all()]
    invoices = db.query(Invoice).filter(Invoice.document_id.in_(doc_ids)).all()
    seen, dupes = {}, []
    for inv in invoices:
        key = (inv.vendor_name, inv.total_amount, inv.invoice_date)
        if key in seen:
            dupes.append({
                "original": seen[key],
                "duplicate": inv.invoice_number,
                "vendor": inv.vendor_name,
                "amount": inv.total_amount,
                "date": inv.invoice_date
            })
        else:
            seen[key] = inv.invoice_number
    return {"duplicates": dupes, "count": len(dupes)}

@router.get("/split-payments")
def split_payments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from collections import defaultdict
    doc_ids = [d.id for d in db.query(Document).filter_by(user_id=current_user.id).all()]
    txs = db.query(BankTransaction).filter(BankTransaction.document_id.in_(doc_ids), BankTransaction.debit > 0).all()
    groups = defaultdict(list)
    for t in txs:
        groups[t.description].append({"date": t.date, "amount": t.debit})
    flags = [
        {"description": k, "transactions": v, "total": sum(x["amount"] for x in v)}
        for k, v in groups.items() if len(v) > 1
    ]
    return {"split_payments": flags, "count": len(flags)}
