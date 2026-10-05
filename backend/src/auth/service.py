from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from src.auth import exceptions
from src.auth.utils import check_passwords_match
from src.personal import models as personal_models


def authenticate_user(
    username: str,
    password: str,
    db: Session,
) -> personal_models.Personal:
    identifier = username.strip()

    personal = db.scalar(
        select(personal_models.Personal).where(
            or_(
                func.lower(personal_models.Personal.username)
                == identifier.lower(),
                func.lower(personal_models.Personal.email)
                == identifier.lower(),
                personal_models.Personal.dni == identifier,
            )
        )
    )

    if personal is None or not personal.activo:
        raise exceptions.IncorrectUserOrPassword()

    check_passwords_match(password, personal.hashed_password)
    return personal