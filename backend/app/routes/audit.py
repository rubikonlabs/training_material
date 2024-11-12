from fastapi import APIRouter, Depends
from typing import List
from app.models.user import User
from app.dependencies.rbac import require_permission
from app.services.audit import AuditService

router = APIRouter(prefix="/audit", tags=["audit"])

@router.get("/recent")
async def get_recent_activities(
    limit: int = 10,
    user: User = Depends(require_permission("view_audit_logs"))
):
    """Get recent audit activities"""
    activities = await AuditService.get_recent_activities(limit)
    return activities