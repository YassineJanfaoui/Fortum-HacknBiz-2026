"""
Custom exceptions for the ID Detector Agent.

Provides a clean exception hierarchy that allows consuming applications
to catch errors at the appropriate granularity level.
"""


class IDDetectorError(Exception):
    """Base exception for all ID Detector errors."""

    def __init__(self, message: str, detail: str | None = None):
        self.message = message
        self.detail = detail
        super().__init__(self.message)

    def to_dict(self) -> dict:
        """Serialize exception to a dict for JSON error responses."""
        result = {"error": self.__class__.__name__, "message": self.message}
        if self.detail:
            result["detail"] = self.detail
        return result


class InvalidFileError(IDDetectorError):
    """Raised when the input file fails validation (corrupted, empty, etc.)."""
    pass


class FileTooLargeError(IDDetectorError):
    """Raised when the input file exceeds the maximum allowed size."""

    def __init__(self, file_size_bytes: int, max_size_bytes: int):
        self.file_size_bytes = file_size_bytes
        self.max_size_bytes = max_size_bytes
        super().__init__(
            message=f"File size ({file_size_bytes:,} bytes) exceeds maximum allowed size ({max_size_bytes:,} bytes).",
            detail=f"max_allowed={max_size_bytes}, received={file_size_bytes}",
        )


class UnsupportedFormatError(IDDetectorError):
    """Raised when the file type is not in the allowed formats."""

    def __init__(self, detected_type: str, allowed_types: list[str]):
        self.detected_type = detected_type
        self.allowed_types = allowed_types
        super().__init__(
            message=f"Unsupported file format: '{detected_type}'. Allowed: {allowed_types}.",
            detail=f"detected={detected_type}",
        )


class DetectionError(IDDetectorError):
    """Raised when the AI model or API call fails during detection."""
    pass
