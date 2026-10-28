from fastapi import Depends, Query
from sqlalchemy.orm import Session

from src.auth.dependencies import puede_consultar_operacion
from src.auth.router_base import PermissionedRouter
from src.database import get_db
from src.pagination import PaginatedResponse
from src.producto import schemas, services

router = PermissionedRouter(prefix="/productos", tags=["productos"])


@router.post("/", response_model=schemas.Producto, dependencies=[Depends(puede_consultar_operacion)])
def create_producto(producto: schemas.ProductoCreate, db: Session = Depends(get_db)):
    return services.crear_producto(db, producto)


@router.get("/", response_model=PaginatedResponse[schemas.Producto])
def read_productos(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    mostrar_inactivos: bool = Query(False),
    ordenar_por: str = Query("nombre"),
    orden: str = Query("asc"),
    buscar: str = Query(""),
):
    return services.listar_productos(db, page, size, mostrar_inactivos, ordenar_por, orden, buscar)


@router.get("/activos", response_model=list[schemas.Producto], dependencies=[Depends(puede_consultar_operacion)])
def read_productos_activos(db: Session = Depends(get_db)):
    return services.listar_productos_activos(db)


@router.get("/{producto_id}", response_model=schemas.Producto, dependencies=[Depends(puede_consultar_operacion)])
def read_producto(producto_id: int, db: Session = Depends(get_db)):
    return services.leer_producto(db, producto_id, incluir_inactivos=True)


@router.put("/{producto_id}", response_model=schemas.Producto)
def update_producto(producto_id: int, producto: schemas.ProductoUpdate, db: Session = Depends(get_db)):
    return services.modificar_producto(db, producto_id, producto)


@router.delete("/{producto_id}", response_model=schemas.Producto)
def delete_producto(producto_id: int, db: Session = Depends(get_db)):
    return services.eliminar_producto(db, producto_id)
