import jwt
import json
from fastapi import Depends, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jwt.exceptions import PyJWTError
from src.database import get_db
from src.config import settings
from src.auth import exceptions
from src.exceptions import PermissionDenied
from src.personal import services as personal_services
from src.personal import models as personal_models

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=settings.TOKEN_URL)

def get_token_from_cookie(request: Request) -> str:
    token = request.cookies.get(settings.REFRESH_TOKEN_COOKIE_NAME)
    if not token:
        raise exceptions.RefreshTokenNotValid()
    return token

async def get_refresh_personal(
    db: Session = Depends(get_db),
    token: str = Depends(get_token_from_cookie),
) -> personal_models.Personal:
    try:
        payload = jwt.decode(token, settings.REFRESH_SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_str = payload.get("sub")
        if user_str is None:
            raise exceptions.InvalidCredentials()
        
        user_dict = json.loads(user_str)
        personal_id = user_dict.get("id") # Extraemos el ID
    except PyJWTError:
        raise exceptions.RefreshTokenNotValid()

    try:
        # Buscamos por ID
        personal = personal_services.leer_personal(db, personal_id)
    except Exception:
        raise exceptions.InvalidCredentials()

    if getattr(personal, "activo", True) == False:
        raise exceptions.InvalidCredentials()

    return personal

async def get_current_personal(
    db: Session = Depends(get_db), 
    token: str = Depends(oauth2_scheme)
) -> personal_models.Personal:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_str = payload.get("sub")
        if user_str is None:
            raise exceptions.InvalidCredentials()
        
        user_dict = json.loads(user_str)
        personal_id = user_dict.get("id") # Extraemos el ID
    except PyJWTError:
        raise exceptions.InvalidCredentials()

    try:
        personal = personal_services.leer_personal(db, personal_id)
    except Exception:
        raise exceptions.InvalidCredentials()

    if getattr(personal, "activo", True) == False:
        raise exceptions.InvalidCredentials()

    return personal

async def tiene_permiso_administrar(personal: personal_models.Personal = Depends(get_current_personal)) -> personal_models.Personal:
    # Usamos tus banderas booleanas
    if not personal.administrar:
        raise PermissionDenied()
    return personal

async def tiene_permiso_operar(personal: personal_models.Personal = Depends(get_current_personal)) -> personal_models.Personal:
    # Usamos tus banderas booleanas
    if not personal.operar:
        raise PermissionDenied()
    return personal