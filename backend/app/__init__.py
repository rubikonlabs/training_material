from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth, rbac, audit, users
from app.config import settings

def create_app() -> FastAPI:
    # Include routers
    base = APIRouter(prefix=settings.API_PREFIX)
    base.include_router(auth.router)
    base.include_router(rbac.router)
    base.include_router(audit.router)
    base.include_router(users.router)
    
    app = FastAPI(title=settings.PROJECT_NAME)
    app.include_router(base)
    
    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"]
    )

    return app