import os

# The path to the downloaded MaxMind GeoLite2-Country.mmdb file.
# Defaults to the root of the project.
GEOIP_DB_PATH = os.getenv("GEOIP_DB_PATH", "GeoLite2-Country.mmdb")

# A sample list of comprehensively sanctioned countries (ISO Codes).
# E.g., Iran, North Korea, Syria, Cuba, Russia, etc.
# In a real app, keep this updated with OFAC guidelines.
SANCTIONED_COUNTRIES = {"IR", "KP", "SY", "CU", "RU"}
