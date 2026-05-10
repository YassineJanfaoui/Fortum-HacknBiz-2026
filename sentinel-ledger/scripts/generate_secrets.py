"""Generate random secrets for .env — run once, copy output into .env."""
import secrets

print("Paste these into your .env file:\n")
print(f"PSEUDONYM_MASTER_SALT={secrets.token_hex(32)}")
print(f"AUDIT_HMAC_KEY={secrets.token_hex(32)}")
print("\nNote: PSEUDONYM_MASTER_SALT and AUDIT_HMAC_KEY MUST be different.")
