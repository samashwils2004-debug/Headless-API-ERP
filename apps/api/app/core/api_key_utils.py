"""API key and webhook secret generation. Keys shown once, only hashes stored."""
import hashlib
import secrets


def generate_api_key(version_number: int) -> dict:
    random_part = secrets.token_hex(16)
    raw_key = f"sk_erp_v{version_number}_{random_part}"
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    key_prefix = raw_key[:16] + "..."
    return {"raw_key": raw_key, "key_hash": key_hash, "key_prefix": key_prefix}


def generate_webhook_secret() -> dict:
    random_part = secrets.token_hex(16)
    raw_secret = f"whsec_erp_{random_part}"
    secret_hash = hashlib.sha256(raw_secret.encode()).hexdigest()
    secret_prefix = raw_secret[:16] + "..."
    return {"raw_secret": raw_secret, "secret_hash": secret_hash, "secret_prefix": secret_prefix}


def verify_api_key(raw_key: str, stored_hash: str) -> bool:
    return hashlib.sha256(raw_key.encode()).hexdigest() == stored_hash
