"""Quick test for secure ID storage."""
import os
import shutil
from pathlib import Path

from id_detector.storage import SecureStorage, StorageError
from id_detector.config import ENCRYPTION_KEY, STORAGE_DIR

print("=== Secure Storage Test ===\n")

if not ENCRYPTION_KEY:
    print("FAIL: ENCRYPTION_KEY is not set in environment or config.")
    exit(1)

# Ensure the storage directory doesn't exist to test creation
test_dir = Path("test_secure_storage")
if test_dir.exists():
    shutil.rmtree(test_dir)

try:
    storage = SecureStorage(storage_dir=test_dir)
    print("1. Initialization... PASS")
    
    # Check directory permissions
    assert test_dir.exists()
    print("2. Directory created... PASS")

    # Dummy image data
    dummy_data = b"\xff\xd8\xffThis is fake jpeg data that we will encrypt."
    
    # Test encryption
    enc_path = storage.encrypt_and_save(dummy_data, "test_id")
    print(f"3. Encryption successful... PASS (Saved to {enc_path.name})")
    
    assert enc_path.exists()
    raw_enc_data = enc_path.read_bytes()
    assert raw_enc_data != dummy_data # Data should be different
    print("4. Data is encrypted on disk... PASS")

    # Test decryption
    decrypted_data = storage.load_and_decrypt(enc_path)
    assert decrypted_data == dummy_data
    print("5. Decryption successful and data matches... PASS")

except Exception as e:
    print(f"\nFAIL: Exception occurred: {type(e).__name__}: {e}")
    exit(1)
finally:
    # Cleanup
    if test_dir.exists():
        shutil.rmtree(test_dir)

print("\n=== All 5 tests passed ===")
