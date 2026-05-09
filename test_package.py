"""Quick validation test for the id_detector package."""
from id_detector.validator import validate_file
from id_detector.exceptions import InvalidFileError, UnsupportedFormatError, FileTooLargeError
from id_detector.schemas import IDDetectionResult, DocumentType
import json

print("=== ID Detector Package Validation ===\n")

# Test 1: Empty file rejection
print("1. Empty file rejection...", end=" ")
try:
    validate_file(b"")
    print("FAIL (should have raised)")
except InvalidFileError:
    print("PASS")

# Test 2: Bad magic bytes rejection
print("2. Bad magic bytes rejection...", end=" ")
try:
    validate_file(b"this is not an image file at all")
    print("FAIL (should have raised)")
except UnsupportedFormatError:
    print("PASS")

# Test 3: File too large rejection
print("3. File too large rejection...", end=" ")
try:
    # Create fake JPEG header + big payload
    fake_jpeg = b"\xff\xd8\xff" + b"\x00" * (11 * 1024 * 1024)
    validate_file(fake_jpeg)
    print("FAIL (should have raised)")
except FileTooLargeError:
    print("PASS")

# Test 4: Valid JPEG magic bytes accepted
print("4. Valid JPEG magic bytes...", end=" ")
fake_jpeg = b"\xff\xd8\xff\xe0" + b"\x00" * 100
data, mime = validate_file(fake_jpeg)
assert mime == "image/jpeg"
print(f"PASS (mime={mime})")

# Test 5: Valid PNG magic bytes accepted
print("5. Valid PNG magic bytes...", end=" ")
fake_png = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
data, mime = validate_file(fake_png)
assert mime == "image/png"
print(f"PASS (mime={mime})")

# Test 6: Valid PDF magic bytes accepted
print("6. Valid PDF magic bytes...", end=" ")
fake_pdf = b"%PDF-1.4" + b"\x00" * 100
data, mime = validate_file(fake_pdf)
assert mime == "application/pdf"
print(f"PASS (mime={mime})")

# Test 7: Schema serialization
print("7. Schema JSON serialization...", end=" ")
result = IDDetectionResult(
    is_id_document=True,
    confidence_score=0.92,
    document_type=DocumentType.NATIONAL_ID,
    reasoning="Test result",
    risk_flags=["test_flag"],
)
d = result.to_dict()
j = result.to_json()
assert d["confidence_score"] == 0.92
assert d["document_type"] == "national_id"
parsed = json.loads(j)
assert parsed["is_id_document"] is True
print("PASS")

# Test 8: DocumentType enum values
print("8. DocumentType enum coverage...", end=" ")
types = [dt.value for dt in DocumentType]
assert "passport" in types
assert "national_id" in types
assert "not_an_id" in types
print(f"PASS ({len(types)} types)")

print(f"\n=== All 8 tests passed ===")
