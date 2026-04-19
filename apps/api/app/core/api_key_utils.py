"""API key and webhook secret generation. Keys shown once, only hashes stored."""
import hashlib
import secrets


API_KEY_PREFIX_LENGTH = 16
WEBHOOK_SECRET_PREFIX_LENGTH = 24


def _prefix_for_storage(raw_value: str, max_length: int) -> str:
    """Store only the leading prefix so PostgreSQL varchar limits are always respected."""
    return raw_value[:max_length]


def generate_api_key(version_number: int) -> dict:
    random_part = secrets.token_hex(16)
    raw_key = f"sk_erp_v{version_number}_{random_part}"
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    key_prefix = _prefix_for_storage(raw_key, API_KEY_PREFIX_LENGTH)
    return {"raw_key": raw_key, "key_hash": key_hash, "key_prefix": key_prefix}


def generate_webhook_secret() -> dict:
    random_part = secrets.token_hex(16)
    raw_secret = f"whsec_erp_{random_part}"
    secret_hash = hashlib.sha256(raw_secret.encode()).hexdigest()
    secret_prefix = _prefix_for_storage(raw_secret, WEBHOOK_SECRET_PREFIX_LENGTH)
    return {"raw_secret": raw_secret, "secret_hash": secret_hash, "secret_prefix": secret_prefix}


def verify_api_key(raw_key: str, stored_hash: str) -> bool:
    return hashlib.sha256(raw_key.encode()).hexdigest() == stored_hash
