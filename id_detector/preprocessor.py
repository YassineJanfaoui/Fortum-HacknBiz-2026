"""
Image preprocessing for the ID Detector Agent.

Handles:
- PDF → image conversion (first page only)
- Image resizing to stay within API limits
- EXIF metadata stripping (privacy protection)
"""

from __future__ import annotations

import io
import logging

from PIL import Image

from . import config

logger = logging.getLogger(__name__)


def preprocess(data: bytes, mime_type: str) -> tuple[bytes, str]:
    """
    Preprocess raw file bytes into clean image bytes ready for the API.

    Parameters
    ----------
    data : bytes
        Raw validated file bytes.
    mime_type : str
        MIME type detected by the validator.

    Returns
    -------
    tuple[bytes, str]
        Processed image bytes and output MIME type (always image/jpeg or image/png).
    """
    if mime_type == "application/pdf":
        data, mime_type = _pdf_to_image(data)

    data = _strip_exif(data, mime_type)
    data = _resize_if_needed(data, mime_type)

    logger.info("Preprocessing complete: output_size=%d bytes, mime=%s", len(data), mime_type)
    return data, mime_type


def _pdf_to_image(data: bytes) -> tuple[bytes, str]:
    """
    Convert the first page of a PDF to a JPEG image.

    Uses PyMuPDF (fitz) for rendering. Only the first page is processed
    since ID documents are typically single-page.
    """
    try:
        import fitz  # PyMuPDF
    except ImportError as exc:
        raise ImportError(
            "PyMuPDF is required for PDF support. Install it with: pip install PyMuPDF"
        ) from exc

    doc = fitz.open(stream=data, filetype="pdf")
    try:
        if doc.page_count == 0:
            from .exceptions import InvalidFileError
            raise InvalidFileError("PDF has no pages.")

        page = doc[0]
        # Render at 2x for decent quality
        mat = fitz.Matrix(2.0, 2.0)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        img_bytes = pix.tobytes("jpeg")
    finally:
        doc.close()

    logger.info("PDF converted to JPEG: page_count=%d", doc.page_count)
    return img_bytes, "image/jpeg"


def _strip_exif(data: bytes, mime_type: str) -> bytes:
    """
    Remove EXIF metadata from images to protect PII.

    EXIF data can contain GPS coordinates, camera serial numbers,
    and other personally identifiable information.
    """
    if mime_type not in ("image/jpeg", "image/png"):
        return data

    try:
        img = Image.open(io.BytesIO(data))

        # Create a clean copy without metadata
        clean = Image.new(img.mode, img.size)
        clean.putdata(list(img.getdata()))

        buf = io.BytesIO()
        fmt = "JPEG" if mime_type == "image/jpeg" else "PNG"
        clean.save(buf, format=fmt, quality=95)
        result = buf.getvalue()

        logger.debug("EXIF stripped: %d -> %d bytes", len(data), len(result))
        return result
    except Exception as exc:
        logger.warning("EXIF stripping failed, using original: %s", exc)
        return data


def _resize_if_needed(data: bytes, mime_type: str) -> bytes:
    """
    Resize the image if its longest side exceeds MAX_IMAGE_DIMENSION.

    This reduces API costs and latency without significant quality loss
    for document classification tasks.
    """
    max_dim = config.MAX_IMAGE_DIMENSION

    try:
        img = Image.open(io.BytesIO(data))
        w, h = img.size

        if max(w, h) <= max_dim:
            return data

        # Calculate new dimensions preserving aspect ratio
        if w >= h:
            new_w = max_dim
            new_h = int(h * (max_dim / w))
        else:
            new_h = max_dim
            new_w = int(w * (max_dim / h))

        img = img.resize((new_w, new_h), Image.LANCZOS)

        buf = io.BytesIO()
        fmt = "JPEG" if mime_type == "image/jpeg" else "PNG"
        img.save(buf, format=fmt, quality=95)
        result = buf.getvalue()

        logger.info("Image resized: (%d,%d) -> (%d,%d)", w, h, new_w, new_h)
        return result
    except Exception as exc:
        logger.warning("Resize failed, using original: %s", exc)
        return data
