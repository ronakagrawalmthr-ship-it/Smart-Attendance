import os
import pytest
from datetime import timedelta
from security import (
    get_password_hash,
    verify_password,
    create_access_token,
    decode_access_token,
    get_secret_key,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

def test_password_hashing_and_verification():
    raw_pass = "StrongP@ssw0rd2026!"
    hashed = get_password_hash(raw_pass)
    
    assert hashed != raw_pass
    assert verify_password(raw_pass, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False

def test_create_and_decode_access_token():
    payload = {"sub": "faculty@institution.edu", "role": "teacher", "id": 42}
    token = create_access_token(data=payload, expires_delta=timedelta(minutes=30))
    
    assert isinstance(token, str)
    assert len(token) > 20
    
    decoded = decode_access_token(token)
    assert decoded["sub"] == "faculty@institution.edu"
    assert decoded["role"] == "teacher"
    assert decoded["id"] == 42
    assert "exp" in decoded

def test_expired_access_token():
    payload = {"sub": "student@institution.edu", "role": "student"}
    # Token expired 10 minutes ago
    expired_token = create_access_token(data=payload, expires_delta=timedelta(minutes=-10))
    
    decoded = decode_access_token(expired_token)
    assert decoded is None

def test_secret_key_rejection_of_weak_defaults(monkeypatch):
    weak_keys = [
        "short",
        "a_very_secret_key_for_development",
        "super_secret_enterprise_jwt_key_2026",
        "secret",
        "changeme"
    ]
    for weak in weak_keys:
        monkeypatch.setenv("SECRET_KEY", weak)
        key = get_secret_key()
        # Ensure it didn't keep the weak key and instead generated a secure fallback >= 32 chars
        assert key != weak
        assert len(key) >= 32

def test_secret_key_acceptance_of_strong_key(monkeypatch):
    strong = "e87f6b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7"
    monkeypatch.setenv("SECRET_KEY", strong)
    key = get_secret_key()
    assert key == strong


def test_biometric_vector_encryption_and_decryption():
    from security import encrypt_biometric_vector, decrypt_biometric_vector
    raw_vector_json = "[0.12345, -0.6789, 0.4567, 0.8912]"
    
    # Encrypt
    encrypted = encrypt_biometric_vector(raw_vector_json)
    assert encrypted is not None
    assert encrypted.startswith("enc:")
    assert encrypted != raw_vector_json
    
    # Decrypt
    decrypted = decrypt_biometric_vector(encrypted)
    assert decrypted == raw_vector_json

def test_biometric_vector_legacy_unencrypted_compatibility():
    from security import decrypt_biometric_vector
    raw_legacy = "[0.5, 0.2, 0.1]"
    # Should safely return legacy plaintext without error
    assert decrypt_biometric_vector(raw_legacy) == raw_legacy
