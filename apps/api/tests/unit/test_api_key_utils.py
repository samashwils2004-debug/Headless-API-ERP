from app.core.api_key_utils import (
    API_KEY_PREFIX_LENGTH,
    WEBHOOK_SECRET_PREFIX_LENGTH,
    generate_api_key,
    generate_webhook_secret,
)
from app.models import APIKey


def test_generated_api_key_prefix_fits_schema_limit():
    data = generate_api_key(version_number=7)

    assert data["raw_key"].startswith("sk_erp_v7_")
    assert data["raw_key"].startswith(data["key_prefix"])
    assert len(data["key_prefix"]) <= APIKey.__table__.c.key_prefix.type.length
    assert len(data["key_prefix"]) <= API_KEY_PREFIX_LENGTH


def test_generated_webhook_secret_prefix_fits_schema_limit():
    data = generate_webhook_secret()

    assert data["raw_secret"].startswith("whsec_erp_")
    assert data["raw_secret"].startswith(data["secret_prefix"])
    assert len(data["secret_prefix"]) <= APIKey.__table__.c.webhook_secret_prefix.type.length
    assert len(data["secret_prefix"]) <= WEBHOOK_SECRET_PREFIX_LENGTH
