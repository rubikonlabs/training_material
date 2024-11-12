from pydantic import BaseModel, EmailStr
from typing import List, Optional

class UserBase(BaseModel):
    username: str
    email: EmailStr

class UserLogin(BaseModel):
    username: str
    password: str

class User(UserBase):
    id: int
    role_id: int
    is_active: bool = True
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    
class UserCreate(UserBase):
    password: str
    role_id: Optional[int] = 2  # Default to regular user role
    is_active: Optional[bool] = True

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    role_id: Optional[int] = None
    is_active: Optional[bool] = None


class UserList(BaseModel):
    users: List[User]
    total: int
    page: int
    page_size: int