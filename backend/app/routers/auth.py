from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from jose import jwt, JWTError
from passlib.context import CryptContext

from app.models import User
from app.config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRE_MINUTES

router = APIRouter(prefix="/api/auth", tags=["auth"])
pwd = CryptContext(schemes=["sha256_crypt"], deprecated="auto")
bearer = HTTPBearer(auto_error=False)


def make_token(user_id: int) -> str:
    exp = datetime.utcnow() + timedelta(minutes=JWT_EXPIRE_MINUTES)
    return jwt.encode({"sub": str(user_id), "exp": exp}, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def current_user(creds: HTTPAuthorizationCredentials = Depends(bearer)) -> User:
    if not creds:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        uid = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(401, "Invalid token")
    user = await User.get_or_none(id=uid)
    if not user:
        raise HTTPException(401, "User not found")
    return user


class LoginIn(BaseModel):
    email: str
    password: str


@router.post("/login")
async def login(data: LoginIn):
    user = await User.get_or_none(email=data.email.lower())
    if not user or not pwd.verify(data.password, user.hashed_password):
        raise HTTPException(401, "Invalid credentials")
    return {
        "token": make_token(user.id),
        "user": {"id": user.id, "name": user.name, "email": user.email, "year": user.year},
    }


@router.get("/me")
async def me(user: User = Depends(current_user)):
    return {"id": user.id, "name": user.name, "email": user.email, "year": user.year}
