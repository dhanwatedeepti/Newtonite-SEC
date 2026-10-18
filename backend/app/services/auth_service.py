import hmac
import hashlib
import json
import base64
import time
from typing import Optional, Tuple
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from app.config import settings

ph = PasswordHasher(
    time_cost=2,
    memory_cost=19456,
    parallelism=1,
    hash_len=32,
    salt_len=16
)


class AuthService:
    @staticmethod
    def hash_password(password: str) -> str:
        return ph.hash(password)

    @staticmethod
    def verify_password(hashed_password: str, password: str) -> bool:
        try:
            return ph.verify(hashed_password, password)
        except (VerifyMismatchError, Exception):
            return False

    @staticmethod
    def create_session_token(user_id: str, max_age_seconds: int = 86400 * 7) -> str:
        """Create a signed session token: base64(payload).signature"""
        payload = {
            "sub": user_id,
            "exp": int(time.time()) + max_age_seconds,
            "iat": int(time.time()),
        }
        raw_json = json.dumps(payload, separators=(',', ':')).encode('utf-8')
        b64_payload = base64.urlsafe_b64encode(raw_json).decode('utf-8').rstrip('=')
        
        sig = hmac.new(
            settings.SECRET_KEY.encode('utf-8'),
            b64_payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        return f"{b64_payload}.{sig}"

    @staticmethod
    def verify_session_token(token: str) -> Optional[str]:
        """Verify session token and return user_id if valid and not expired"""
        try:
            if not token or "." not in token:
                return None
            b64_payload, sig = token.split(".", 1)
            expected_sig = hmac.new(
                settings.SECRET_KEY.encode('utf-8'),
                b64_payload.encode('utf-8'),
                hashlib.sha256
            ).hexdigest()
            
            if not hmac.compare_digest(sig, expected_sig):
                return None
            
            # Pad base64 if needed
            padding = len(b64_payload) % 4
            if padding:
                b64_payload += "=" * (4 - padding)
                
            raw_json = base64.urlsafe_b64decode(b64_payload.encode('utf-8'))
            payload = json.loads(raw_json.decode('utf-8'))
            
            if payload.get("exp", 0) < int(time.time()):
                return None
                
            return payload.get("sub")
        except Exception:
            return None

    @staticmethod
    def generate_csrf_token(user_id: str) -> str:
        """Generate a CSRF token bound to the user_id and secret"""
        msg = f"{user_id}:{settings.CSRF_SECRET}".encode('utf-8')
        return hmac.new(settings.SECRET_KEY.encode('utf-8'), msg, hashlib.sha256).hexdigest()

    @staticmethod
    def verify_csrf_token(user_id: str, csrf_token: str) -> bool:
        if not csrf_token:
            return False
        expected = AuthService.generate_csrf_token(user_id)
        return hmac.compare_digest(csrf_token, expected)
