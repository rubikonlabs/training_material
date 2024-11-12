import sqlite3
from contextlib import contextmanager
from typing import Generator

from app.utils.security import get_password_hash

DATABASE_URL = "app.db"

def init_db():
    with get_db() as db:
        # Create roles table
        db.execute('''
            CREATE TABLE IF NOT EXISTS roles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Create default roles
        db.execute('''
            INSERT OR IGNORE INTO roles (name, description) VALUES 
            ('admin', 'Administrator with full access'),
            ('user', 'Regular user with basic access'),
            ('moderator', 'User with moderation privileges')
        ''')

        # Create permissions table with more detailed permissions
        db.execute('''
            CREATE TABLE IF NOT EXISTS permissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                description TEXT,
                category TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Insert comprehensive permissions
        permissions = [
            # User management permissions
            ('manage_users', 'Can create, update, and delete users', 'user'),
            ('view_users', 'Can view user list and details', 'user'),
            ('create_user', 'Can create new users', 'user'),
            ('update_user', 'Can update user information', 'user'),
            ('delete_user', 'Can delete users', 'user'),
            
            # Role management permissions
            ('manage_roles', 'Can create, update, and delete roles', 'role'),
            ('view_roles', 'Can view roles and permissions', 'role'),
            ('assign_roles', 'Can assign roles to users', 'role'),
            
            # Permission management
            ('manage_permissions', 'Can manage permission assignments', 'permission'),
            ('view_permissions', 'Can view permissions list', 'permission'),
            
            # System settings
            ('manage_settings', 'Can modify system settings', 'system'),
            ('view_settings', 'Can view system settings', 'system'),
            
            # Audit logs
            ('view_audit_logs', 'Can view audit logs', 'audit'),
            ('manage_audit_logs', 'Can manage audit logs', 'audit')
        ]
        
        db.executemany('''
            INSERT OR IGNORE INTO permissions (name, description, category) 
            VALUES (?, ?, ?)
        ''', permissions)

        # Create role_permissions table
        db.execute('''
            CREATE TABLE IF NOT EXISTS role_permissions (
                role_id INTEGER,
                permission_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (role_id, permission_id),
                FOREIGN KEY (role_id) REFERENCES roles (id),
                FOREIGN KEY (permission_id) REFERENCES permissions (id)
            )
        ''')

        # Assign all permissions to admin role
        db.execute('''
            INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
            SELECT r.id, p.id 
            FROM roles r, permissions p 
            WHERE r.name = 'admin'
        ''')

        # Create users table
        db.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                hashed_password TEXT NOT NULL,
                role_id INTEGER DEFAULT 2,
                is_active BOOLEAN NOT NULL DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP,
                FOREIGN KEY (role_id) REFERENCES roles (id)
            )
        ''')

        # Create default admin user
        default_admin = {
            'username': 'admin',
            'email': 'admin@example.com',
            'password': 'admin123'  # Change this in production!
        }

        db.execute('''
            INSERT OR IGNORE INTO users (username, email, hashed_password, role_id)
            VALUES (?, ?, ?, (SELECT id FROM roles WHERE name = 'admin'))
        ''', (
            default_admin['username'],
            default_admin['email'],
            get_password_hash(default_admin['password'])
        ))

        # Create audit logs table
        db.execute('''
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                action TEXT NOT NULL,
                entity_type TEXT NOT NULL,
                entity_id INTEGER,
                details TEXT,
                ip_address TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')

        db.commit()

@contextmanager
def get_db() -> Generator[sqlite3.Connection, None, None]:
    conn = sqlite3.connect(DATABASE_URL)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def get_user_by_username(username: str):
    with get_db() as db:
        cursor = db.execute('''
            SELECT u.*, r.name as role_name 
            FROM users u 
            JOIN roles r ON u.role_id = r.id 
            WHERE u.username=?
        ''', (username,))
        return cursor.fetchone()

def get_user_permissions(user_id: int):
    with get_db() as db:
        cursor = db.execute('''
            SELECT DISTINCT p.name 
            FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            JOIN users u ON u.role_id = rp.role_id
            WHERE u.id = ?
        ''', (user_id,))
        return [row[0] for row in cursor.fetchall()]

def create_user(username: str, email: str, hashed_password: str, role_id: int = 2):
    with get_db() as db:
        cursor = db.execute(
            "INSERT INTO users (username, email, hashed_password, role_id) VALUES (?, ?, ?, ?)",
            (username, email, hashed_password, role_id)
        )
        db.commit()
        return cursor.lastrowid

def get_user_by_email(email: str):
    with get_db() as db:
        cursor = db.cursor()
        cursor.execute(
            "SELECT * FROM users WHERE email=?",
            (email,)
        )
        return cursor.fetchone()