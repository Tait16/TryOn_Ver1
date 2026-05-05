import bcrypt as bcrypt_lib
from passlib.context import CryptContext

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    return _pwd_context.hash(plain)


def verify_password(plain: str, password_hash: str) -> bool:
    stored = (password_hash or "").strip()
    if not stored:
        return False
    try:
        if _pwd_context.verify(plain, stored):
            return True
    except Exception:
        pass
    # Fallback: thư viện bcrypt (ổn định giữa phiên bản; passlib đôi khi lệch với bcrypt 4.x)
    if not stored.startswith("$2"):
        return False
    try:
        return bcrypt_lib.checkpw(plain.encode("utf-8"), stored.encode("utf-8"))
    except Exception:
        return False
