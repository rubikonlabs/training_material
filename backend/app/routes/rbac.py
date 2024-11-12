from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.models.rbac import Role, RoleCreate, RoleUpdate, Permission
from app.services.rbac import RBACService
from app.dependencies.rbac import require_permission, require_role
from app.models.user import User

router = APIRouter(prefix="/rbac", tags=["rbac"])

@router.get("/roles", response_model=List[Role])
async def get_roles(user: User = Depends(require_permission("view_roles"))):
    """Get all roles"""
    return await RBACService.get_all_roles()

@router.get("/roles/count")
async def get_roles_count(user: User = Depends(require_permission("view_roles"))):
    """Get total number of roles"""
    count = await RBACService.get_roles_count()
    return {"count": count}

@router.get("/users/count")
async def get_users_count(user: User = Depends(require_permission("view_users"))):
    """Get total number of users"""
    count = await RBACService.get_users_count()
    return {"count": count}

@router.post("/roles", response_model=Role)
async def create_role(
    role_data: RoleCreate,
    user: User = Depends(require_permission("manage_roles"))
):
    """Create new role"""
    return await RBACService.create_role(role_data)

@router.put("/roles/{role_id}", response_model=Role)
async def update_role(
    role_id: int,
    role_data: RoleUpdate,
    user: User = Depends(require_permission("manage_roles"))
):
    """Update existing role"""
    return await RBACService.update_role(role_id, role_data)

@router.post("/users/{user_id}/role")
async def assign_user_role(
    user_id: int,
    role_id: int,
    current_user: User = Depends(require_role("admin"))
):
    """Assign role to user"""
    return await RBACService.assign_role_to_user(user_id, role_id)

@router.get("/permissions", response_model=List[Permission])
async def get_permissions(user: User = Depends(require_permission("view_roles"))):
    """Get all permissions"""
    return await RBACService.get_all_permissions()

