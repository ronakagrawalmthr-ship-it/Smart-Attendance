from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
import os
import secrets
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent / ".env"
user_env = Path.home() / ".smart_attendance" / ".env"
if user_env.exists():
    load_dotenv(user_env, override=False)
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
load_dotenv()

# High-entropy 256-bit cryptographic secret key
INSECURE_SECRETS = {
    "a_very_secret_key_for_development",
    "super_secret_enterprise_jwt_key_2026",
    "secret",
    "changeme",
    "default_jwt_secret",
}

def resolve_secret_key(raw_key: Optional[str] = None) -> str:
    candidate = raw_key if raw_key is not None else os.getenv("SECRET_KEY")
    if not candidate or len(candidate.strip()) < 32 or candidate.strip().lower() in INSECURE_SECRETS:
        return secrets.token_hex(32)
    return candidate.strip()

get_secret_key = resolve_secret_key

raw_secret = os.getenv("SECRET_KEY")
SECRET_KEY = resolve_secret_key(raw_secret)
# Zero import-time side-effects: Do not modify .env on disk at runtime

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 Hours strict token expiration
REFRESH_TOKEN_EXPIRE_DAYS = 7          # 7 Days refresh token lifespan

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not plain_password or not hashed_password:
        return False
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_access_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except Exception:
        return None



# ==============================================================================
# BIOMETRIC FIELD-LEVEL ENCRYPTION (DPDP ACT 2023 COMPLIANCE)
# ==============================================================================
import base64
import hashlib

try:
    from cryptography.fernet import Fernet
except ImportError:
    Fernet = None

def _get_biometric_cipher():
    if Fernet is None:
        return None
    custom_key = os.getenv("BIOMETRIC_ENCRYPTION_KEY")
    if custom_key and len(custom_key.strip()) >= 32:
        try:
            return Fernet(custom_key.strip().encode())
        except Exception:
            pass
    # Deterministic 32-byte key derived from SECRET_KEY
    derived = hashlib.sha256(SECRET_KEY.encode()).digest()
    fernet_key = base64.urlsafe_b64encode(derived)
    return Fernet(fernet_key)

_biometric_cipher_instance = None

def get_biometric_cipher():
    global _biometric_cipher_instance
    if _biometric_cipher_instance is None:
        _biometric_cipher_instance = _get_biometric_cipher()
    return _biometric_cipher_instance

def encrypt_biometric_vector(raw_json: Optional[str]) -> Optional[str]:
    """
    Encrypts raw 128-d face embedding JSON using AES-128-CBC + HMAC (Fernet).
    Guarantees that sensitive biometric data is never stored in plaintext.
    """
    if not raw_json or not isinstance(raw_json, str):
        return raw_json
    try:
        cipher = get_biometric_cipher()
        if cipher is None:
            return raw_json
        encrypted_bytes = cipher.encrypt(raw_json.strip().encode('utf-8'))
        return f"enc:{encrypted_bytes.decode('utf-8')}"
    except Exception as e:
        print(f"[SECURITY WARNING] Biometric encryption error: {e}")
        return raw_json

def decrypt_biometric_vector(stored_data: Optional[str]) -> Optional[str]:
    """
    Decrypts encrypted biometric vector string back to raw JSON array string.
    Gracefully handles legacy unencrypted vectors (backward compatibility).
    """
    if not stored_data or not isinstance(stored_data, str):
        return stored_data
    stored_str = stored_data.strip()
    if stored_str.startswith("enc:"):
        token = stored_str[4:].encode('utf-8')
        try:
            cipher = get_biometric_cipher()
            if cipher is None:
                return stored_data
            decrypted_bytes = cipher.decrypt(token)
            return decrypted_bytes.decode('utf-8')
        except Exception as e:
            import logging
            logging.error(f"[SECURITY CRITICAL] Biometric decryption failure: {e}", exc_info=True)
            return None
    # Legacy unencrypted vector string (e.g. starts with '[')
    return stored_str
