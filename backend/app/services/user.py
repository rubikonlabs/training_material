from typing import List, Optional
from fastapi import HTTPException, status
from app.db.database import get_db
from app.models.user import UserCreate, UserUpdate, User
from app.utils.security import get_password_hash

class UserService:
    @staticmethod
    async def get_users(page: int = 1, page_size: int = 10) -> List[dict]:
        offset = (page - 1) * page_size
        with get_db() as db:
            cursor = db.execute("""
                SELECT 
                    u.id,
                    u.username,
                    u.email,
                    u.role_id,
                    u.is_active,
                    u.created_at,
                    r.name as role_name
                FROM users u
                LEFT JOIN roles r ON u.role_id = r.id
                ORDER BY u.id
                LIMIT ? OFFSET ?
            """, (page_size, offset))
            
            users = cursor.fetchall()
            # Convert SQLite Row objects to proper dictionaries
            return [
                {
                    "id": user["id"],
                    "username": user["username"],
                    "email": user["email"],
                    "role_id": user["role_id"],
                    "is_active": bool(user["is_active"]),  # Convert to boolean
                    "created_at": user["created_at"],
                    "role_name": user["role_name"]
                }
                for user in users
            ]
        
    @staticmethod
    async def create_user(user_data: UserCreate) -> User:
        with get_db() as db:
            # Check if username exists
            cursor = db.execute(
                "SELECT id FROM users WHERE username = ?",
                (user_data.username,)
            )
            if cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already registered"
                )
            
            # Check if email exists
            cursor = db.execute(
                "SELECT id FROM users WHERE email = ?",
                (user_data.email,)
            )
            if cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered"
                )
            
            # Create user
            cursor = db.execute("""
                INSERT INTO users (username, email, hashed_password, role_id, is_active)
                VALUES (?, ?, ?, ?, ?)
            """, (
                user_data.username,
                user_data.email,
                get_password_hash(user_data.password),
                user_data.role_id,
                user_data.is_active
            ))
            db.commit()
            
            return await UserService.get_user(cursor.lastrowid)
        
    @staticmethod
    async def update_user(user_id: int, user_data: UserUpdate) -> User:
        updates = []
        values = []
        
        if user_data.email is not None:
            updates.append("email = ?")
            values.append(user_data.email)
        
        if user_data.password is not None:
            updates.append("hashed_password = ?")
            values.append(get_password_hash(user_data.password))
        
        if user_data.role_id is not None:
            updates.append("role_id = ?")
            values.append(user_data.role_id)
        
        if user_data.is_active is not None:
            updates.append("is_active = ?")
            values.append(user_data.is_active)
        
        if not updates:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )

        with get_db() as db:
            # Check if user exists
            cursor = db.execute(
                "SELECT id FROM users WHERE id = ?",
                (user_id,)
            )
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            
            values.append(user_id)
            db.execute(
                f"UPDATE users SET {', '.join(updates)} WHERE id = ?",
                values
            )
            db.commit()
            
            return await UserService.get_user(user_id)
        
    @staticmethod
    async def delete_user(user_id: int):
        with get_db() as db:
            cursor = db.execute(
                "SELECT id FROM users WHERE id = ?",
                (user_id,)
            )
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            
            db.execute("DELETE FROM users WHERE id = ?", (user_id,))
            db.commit()

    @staticmethod
    async def get_user(user_id: int) -> Optional[dict]:
        with get_db() as db:
            cursor = db.execute("""
                SELECT 
                    u.id,
                    u.username,
                    u.email,
                    u.role_id,
                    u.is_active,
                    u.created_at,
                    r.name as role_name
                FROM users u
                LEFT JOIN roles r ON u.role_id = r.id
                WHERE u.id = ?
            """, (user_id,))
            
            user = cursor.fetchone()
            if not user:
                return None
                
            return {
                "id": user["id"],
                "username": user["username"],
                "email": user["email"],
                "role_id": user["role_id"],
                "is_active": bool(user["is_active"]),
                "created_at": user["created_at"],
                "role_name": user["role_name"]
            }
            
    @staticmethod
    async def get_total_users():
        with get_db() as db:
            cursor = db.execute("SELECT COUNT(*) as count FROM users")
            result = cursor.fetchone()
            return result["count"]

    @staticmethod
    async def search_users(query: str, page: int = 1, page_size: int = 10) -> List[dict]:
        offset = (page - 1) * page_size
        search_term = f"%{query}%"
        
        with get_db() as db:
            cursor = db.execute("""
                SELECT 
                    u.id,
                    u.username,
                    u.email,
                    u.role_id,
                    u.is_active,
                    u.created_at,
                    r.name as role_name
                FROM users u
                LEFT JOIN roles r ON u.role_id = r.id
                WHERE u.username LIKE ? 
                   OR u.email LIKE ? 
                   OR r.name LIKE ?
                ORDER BY u.username
                LIMIT ? OFFSET ?
            """, (search_term, search_term, search_term, page_size, offset))
            
            users = cursor.fetchall()
            return [
                {
                    "id": user["id"],
                    "username": user["username"],
                    "email": user["email"],
                    "role_id": user["role_id"],
                    "is_active": bool(user["is_active"]),
                    "created_at": user["created_at"],
                    "role_name": user["role_name"]
                }
                for user in users
            ]

    @staticmethod
    async def get_search_total(query: str) -> int:
        search_term = f"%{query}%"
        with get_db() as db:
            cursor = db.execute("""
                SELECT COUNT(*) as count 
                FROM users u
                LEFT JOIN roles r ON u.role_id = r.id
                WHERE u.username LIKE ? 
                   OR u.email LIKE ? 
                   OR r.name LIKE ?
            """, (search_term, search_term, search_term))
            result = cursor.fetchone()
            return result["count"]