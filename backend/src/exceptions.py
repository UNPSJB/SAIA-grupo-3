from typing import Any, Dict, Type, TypeVar

from fastapi import HTTPException, status
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, ValidationError

SchemaT = TypeVar("SchemaT", bound=BaseModel)


def validar_schema(schema: Type[SchemaT], **datos: Any) -> SchemaT:
    """Arma un schema a mano (por ejemplo, con datos que llegan por Form) y, si los
    datos no son válidos, responde 422 con el mensaje del schema en lugar de un 500."""
    try:
        return schema(**datos)
    except ValidationError as error:
        raise RequestValidationError(error.errors(include_context=False))

class DetailedHTTPException(HTTPException):
    STATUS_CODE = status.HTTP_500_INTERNAL_SERVER_ERROR
    DETAIL = "Error del servidor"

    def __init__(self, detail: Any = None, **kwargs: Any) -> None:
        mensaje = self.DETAIL if detail is None else detail
        super().__init__(
            status_code=self.STATUS_CODE,
            detail=mensaje,
            **kwargs,
        )


class PermissionDenied(DetailedHTTPException):
    STATUS_CODE = status.HTTP_403_FORBIDDEN
    DETAIL = "Permiso denegado"


class NotFound(DetailedHTTPException):
    STATUS_CODE = status.HTTP_404_NOT_FOUND
    DETAIL = "No encontrado"


class BadRequest(DetailedHTTPException):
    STATUS_CODE = status.HTTP_400_BAD_REQUEST
    DETAIL = "Solicitud incorrecta"


class UnprocessableContent(DetailedHTTPException):
    STATUS_CODE = status.HTTP_422_UNPROCESSABLE_CONTENT
    DETAIL = "Contenido no procesable"


class NotAuthenticated(DetailedHTTPException):
    STATUS_CODE = status.HTTP_401_UNAUTHORIZED
    DETAIL = "Usuario no autorizado"

    def __init__(self) -> None:
        super().__init__(headers={"WWW-Authenticate": "Bearer"})
