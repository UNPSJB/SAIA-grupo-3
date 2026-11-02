from datetime import date
from typing import Literal

from fastapi import Depends, Query
from sqlalchemy.orm import Session

from src.abastecimiento import schemas, services
from src.abastecimiento.models import LoteRecepcionInsumo, Proveedor
from src.auth.dependencies import tiene_permiso_administrar
from src.auth.router_base import PermissionedRouter
from src.database import get_db
from src.pagination import PaginatedResponse
from src.personal.models import Personal


router = PermissionedRouter(tags=["abastecimiento"])


@router.get(
    "/proveedores/",
    response_model=PaginatedResponse[schemas.ProveedorOut],
)
def listar_proveedores(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    buscar: str = "",
    mostrar_inactivos: bool = False,
):
    return services.listar_proveedores(
        db,
        page,
        size,
        buscar,
        mostrar_inactivos,
    )


@router.post("/proveedores/", response_model=schemas.ProveedorOut)
def crear_proveedor(
    datos: schemas.ProveedorInput,
    db: Session = Depends(get_db),
):
    return services.guardar_proveedor(db, datos)


@router.get("/proveedores/{proveedor_id}", response_model=schemas.ProveedorOut)
def leer_proveedor(proveedor_id: int, db: Session = Depends(get_db)):
    return services.proveedor_salida(
        services.obtener(db, Proveedor, proveedor_id)
    )


@router.put("/proveedores/{proveedor_id}", response_model=schemas.ProveedorOut)
def editar_proveedor(
    proveedor_id: int,
    datos: schemas.ProveedorInput,
    db: Session = Depends(get_db),
):
    return services.guardar_proveedor(db, datos, proveedor_id)


@router.delete("/proveedores/{proveedor_id}", response_model=schemas.ProveedorOut)
def baja_proveedor(proveedor_id: int, db: Session = Depends(get_db)):
    return services.cambiar_estado_proveedor(db, proveedor_id, False)


@router.patch(
    "/proveedores/{proveedor_id}/estado",
    response_model=schemas.ProveedorOut,
)
def estado_proveedor(
    proveedor_id: int,
    datos: schemas.EstadoProveedor,
    db: Session = Depends(get_db),
):
    return services.cambiar_estado_proveedor(
        db,
        proveedor_id,
        datos.activo,
    )


@router.get(
    "/lotes-insumo/",
    response_model=PaginatedResponse[schemas.LoteOut],
)
def listar_lotes(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    insumo_id: int | None = Query(None, ge=1),
    proveedor_id: int | None = Query(None, ge=1),
    fecha_desde: date | None = None,
    fecha_hasta: date | None = None,
    estado: Literal["vencido", "por_vencer", "vigente"] | None = None,
    mostrar_inactivos: bool = False,
    buscar: str = Query("", max_length=100),
):
    return services.listar_recepciones(
        db,
        page,
        size,
        insumo_id,
        proveedor_id,
        fecha_desde,
        fecha_hasta,
        estado,
        mostrar_inactivos,
        buscar,
    )


@router.post("/lotes-insumo/", response_model=schemas.LoteOut)
def recibir_lote(
    datos: schemas.LoteInput,
    db: Session = Depends(get_db),
    personal: Personal = Depends(tiene_permiso_administrar),
):
    return services.guardar_recepcion(db, datos, personal.id)


@router.post("/lotes-insumo/conciliar-stock", response_model=schemas.LoteOut)
def conciliar_stock(
    datos: schemas.LoteInput,
    db: Session = Depends(get_db),
    personal: Personal = Depends(tiene_permiso_administrar),
):
    return services.guardar_recepcion(
        db,
        datos,
        personal.id,
        conciliacion=True,
    )


@router.get(
    "/lotes-insumo/resumen/{insumo_id}",
    response_model=schemas.StockOut,
)
def resumen_stock(insumo_id: int, db: Session = Depends(get_db)):
    return services.resumen_stock(db, insumo_id)


@router.get("/lotes-insumo/{lote_id}", response_model=schemas.LoteOut)
def leer_lote(lote_id: int, db: Session = Depends(get_db)):
    return services.lote_salida(
        services.obtener(db, LoteRecepcionInsumo, lote_id)
    )


@router.get("/lotes-insumo/{lote_id}/trazabilidad")
def trazabilidad(lote_id: int, db: Session = Depends(get_db)):
    return services.trazabilidad(db, lote_id)


@router.put("/lotes-insumo/{lote_id}", response_model=schemas.LoteOut)
def editar_lote(
    lote_id: int,
    datos: schemas.LoteInput,
    db: Session = Depends(get_db),
    personal: Personal = Depends(tiene_permiso_administrar),
):
    return services.guardar_recepcion(
        db,
        datos,
        personal.id,
        lote_id=lote_id,
    )


@router.delete("/lotes-insumo/{lote_id}", response_model=schemas.LoteOut)
def anular_lote(lote_id: int, db: Session = Depends(get_db)):
    return services.anular_recepcion(db, lote_id)