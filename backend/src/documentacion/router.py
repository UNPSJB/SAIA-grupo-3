import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.database import get_db
from src.documentacion import schemas, services

# Creamos un logger para este módulo específico. Más info.: https://docs.python.org/3/library/logging.html
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documentos", tags=["documentos"])

# Rutas para Documentos


@router.post("/", response_model=schemas.Documento)
def create_documento(documento: schemas.DocumentoCreate, db: Session = Depends(get_db)):
    return services.crear_documento(db, documento)


@router.get("/", response_model=list[schemas.Documento])
def read_documentos(db: Session = Depends(get_db)):
    logger.info("Listando documentos desde router") # <- este mensaje se verá por la terminal
    return services.listar_documentos(db)


@router.get("/{documento_id}", response_model=schemas.Documento)
def read_documento(documento_id: int, db: Session = Depends(get_db)):
    return services.leer_documento(db, documento_id)


@router.put("/{documento_id}", response_model=schemas.Documento)
def update_documento(
    documento_id: int, documento: schemas.DocumentoUpdate, db: Session = Depends(get_db)
):
    return services.modificar_documento(db, documento_id, documento)


@router.delete("/{documento_id}", response_model=schemas.DocumentoDelete)
def delete_documento(documento_id: int, db: Session = Depends(get_db)):
    return services.eliminar_documento(db, documento_id)
