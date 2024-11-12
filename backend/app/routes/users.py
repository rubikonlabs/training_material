from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.models.user import User, UserList, UserCreate, UserUpdate
from app.dependencies.rbac import require_permission
from app.services.user import UserService

router = APIRouter(prefix="/users", tags=["users"])

@router.get("", response_model=UserList)
async def get_users(
    page: int = 1,
    page_size: int = 10,
    user: User = Depends(require_permission("view_users"))
):
    """Get paginated list of users"""
    users = await UserService.get_users(page, page_size)
    total = await UserService.get_total_users()
    return {
        "users": users,
        "total": total,
        "page": page,
        "page_size": page_size
    }

@router.post("", response_model=User)
async def create_user(
    user_data: UserCreate,
    current_user: User = Depends(require_permission("create_user"))
):
    """Create a new user"""
    return await UserService.create_user(user_data)


@router.put("/{user_id}", response_model=User)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    current_user: User = Depends(require_permission("update_user"))
):
    """Update user"""
    return await UserService.update_user(user_id, user_data)

@router.get("/search", response_model=UserList)
async def search_users(
    q: str,
    page: int = 1,
    page_size: int = 10,
    current_user: User = Depends(require_permission("view_users"))
):
    """Search users by username, email, or role"""
    users_data = await UserService.search_users(q, page, page_size)
    total = await UserService.get_search_total(q)
    
    # Convert the list of dictionaries to list of User models
    users = [User(**user) for user in users_data]
    
    return UserList(
        users=users,
        total=total,
        page=page,
        page_size=page_size
    )

@router.get("/{user_id}", response_model=User)
async def get_user(
    user_id: int,
    current_user: User = Depends(require_permission("view_users"))
):
    """Get user by ID"""
    user = await UserService.get_user(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user

@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    current_user: User = Depends(require_permission("delete_user"))
):
    """Delete user"""
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    await UserService.delete_user(user_id)
    return {"status": "success", "message": "User deleted"}
