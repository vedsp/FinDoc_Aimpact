import json
import os
from typing import Optional

import httpx
from app.core.config import settings

MODEL = "openai/gpt-oss-120b"

SYSTEM_PROMPT = """You are a financial document anomaly detector.
Input: JSON of extracted fields from one document, plus a JSON vendor baseline (may be null).
Flag anything unusual without using fixed formulas: judge against the baseline,
the document's internal consistency, and common fraud/error patterns
(duplicates, split amounts, round numbers, changed bank details, odd dates,
mismatched parties, unusual line items).

Return only JSON, no prose:
{"anomalies":[{"field":"","value":"","type":"","severity":"low|med|high","reason":"<=15 words"}],"risk":0-100}

If nothing is unusual, return {"anomalies":[],"risk":0}.
Never invent fields. Only cite values present in the input."""


def run_anomaly_detection(
    extracted_fields: dict,
    vendor_baseline: Optional[dict] = None,
) -> dict:
    """
    Call Groq LLaMA3 to detect anomalies in extracted document fields.

    Args:
        extracted_fields: dict of field_name -> value from the document.
        vendor_baseline:  historical stats for this vendor (avg, max, count) or None.

    Returns:
        {"anomalies": [...], "risk": 0-100}
        Falls back to {"anomalies": [], "risk": 0} on any error.
    """
    api_key = settings.GROQ_API_KEY
    if not api_key or api_key == "your_groq_key_here":
        return {"anomalies": [], "risk": 0, "error": "GROQ_API_KEY not configured"}

    payload = {
        "fields": extracted_fields,
        "baseline": vendor_baseline,
    }

    try:
        resp = httpx.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": MODEL,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": json.dumps(payload)},
                ],
                "max_tokens": 512,
                "temperature": 0.1,
                "response_format": {"type": "json_object"},
            },
            timeout=25,
        )
        resp.raise_for_status()
        raw = resp.json()["choices"][0]["message"]["content"]
        result = json.loads(raw)

        # Normalise: ensure expected keys exist
        result.setdefault("anomalies", [])
        result.setdefault("risk", 0)
        return result

    except httpx.TimeoutException:
        return {"anomalies": [], "risk": 0, "error": "Groq API timeout"}
    except Exception as e:
        return {"anomalies": [], "risk": 0, "error": str(e)}
