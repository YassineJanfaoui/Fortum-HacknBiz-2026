import logging
from pathlib import Path

import geoip2.database
from geoip2.errors import AddressNotFoundError

from . import config
from .schemas import DeviceFingerprint, IPIntelligenceResult

logger = logging.getLogger(__name__)

class IPIntelligenceAgent:
    """
    Offline IP and Device Intelligence Agent.
    
    Requires a MaxMind GeoLite2 (.mmdb) database file to run.
    """
    
    def __init__(self, db_path: str | Path | None = None):
        self._db_path = Path(db_path or config.GEOIP_DB_PATH).resolve()
        self._reader = None
        
        if self._db_path.exists():
            try:
                self._reader = geoip2.database.Reader(str(self._db_path))
                logger.info("Loaded GeoIP Database from %s", self._db_path)
            except Exception as e:
                logger.error("Failed to load GeoIP database: %s", e)
        else:
            logger.warning(
                "GeoIP database not found at %s. "
                "IP Location lookups will fail gracefully. "
                "Download GeoLite2-Country.mmdb from MaxMind to enable.",
                self._db_path
            )

    def analyze(
        self, 
        ip_address: str, 
        claimed_country_iso: str | None = None,
        fingerprint: DeviceFingerprint | None = None
    ) -> IPIntelligenceResult:
        """
        Analyze an IP address against claimed locations and device fingerprints.
        """
        reasoning = []
        risk_score = 0.0
        
        # 1. Geo-Location Lookup
        ip_country_iso = None
        ip_country_name = None
        is_sanctioned = False
        location_mismatch = False
        
        if self._reader:
            try:
                response = self._reader.country(ip_address)
                ip_country_iso = response.country.iso_code
                ip_country_name = response.country.name
                reasoning.append(f"IP mapped to {ip_country_name} ({ip_country_iso}).")
            except AddressNotFoundError:
                reasoning.append("IP address not found in local database.")
            except ValueError:
                reasoning.append("Invalid IP address format.")
        else:
            reasoning.append("GeoIP database missing; skipped location lookup.")

        # 2. Sanctions Check
        if ip_country_iso and ip_country_iso in config.SANCTIONED_COUNTRIES:
            is_sanctioned = True
            risk_score += 1.0
            reasoning.append(f"CRITICAL: IP originates from sanctioned country ({ip_country_iso}).")

        # 3. Location Mismatch Check
        if claimed_country_iso and ip_country_iso:
            if claimed_country_iso.upper() != ip_country_iso.upper():
                location_mismatch = True
                risk_score += 0.5
                reasoning.append(
                    f"Mismatch: User claims {claimed_country_iso}, but IP is in {ip_country_iso}."
                )

        # 4. VPN / Bot Heuristics (Using Device Fingerprint)
        bot_prob = 0.0
        if fingerprint:
            # Example heuristic: If user agent is missing or very short, it might be a script
            if not fingerprint.user_agent or len(fingerprint.user_agent) < 20:
                bot_prob += 0.4
                reasoning.append("Suspicious User-Agent (too short or missing).")
            
            # Example heuristic: Server/Bot user agents
            bot_keywords = ["python-requests", "curl", "headless", "bot", "crawler"]
            ua_lower = fingerprint.user_agent.lower()
            if any(kw in ua_lower for kw in bot_keywords):
                bot_prob += 0.8
                reasoning.append(f"Bot signature detected in User-Agent.")

            # In a real app, you would map `ip_country_iso` to expected timezones
            # and compare it to `fingerprint.timezone` to detect VPNs.
            # (Skipped here for brevity, but this is where it goes).

        risk_score = min(1.0, risk_score + (bot_prob * 0.5))

        if risk_score == 0.0:
            reasoning.append("No immediate risks detected.")

        return IPIntelligenceResult(
            ip_address=ip_address,
            ip_country_iso=ip_country_iso,
            ip_country_name=ip_country_name,
            is_sanctioned=is_sanctioned,
            location_mismatch=location_mismatch,
            bot_or_vpn_probability=min(1.0, bot_prob),
            risk_score=round(risk_score, 2),
            reasoning=reasoning
        )
