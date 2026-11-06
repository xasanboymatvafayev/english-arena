"""Generate Web Push VAPID keys for Railway/Render environment variables.

Usage:
    python -m app.scripts.generate_vapid_keys
"""

import base64
import secrets

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def main() -> None:
    while True:
        number = int.from_bytes(secrets.token_bytes(32), "big")
        try:
            private_key = ec.derive_private_key(number, ec.SECP256R1())
            break
        except ValueError:
            continue
    public_key = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint,
    )
    print("Web Push VAPID kalitlari:\n")
    print(f"VAPID_PUBLIC_KEY={b64url(public_key)}")
    print(f"VAPID_PRIVATE_KEY={b64url(number.to_bytes(32, 'big'))}")
    print("VAPID_SUBJECT=mailto:admin@example.com")
    print("\nBu qiymatlarni Railway/Render environment'ga qo'ying.")


if __name__ == "__main__":
    main()
