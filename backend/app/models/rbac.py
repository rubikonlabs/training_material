from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class Role(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    created_at: datetime

class Permission(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    created_at: datetime

class RoleCreate(BaseModel):
    name: str
    description: Optional[str] = None

class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class RoleWithPermissions(Role):
    permissions: List[Permission]

class UserRole(BaseModel):
    user_id: int
    role_id: int