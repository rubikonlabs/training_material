from fastapi import HTTPException, status
from typing import List, Optional
from app.models.rbac import Role, Permission, RoleCreate, RoleUpdate
from app.db.database import get_db

class RBACService:
    @staticmethod
    async def get_all_roles() -> List[Role]:
        """Get all roles with their permissions"""
        with get_db() as db:
            # Get roles
            cursor = db.execute('''
                SELECT r.*, COUNT(u.id) as user_count
                FROM roles r
                LEFT JOIN users u ON r.id = u.role_id
                GROUP BY r.id
            ''')
            roles = cursor.fetchall()
            
            result = []
            for role in roles:
                # Get permissions for each role
                cursor = db.execute('''
                    SELECT p.*
                    FROM permissions p
                    JOIN role_permissions rp ON p.id = rp.permission_id
                    WHERE rp.role_id = ?
                ''', (role['id'],))
                permissions = cursor.fetchall()
                
                result.append({
                    "id": role['id'],
                    "name": role['name'],
                    "description": role['description'],
                    "created_at": role['created_at'],
                    "user_count": role['user_count'],
                    "permissions": [
                        {
                            "id": perm['id'],
                            "name": perm['name'],
                            "description": perm['description'],
                            "category": perm['category']
                        }
                        for perm in permissions
                    ]
                })
            
            return result

    @staticmethod
    async def get_all_permissions() -> List[Permission]:
        """Get all available permissions"""
        with get_db() as db:
            cursor = db.execute('SELECT * FROM permissions ORDER BY category, name')
            permissions = cursor.fetchall()
            return [
                {
                    "id": perm['id'],
                    "name": perm['name'],
                    "description": perm['description'],
                    "category": perm['category']
                }
                for perm in permissions
            ]

    @staticmethod
    async def get_user_role(user_id: int) -> str:
        with get_db() as db:
            cursor = db.execute('''
                SELECT r.name 
                FROM roles r
                JOIN users u ON u.role_id = r.id
                WHERE u.id = ?
            ''', (user_id,))
            result = cursor.fetchone()
            return result[0] if result else None

    @staticmethod
    async def get_user_permissions(user_id: int) -> List[str]:
        with get_db() as db:
            cursor = db.execute('''
                SELECT DISTINCT p.name 
                FROM permissions p
                JOIN role_permissions rp ON p.id = rp.permission_id
                JOIN users u ON u.role_id = rp.role_id
                WHERE u.id = ?
            ''', (user_id,))
            return [row[0] for row in cursor.fetchall()]

    @staticmethod
    async def create_role(role_data: RoleCreate) -> Role:
        with get_db() as db:
            cursor = db.execute(
                "INSERT INTO roles (name, description) VALUES (?, ?)",
                (role_data.name, role_data.description)
            )
            db.commit()
            return await RBACService.get_role(cursor.lastrowid)

    @staticmethod
    async def get_role(role_id: int) -> Role:
        """Get a single role by ID"""
        with get_db() as db:
            cursor = db.execute('SELECT * FROM roles WHERE id = ?', (role_id,))
            role = cursor.fetchone()
            
            if not role:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Role not found"
                )
            
            # Get permissions for the role
            cursor = db.execute('''
                SELECT p.*
                FROM permissions p
                JOIN role_permissions rp ON p.id = rp.permission_id
                WHERE rp.role_id = ?
            ''', (role_id,))
            permissions = cursor.fetchall()
            
            return {
                "id": role['id'],
                "name": role['name'],
                "description": role['description'],
                "created_at": role['created_at'],
                "permissions": [
                    {
                        "id": perm['id'],
                        "name": perm['name'],
                        "description": perm['description'],
                        "category": perm['category']
                    }
                    for perm in permissions
                ]
            }

    @staticmethod
    async def update_role(role_id: int, role_data: RoleUpdate) -> Role:
        updates = []
        values = []
        if role_data.name is not None:
            updates.append("name = ?")
            values.append(role_data.name)
        if role_data.description is not None:
            updates.append("description = ?")
            values.append(role_data.description)
        
        if not updates:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )

        with get_db() as db:
            values.append(role_id)
            db.execute(
                f"UPDATE roles SET {', '.join(updates)} WHERE id = ?",
                values
            )
            db.commit()
            return await RBACService.get_role(role_id)

    @staticmethod
    async def assign_role_to_user(user_id: int, role_id: int):
        with get_db() as db:
            db.execute(
                "UPDATE users SET role_id = ? WHERE id = ?",
                (role_id, user_id)
            )
            db.commit()

    @staticmethod
    async def check_permission(user_id: int, required_permission: str) -> bool:
        permissions = await RBACService.get_user_permissions(user_id)
        return required_permission in permissions
    
    @staticmethod
    async def get_roles_count():
        with get_db() as db:
            cursor = db.execute("SELECT COUNT(*) as count FROM roles")
            result = cursor.fetchone()
            return result['count']

    @staticmethod
    async def get_users_count():
        with get_db() as db:
            cursor = db.execute("SELECT COUNT(*) as count FROM users")
            result = cursor.fetchone()
            return result['count']