from typing import List
from fastapi import Depends, HTTPException, status
from app.utils.security import get_current_user
from app.services.rbac import RBACService
from app.models.user import User
from functools import wraps

async def check_permission(permission: str, user: User = Depends(get_current_user)):
    has_permission = await RBACService.check_permission(user.id, permission)
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return user

def require_permission(permission: str):
    async def permission_dependency(user: User = Depends(get_current_user)):
        return await check_permission(permission, user)
    return permission_dependency

def require_role(role: str):
    async def role_dependency(user: User = Depends(get_current_user)):
        user_role = await RBACService.get_user_role(user.id)
        if user_role != role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{role}' required"
            )
        return user
    return role_dependency