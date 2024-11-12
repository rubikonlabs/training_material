from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from datetime import timedelta
from app.config import settings
from app.models.user import UserCreate, User, Token
from app.services.auth import AuthService
from app.utils.security import create_access_token, get_current_user

router = APIRouter(tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

@router.post("/register", response_model=User)
async def register(user_data: UserCreate):
    """
    Register a new user.
    """
    return await AuthService.register(user_data)

@router.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Login to get access token.
    """
    user = await AuthService.authenticate(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

@router.get("/verify-admin")
async def verify_admin(current_user: User = Depends(get_current_user)):
    """
    Verify if the current user is an admin.
    """
    is_admin = await AuthService.is_admin(current_user.id)
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not an administrator"
        )
    return {"status": "success", "is_admin": True}