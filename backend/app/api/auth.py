import os
from datetime import datetime, timedelta, timezone

from authlib.integrations.starlette_client import OAuth
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from jose import JWTError, jwt
from sqlalchemy.orm import Session as DBSession

from ..db import models
from ..db.database import get_db

load_dotenv()

router = APIRouter(prefix="/api/v1/auth")

# ── JWT Config ─────────────────────────────────────────────────────
SECRET_KEY = os.getenv("JWT_SECRET", "smart-agent-dev-secret-change-in-prod")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

# ── OAuth Config ───────────────────────────────────────────────────
oauth = OAuth()
oauth.register(
    name="google",
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


def create_access_token(data: dict) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(request: Request, db: DBSession = Depends(get_db)) -> models.User:
    """Extract user from the HttpOnly cookie. Use as a FastAPI dependency."""
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_email: str = payload.get("sub")
        if user_email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = db.query(models.User).filter(models.User.email == user_email).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ── Auth Routes ────────────────────────────────────────────────────

@router.get("/login")
async def login(request: Request):
    """Redirect user to Google's OAuth consent screen."""
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")
    if not redirect_uri:
        redirect_uri = str(request.url_for("auth_callback"))
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/callback", name="auth_callback")
async def auth_callback(request: Request, db: DBSession = Depends(get_db)):
    """Handle the OAuth callback from Google."""
    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception:
        raise HTTPException(status_code=400, detail="OAuth authentication failed")

    user_info = token.get("userinfo")
    if not user_info:
        raise HTTPException(status_code=400, detail="Could not retrieve user info")

    email = user_info.get("email")
    name = user_info.get("name", email)
    picture = user_info.get("picture", "")

    # Find or create user
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        user = models.User(email=email, name=name, picture=picture)
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Update profile info on each login
        user.name = name
        user.picture = picture
        db.commit()

    # Create JWT and set as HttpOnly cookie
    access_token = create_access_token(data={"sub": user.email})
    response = RedirectResponse(url=FRONTEND_URL)
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,  # Set True in production with HTTPS
        samesite="lax",
        max_age=ACCESS_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )
    return response


@router.get("/me")
async def get_me(current_user: models.User = Depends(get_current_user)):
    """Return the currently authenticated user's profile."""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "picture": current_user.picture,
    }


@router.post("/logout")
async def logout():
    """Clear the auth cookie."""
    response = Response(content='{"detail": "Logged out"}', media_type="application/json")
    response.delete_cookie("access_token")
    return response
