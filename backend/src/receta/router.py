from fastapi import APIRouter

from src.receta.constants import PREFIJO_RUTA

router = APIRouter(prefix=PREFIJO_RUTA, tags=["producción - recetas"])
