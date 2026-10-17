from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.models.models import VendorBaseline


def get_baseline(
    db: Session,
    user_id: int,
    vendor_name: str,
    doc_type: str,
) -> Optional[dict]:
    """
    Return historical baseline stats for a vendor+doc_type pair, or None if
    fewer than 2 samples exist (not enough history to judge against).
    """
    bl = (
        db.query(VendorBaseline)
        .filter_by(user_id=user_id, vendor_name=vendor_name, doc_type=doc_type)
        .first()
    )
    if not bl or bl.sample_count < 2:
        return None
    return {
        "avg_amount": round(bl.avg_amount, 2),
        "max_amount": round(bl.max_amount, 2),
        "sample_count": bl.sample_count,
        "vendor": vendor_name,
        "doc_type": doc_type,
    }


def update_baseline(
    db: Session,
    user_id: int,
    vendor_name: str,
    doc_type: str,
    new_amount: float,
) -> None:
    """
    Upsert a running average + max for the vendor baseline after a new document
    is processed. Called every time a document is uploaded.
    """
    if not vendor_name or new_amount <= 0:
        return

    bl = (
        db.query(VendorBaseline)
        .filter_by(user_id=user_id, vendor_name=vendor_name, doc_type=doc_type)
        .first()
    )

    if not bl:
        bl = VendorBaseline(
            user_id=user_id,
            vendor_name=vendor_name,
            doc_type=doc_type,
            avg_amount=new_amount,
            max_amount=new_amount,
            sample_count=1,
        )
        db.add(bl)
    else:
        # Running average
        total = bl.avg_amount * bl.sample_count + new_amount
        bl.sample_count += 1
        bl.avg_amount = total / bl.sample_count
        bl.max_amount = max(bl.max_amount, new_amount)
        bl.updated_at = datetime.utcnow()

    db.commit()
