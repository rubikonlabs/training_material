from fastapi import HTTPException, status
from typing import Optional
from app.models.user import User, UserCreate
from app.db.database import get_db, get_user_by_username, get_user_by_email, create_user
from app.utils.security import verify_password, get_password_hash

class AuthService:
    @staticmethod
    async def register(user_data: UserCreate) -> User:
        # Check if username exists
        if get_user_by_username(user_data.username):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered"
            )
        
        # Check if email exists
        if get_user_by_email(user_data.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Hash password
        hashed_password = get_password_hash(user_data.password)
        
        # Create user
        user_id = create_user(
            username=user_data.username,
            email=user_data.email,
            hashed_password=hashed_password
        )
        
        return User(
            id=user_id,
            username=user_data.username,
            email=user_data.email,
            role_id=2  # Default role_id for new users
        )

    @staticmethod
    async def authenticate(username: str, password: str) -> Optional[User]:
        """
        Authenticate user and return User object if successful.
        """
        with get_db() as db:
            cursor = db.execute("""
                SELECT u.id, u.username, u.email, u.hashed_password, u.role_id, u.is_active
                FROM users u
                WHERE u.username = ?
            """, (username,))
            user = cursor.fetchone()

            if not user:
                return None
            
            if not verify_password(password, user["hashed_password"]):
                return None
            
            return User(
                id=user["id"],
                username=user["username"],
                email=user["email"],
                role_id=user["role_id"],
                is_active=user["is_active"]
            )

    @staticmethod
    async def is_admin(user_id: int) -> bool:
        with get_db() as db:
            cursor = db.execute("""
                SELECT r.name as role_name 
                FROM users u 
                JOIN roles r ON u.role_id = r.id 
                WHERE u.id = ?
            """, (user_id,))
            result = cursor.fetchone()
            
            return result and result['role_name'] == 'admin'