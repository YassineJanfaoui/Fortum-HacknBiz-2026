"""Pydantic schemas for IP & Device Intelligence."""
from pydantic import BaseModel, Field

class DeviceFingerprint(BaseModel):
    """Data collected from the user's browser frontend."""
    user_agent: str = Field(default="", description="Browser User-Agent string")
    timezone: str = Field(default="", description="Browser timezone (e.g., 'Europe/Paris')")
    language: str = Field(default="", description="Browser primary language (e.g., 'en-US')")

class IPIntelligenceResult(BaseModel):
    """The output of the intelligence agent."""
    ip_address: str = Field(description="The analyzed IP address")
    ip_country_iso: str | None = Field(description="ISO 3166-1 alpha-2 country code of the IP")
    ip_country_name: str | None = Field(description="Full name of the country")
    
    is_sanctioned: bool = Field(description="True if the IP originates from a comprehensively sanctioned country.")
    location_mismatch: bool = Field(description="True if the IP country doesn't match the claimed country.")
    bot_or_vpn_probability: float = Field(ge=0.0, le=1.0, description="Heuristic probability of VPN/Bot usage based on timezone/device mismatches.")
    
    risk_score: float = Field(ge=0.0, le=1.0, description="Overall risk score. 1.0 = highly dangerous/fraudulent.")
    reasoning: list[str] = Field(default_factory=list, description="List of flags triggered during analysis.")
    
    def to_dict(self) -> dict:
        return self.model_dump(mode="json")
