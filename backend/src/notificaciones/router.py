from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from src.database import get_db
from src.notificaciones import schemas, services

router = APIRouter(prefix="/notificaciones", tags=["notificaciones"])

@router.get("/", response_model=List[schemas.Notificacion])
def read_notificaciones(
    solo_no_leidas: bool = False,
    limite: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return services.listar_notificaciones(db, solo_no_leidas, limite)

@router.get("/no-leidas/cantidad", response_model=schemas.Cantidad)
def read_cantidad_no_leidas(db: Session = Depends(get_db)):
    return {"cantidad": services.contar_no_leidas(db)}

@router.patch("/leer-todas", response_model=schemas.Cantidad)
def marcar_todas_leidas(db: Session = Depends(get_db)):
    return {"cantidad": services.marcar_todas_leidas(db)}

@router.patch("/{notificacion_id}/leer", response_model=schemas.Notificacion)
def marcar_leida(notificacion_id: int, db: Session = Depends(get_db)):
    return services.marcar_leida(db, notificacion_id)

@router.post("/generar", response_model=Optional[schemas.Notificacion])
def generar_ahora(db: Session = Depends(get_db)):
    return services.generar_aviso_vencimientos(db)

