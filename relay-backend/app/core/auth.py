import logging
import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from pydantic import BaseModel
from typing import Optional
from functools import lru_cache

from app.config import get_settings

logger = logging.getLogger(__name__)
security = HTTPBearer()

class AuthUser(BaseModel):
    id: str
    email: Optional[str] = None
    phone: Optional[str] = None
    role: str = "authenticated"

@lru_cache(maxsize=1)
def get_jwks(jwks_url: str) -> dict:
    """Fetch and cache Supabase JWKS (JSON Web Key Set)"""
    try:
        response = httpx.get(jwks_url, timeout=10.0)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logger.error(f"Failed to fetch JWKS: {e}")
        return {"keys": []}

def get_signing_key(token: str, jwks: dict) -> Optional[dict]:
    """Get the signing key from JWKS that matches the token's kid."""
    headers = jwt.get_unverified_header(token)
    kid = headers.get('kid')

    for key in jwks.get('keys', []):
        if key.get('kid') == kid:
            return key

    return None

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> AuthUser:
    """Verify Supabase JWT - tries JWKS first, falls back to JWT secret"""
    settings = get_settings()
    token = credentials.credentials

    try:
        # First, try to decode with JWT secret (HS256) - simpler approach
        try:
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=['HS256'],
                audience="authenticated"
            )
        except JWTError:
            # Fall back to JWKS (ES256) for newer Supabase projects
            jwks_url = f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json"
            jwks = get_jwks(jwks_url)
            signing_key = get_signing_key(token, jwks)

            if not signing_key:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail='Unable to find matching signing key'
                )

            payload = jwt.decode(
                token,
                signing_key,
                algorithms=['ES256'],
                audience="authenticated"
            )

        user_id = payload.get('sub')
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: no subject"
            )

        return AuthUser(
            id=user_id,
            email=payload.get('email'),
            phone=payload.get('phone'),
            role=payload.get('role', 'authenticated')
        )
    except JWTError as exp:
        logger.error(f"JWT verification failed: {exp}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(exp)}"
        )
    except httpx.HTTPError as exp:
        logger.error(f"HTTP error during token verification: {exp}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Unable to verify token: {exp}"
        )
