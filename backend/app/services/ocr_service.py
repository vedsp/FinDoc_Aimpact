"""
Universal Document & Image OCR Extraction Engine.
Supports:
1. Native Digital PDFs (PyMuPDF fast text layer extraction)
2. Scanned / Image PDFs (PyMuPDF page rendering + RapidOCR)
3. Mobile Camera Photos & Scans (JPG, JPEG, PNG, WEBP, BMP, TIFF via RapidOCR)
"""
import io
import os
import pymupdf
from PIL import Image

_ocr_engine = None

def get_ocr():
    global _ocr_engine
    if _ocr_engine is None:
        try:
            from rapidocr_onnxruntime import RapidOCR
            _ocr_engine = RapidOCR()
        except Exception as e:
            print("Failed to initialize RapidOCR:", e)
            _ocr_engine = False
    return _ocr_engine


def extract_text_from_bytes(content: bytes, filename: str) -> tuple[str, int]:
    """
    Extracts readable text and page count from any document or mobile camera photo.
    Returns: (extracted_text, page_count)
    """
    ext = os.path.splitext(filename)[1].lower()
    
    # ── 1. PDF Documents ───────────────────────────────────────────────────────
    if ext == ".pdf":
        try:
            doc = pymupdf.open(stream=content, filetype="pdf")
            page_count = len(doc)
            page_texts = []
            
            ocr = get_ocr()
            for page_idx in range(page_count):
                page = doc[page_idx]
                text = page.get_text().strip()
                
                # If page has little/no text layer, it's a scanned/photographed PDF
                if len(text) < 40 and ocr:
                    try:
                        pix = page.get_pixmap(dpi=150)
                        img_bytes = pix.tobytes("png")
                        result, _ = ocr(img_bytes)
                        if result:
                            ocr_text = "\n".join([line[1] for line in result])
                            text = ocr_text if len(ocr_text) > len(text) else text
                    except Exception as ocr_err:
                        print(f"OCR fallback failed on PDF page {page_idx}: {ocr_err}")
                        
                page_texts.append(text)
                
            doc.close()
            combined_text = "\n\n".join(page_texts).strip()
            return combined_text or filename, page_count
        except Exception as e:
            print(f"PDF extraction error for {filename}: {e}")
            return filename, 1

    # ── 2. Mobile Camera Photos & Images ───────────────────────────────────────
    IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"}
    if ext in IMAGE_EXTENSIONS:
        ocr = get_ocr()
        if ocr:
            try:
                # Preprocess / verify image with Pillow
                img = Image.open(io.BytesIO(content))
                img = img.convert("RGB")
                buf = io.BytesIO()
                img.save(buf, format="PNG")
                processed_bytes = buf.getvalue()

                result, elapse = ocr(processed_bytes)
                if result:
                    lines = [item[1] for item in result]
                    extracted_text = "\n".join(lines).strip()
                    return extracted_text or filename, 1
            except Exception as img_err:
                print(f"OCR error on image {filename}: {img_err}")
                
        return filename, 1

    # Fallback
    return filename, 1
