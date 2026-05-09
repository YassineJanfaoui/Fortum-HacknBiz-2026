#!/usr/bin/env python3
"""
Example: How to use the ID Detector Agent.

Run:
    python example_usage.py path/to/image.jpg

No API key needed — the model runs entirely on your local machine.
On first run, the CLIP model (~600MB) will be downloaded and cached.
"""

from __future__ import annotations

import json
import logging
import sys

from id_detector import IDDetectorAgent, IDDetectorError

# Configure logging to see what the agent is doing
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
)


def main() -> None:
    """CLI entry point: analyze a single file."""
    if len(sys.argv) < 2:
        print("Usage: python example_usage.py <image_path> [image_path2 ...]")
        print("  Supported formats: JPEG, PNG, PDF")
        print("  No API key needed — runs locally with CLIP.")
        sys.exit(1)

    try:
        agent = IDDetectorAgent()
    except IDDetectorError as exc:
        print(f"Initialization failed: {exc.message}")
        if exc.detail:
            print(f"   {exc.detail}")
        sys.exit(1)

    file_paths = sys.argv[1:]

    if len(file_paths) == 1:
        # --- Single file ---
        try:
            result = agent.detect(file_paths[0])
            print(result.to_json())
        except IDDetectorError as exc:
            error_output = json.dumps(exc.to_dict(), indent=2)
            print(error_output, file=sys.stderr)
            sys.exit(1)
    else:
        # --- Batch mode ---
        results = agent.detect_batch(file_paths)
        output = [r.to_dict() for r in results]
        print(json.dumps(output, indent=2))


# ---------------------------------------------------------------------------
# Programmatic integration examples
# ---------------------------------------------------------------------------

def example_python_integration():
    """Shows how to import and use the agent in your own Python code."""
    from id_detector import IDDetectorAgent, IDDetectionResult

    # Initialize — no API key needed, runs locally
    agent = IDDetectorAgent()

    # Detect from file path
    result: IDDetectionResult = agent.detect("document.jpg")

    # Access structured fields
    if result.is_id_document and result.confidence_score > 0.8:
        print(f"High-confidence ID detected: {result.document_type}")
        print(f"Risk flags: {result.risk_flags}")

    # Get JSON for API responses
    json_str: str = result.to_json()
    json_dict: dict = result.to_dict()

    return json_dict


def example_fastapi_integration():
    """Shows how you might use this in a FastAPI endpoint."""
    """
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
    """
    pass


def example_django_integration():
    """Shows how you might use this in a Django view."""
    """
    from django.http import JsonResponse
    from django.views.decorators.http import require_POST
    from id_detector import IDDetectorAgent, IDDetectorError

    agent = IDDetectorAgent()  # loaded once at module level

    @require_POST
    def verify_id(request):
        uploaded = request.FILES.get("document")
        if not uploaded:
            return JsonResponse({"error": "No file uploaded"}, status=400)

        try:
            result = agent.detect(uploaded.read())
            return JsonResponse(result.to_dict())
        except IDDetectorError as exc:
            return JsonResponse(exc.to_dict(), status=400)
    """
    pass


if __name__ == "__main__":
    main()
