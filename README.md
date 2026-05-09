# Fortum-HacknBiz-2026

## AI ID Document Detector Agent (Local)

A production-ready Python agent that detects identification documents in images and PDFs using a **local CLIP model**. Returns structured JSON with confidence scoring, document type classification, and fraud risk flags.

**All inference runs on your machine — no cloud APIs, no API keys, no data leaves the device.**

### Features

- **100% Local** — CLIP model runs on-device (CPU or GPU), zero network calls during inference
- **Multi-format support** — JPEG, PNG, and PDF input
- **Structured JSON output** — Pydantic-validated response schema
- **Security-first design** — no data exfiltration, magic-byte validation, EXIF stripping, size limits
- **Easy integration** — clean Python API for FastAPI, Django, CLI, or any Python app
- **Batch processing** — analyze multiple files in one call
- **Configurable** — model, threshold, file limits via environment variables

---

## Quick Start

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

> **Note:** On first run, the CLIP model (~600MB) is downloaded and cached locally by HuggingFace. Subsequent runs are instant.

### 2. Run

```bash
# Single file
python example_usage.py photo.jpg

# Multiple files (batch)
python example_usage.py doc1.jpg doc2.png scan.pdf
```

No API keys needed.

---

## Output Schema

```json
{
  "is_id_document": true,
  "confidence_score": 0.87,
  "document_type": "national_id",
  "reasoning": "CLIP zero-shot classification: ID confidence=0.870 (threshold=0.55). Top matching prompts: ...",
  "risk_flags": []
}
```

| Field | Type | Description |
|---|---|---|
| `is_id_document` | `bool` | Whether the image contains an ID document |
| `confidence_score` | `float` | 0.0 (not an ID) → 1.0 (definitely an ID) |
| `document_type` | `enum` | `passport`, `national_id`, `driver_license`, `residence_permit`, `voter_id`, `military_id`, `student_id`, `health_card`, `other_id`, `not_an_id` |
| `reasoning` | `str` | CLIP prompt similarity scores and analysis |
| `risk_flags` | `list[str]` | Quality/fraud indicators: `blurry_image`, `possible_screenshot`, `low_resolution`, `partial_document` |

---

## Python Integration

```python
from id_detector import IDDetectorAgent

agent = IDDetectorAgent()  # no API key needed

# From file path
result = agent.detect("path/to/image.jpg")

# From raw bytes (e.g., uploaded file)
result = agent.detect(file_bytes)

# Access fields
print(result.confidence_score)   # 0.87
print(result.document_type)      # "national_id"
print(result.to_json())          # formatted JSON string
print(result.to_dict())          # Python dict
```

### FastAPI

```python
from fastapi import FastAPI, UploadFile, HTTPException
from id_detector import IDDetectorAgent, IDDetectorError

app = FastAPI()
agent = IDDetectorAgent()  # loaded once at startup

@app.post("/api/v1/verify-id")
async def verify_id(file: UploadFile):
    contents = await file.read()
    try:
        result = agent.detect(contents)
        return result.to_dict()
    except IDDetectorError as exc:
        raise HTTPException(status_code=400, detail=exc.to_dict())
```

### Django

```python
from django.http import JsonResponse
from id_detector import IDDetectorAgent, IDDetectorError

agent = IDDetectorAgent()  # loaded once at module level

def verify_id(request):
    uploaded = request.FILES.get("document")
    result = agent.detect(uploaded.read())
    return JsonResponse(result.to_dict())
```

---

## Configuration

All settings via environment variables (or `.env` file):

| Variable | Default | Description |
|---|---|---|
| `ID_DETECTOR_CLIP_MODEL` | `openai/clip-vit-base-patch32` | HuggingFace CLIP model name |
| `ID_DETECTOR_THRESHOLD` | `0.55` | Confidence threshold to classify as ID |
| `ID_DETECTOR_MAX_FILE_SIZE_MB` | `10` | Maximum input file size |
| `ID_DETECTOR_MAX_IMAGE_DIM` | `1024` | Max image dimension (px) for preprocessing |
| `ID_DETECTOR_LOG_LEVEL` | `INFO` | Logging verbosity |

---

## Security

| Concern | Mitigation |
|---|---|
| **Data exfiltration** | Model runs 100% locally — no network calls during inference |
| **PII leakage** | Agent never extracts personal data — classification only. EXIF metadata stripped. |
| **Malicious uploads** | Magic-byte validation prevents extension spoofing. Size limits enforced. |
| **Data retention** | All processing is in-memory. No files saved to disk by the agent. |

---

## Project Structure

```
├── id_detector/
│   ├── __init__.py          # Package exports
│   ├── agent.py             # Core IDDetectorAgent (CLIP-based)
│   ├── config.py            # Env-var configuration
│   ├── exceptions.py        # Custom exception hierarchy
│   ├── preprocessor.py      # Image/PDF preprocessing
│   ├── schemas.py           # Pydantic output models
│   └── validator.py         # Input validation & security
├── example_usage.py         # CLI + integration examples
├── requirements.txt         # Python dependencies
└── README.md
```

---

## Error Handling

All agent errors inherit from `IDDetectorError` and provide `.to_dict()` for JSON serialization:

```python
from id_detector import IDDetectorAgent, IDDetectorError, FileTooLargeError

try:
    result = agent.detect("huge_file.jpg")
except FileTooLargeError as exc:
    print(exc.to_dict())
    # {"error": "FileTooLargeError", "message": "File size exceeds ...", "detail": "..."}
except IDDetectorError as exc:
    print(exc.to_dict())  # catch-all for any agent error
```