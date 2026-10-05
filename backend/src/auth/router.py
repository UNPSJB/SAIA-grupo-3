from fastapi import APIRouter, Depends, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from src.database import get_db
from src.auth import schemas, exceptions, service
from src.auth.utils import (
    create_access_token, create_refresh_token, 
    get_refresh_token_settings, get_delete_token_settings
)
from src.auth.dependencies import get_current_personal, get_refresh_personal

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/token", response_model=schemas.Token)
async def login(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    personal = service.authenticate_user(form_data.username, form_data.password, db)
    
    # Pasamos el ID, no el DNI
    refresh_token_value = await create_refresh_token(db, personal.id)
    access_token = create_access_token(personal)
    
    response.set_cookie(**get_refresh_token_settings(refresh_token_value))
    return schemas.Token(access_token=access_token, user_id=personal.id)

@router.put("/token", response_model=schemas.Token)
async def refresh_tokens(
    response: Response,
    db: Session = Depends(get_db),
    personal = Depends(get_refresh_personal),
):
    new_access_token = create_access_token(personal)
    new_refresh_token = await create_refresh_token(db, personal.id)
    
    response.set_cookie(**get_refresh_token_settings(new_refresh_token))
    return schemas.Token(access_token=new_access_token, user_id=personal.id)

@router.delete("/token")
async def logout_user(response: Response):
    response.delete_cookie(**get_delete_token_settings())
    return {"msg": "La sesión se ha cerrado exitosamente!"}

@router.get("/validate-user", response_model=schemas.Token)
async def validate_user(auth_personal=Depends(get_current_personal)):
    if auth_personal:
        access_token = create_access_token(auth_personal)
        return schemas.Token(access_token=access_token, user_id=auth_personal.id)
    raise exceptions.NotAuthenticated()