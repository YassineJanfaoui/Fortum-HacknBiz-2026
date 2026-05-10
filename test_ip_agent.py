"""Test script for the IP Intelligence Agent."""
import json
from ip_intelligence import IPIntelligenceAgent, DeviceFingerprint

agent = IPIntelligenceAgent()

print("=== IP Intelligence Tests ===\n")

# Test 1: Normal IP (Google DNS - US)
print("--- Test 1: Normal IP (8.8.8.8) ---")
res1 = agent.analyze("8.8.8.8", claimed_country_iso="US")
print(json.dumps(res1.to_dict(), indent=2))

# Test 2: Sanctioned IP (North Korea - KPTC)
# 175.45.176.0/22 is assigned to DPRK
print("\n--- Test 2: Sanctioned IP (North Korea) ---")
res2 = agent.analyze("175.45.176.10")
print(json.dumps(res2.to_dict(), indent=2))

# Test 3: Mismatch and Bot
print("\n--- Test 3: Mismatch and Bot ---")
bad_fingerprint = DeviceFingerprint(user_agent="python-requests/2.28.1")
# French IP, claims to be in Japan
res3 = agent.analyze("80.214.0.0", claimed_country_iso="JP", fingerprint=bad_fingerprint)
print(json.dumps(res3.to_dict(), indent=2))
