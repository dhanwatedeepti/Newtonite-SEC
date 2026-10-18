from typing import List, Optional
from pydantic import BaseModel, EmailStr
from app.schemas.user import UserResponse


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthStateResponse(BaseModel):
    user: UserResponse
    csrf_token: str
