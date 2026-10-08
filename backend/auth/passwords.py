from __future__ import annotations

import base64
import hashlib
import hmac
import secrets

N, R, P = 2**15, 8, 1  # ~32 MiB and ~100 ms per hash
DKLEN = 32
MAXMEM = 2**26  # 64 MiB ceiling for hashlib

_dummy_hash: str | None = None


def _b64(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def _unb64(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def _derive(password: str, salt: bytes, n: int, r: int, p: int) -> bytes:
    return hashlib.scrypt(password.encode(), salt=salt, n=n, r=r, p=p, maxmem=MAXMEM, dklen=DKLEN)


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    return f"scrypt${N}${R}${P}${_b64(salt)}${_b64(_derive(password, salt, N, R, P))}"


def verify_password(password: str, stored: str) -> bool:
    try:
        scheme, n, r, p, salt, expected = stored.split("$")
        if scheme != "scrypt":
            return False
        actual = _derive(password, _unb64(salt), int(n), int(r), int(p))
    except (ValueError, TypeError):  # malformed hash or absurd parameters: treat as a failed login
        return False
    return hmac.compare_digest(actual, _unb64(expected))  # constant-time comparison


def verify_dummy(password: str) -> None:
    """Spend the same time as a real check, so an unknown username can't be told apart by response time."""
    global _dummy_hash
    if _dummy_hash is None:
        _dummy_hash = hash_password("not-a-real-password")
    verify_password(password, _dummy_hash)
