"""
Pydantic schemas for the ID Detector Agent.

These models define the structured output contract — the return type
for all consumers of the agent.
"""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field


class DocumentType(str, Enum):
    """Known ID document types the agent can detect."""
    PASSPORT = "passport"
    NATIONAL_ID = "national_id"
    DRIVER_LICENSE = "driver_license"
    RESIDENCE_PERMIT = "residence_permit"
    VOTER_ID = "voter_id"
    MILITARY_ID = "military_id"
    STUDENT_ID = "student_id"
    HEALTH_CARD = "health_card"
    OTHER_ID = "other_id"
    NOT_AN_ID = "not_an_id"


class IDDetectionResult(BaseModel):
    """
    Structured result from the ID detection agent.

    Contains three levels of analysis:
    1. ID classification — is this an ID document?
    2. Document type — what kind of ID?
    3. Authenticity — is this a real photo or AI-generated?
    """

    # --- ID Classification ---
    is_id_document: bool = Field(
        description="Whether the image contains an identification document."
    )
    confidence_score: float = Field(
        ge=0.0,
        le=1.0,
        description="Confidence score between 0.0 (not an ID) and 1.0 (definitely an ID).",
    )
    document_type: DocumentType = Field(
        description="The detected type of identification document, or 'not_an_id'."
    )

    # --- Authenticity (AI-generated detection) ---
    is_authentic: bool = Field(
        description=(
            "Whether the image appears to be a real photograph (True) "
            "or AI-generated / digitally fabricated (False)."
        )
    )
    authenticity_score: float = Field(
        ge=0.0,
        le=1.0,
        description=(
            "Authenticity confidence: 1.0 = certainly a real photo, "
            "0.0 = certainly AI-generated or digitally fabricated."
        ),
    )

    # --- Analysis ---
    reasoning: str = Field(
        description=(
            "Brief explanation of the classification and authenticity assessment. "
            "Cites visual cues and CLIP prompt similarities."
        )
    )
    risk_flags: list[str] = Field(
        default_factory=list,
        description=(
            "List of potential fraud or quality indicators. Examples: "
            "'blurry_image', 'possible_screenshot', 'low_resolution', "
            "'partial_document', 'ai_generated', 'possible_deepfake'."
        ),
    )

    def to_json(self, **kwargs) -> str:
        """Serialize to JSON string."""
        return self.model_dump_json(indent=2, **kwargs)

    def to_dict(self) -> dict:
        """Serialize to plain dict (JSON-safe)."""
        return self.model_dump(mode="json")
