import os

from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from dotenv import load_dotenv

from app.database import supabase
from app.models import LoginRequest, AdminLoginRequest, TokenResponse
from app.utils.auth import create_access_token, verify_token

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env"))

router = APIRouter()
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/auth/login  (student / user login)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/auth/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    """Authenticate a student with email + password and return a JWT token."""
    try:
        # Look up user by email
        resp = (
            supabase.table("users")
            .select("*")
            .eq("email", body.email)
            .single()
            .execute()
        )
        user = resp.data
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")

        # Verify password
        if not pwd_context.verify(body.password, user.get("password_hash", "")):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")

        # Check account status
        if user.get("status") != "active":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account is not active. Please contact support.",
            )

        # Build token payload
        token_data = {
            "sub": user["id"],
            "email": user["email"],
            "role": user.get("role", "student"),
            "full_name": user.get("full_name"),
            "subscription_type": user.get("subscription_type"),
        }
        token = create_access_token(token_data)

        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user["id"],
                "full_name": user["full_name"],
                "email": user["email"],
                "role": user.get("role"),
                "subscription_type": user.get("subscription_type"),
                "status": user.get("status"),
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}",
        )


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/auth/admin-login
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/auth/admin-login", response_model=TokenResponse)
async def admin_login(body: AdminLoginRequest):
    """Authenticate admin using hardcoded .env credentials."""
    if body.email != ADMIN_EMAIL or body.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin credentials.")

    token_data = {
        "sub": "admin",
        "email": ADMIN_EMAIL,
        "role": "admin",
        "full_name": "SkillOrbit Admin",
    }
    token = create_access_token(token_data)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": "admin",
            "full_name": "SkillOrbit Admin",
            "email": ADMIN_EMAIL,
            "role": "admin",
            "subscription_type": None,
            "status": "active",
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/auth/me
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/auth/me")
async def get_me(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Return the current user info decoded from their JWT token."""
    token = credentials.credentials
    payload = verify_token(token)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token.")

    return {
        "id": payload.get("sub"),
        "email": payload.get("email"),
        "role": payload.get("role"),
        "full_name": payload.get("full_name"),
        "subscription_type": payload.get("subscription_type"),
    }
