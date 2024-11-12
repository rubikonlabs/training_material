from app.db.database import get_db
from datetime import datetime

class AuditService:
    @staticmethod
    async def get_recent_activities(limit: int = 10):
        with get_db() as db:
            cursor = db.execute("""
                SELECT 
                    al.*,
                    u.username
                FROM audit_logs al
                LEFT JOIN users u ON al.user_id = u.id
                ORDER BY al.created_at DESC
                LIMIT ?
            """, (limit,))
            
            activities = cursor.fetchall()
            return [{
                'id': activity['id'],
                'timestamp': activity['created_at'],
                'action': activity['action'],
                'entity_type': activity['entity_type'],
                'entity_id': activity['entity_id'],
                'details': activity['details'],
                'username': activity['username'],
                'ip_address': activity['ip_address']
            } for activity in activities]

    @staticmethod
    async def log_activity(user_id: int, action: str, entity_type: str, 
                          entity_id: int = None, details: str = None, 
                          ip_address: str = None):
        with get_db() as db:
            db.execute("""
                INSERT INTO audit_logs (
                    user_id, action, entity_type, entity_id, 
                    details, ip_address, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                user_id, action, entity_type, entity_id,
                details, ip_address, datetime.utcnow()
            ))
            db.commit()