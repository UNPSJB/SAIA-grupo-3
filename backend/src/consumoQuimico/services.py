from typing import Dict, Any
from sqlalchemy import select, update, func
from sqlalchemy.orm import Session
from src.consumoQuimico.models import ConsumoQuimico
from src.consumoQuimico import schemas, exceptions
from src.insumosQuimicos.services import leer_insumo_quimico
from src.insumosQuimicos.models import InsumoQuimico
from src.unidadMedida.models import UnidadMedida
from datetime import date

def crear_consumo(db: Session, consumo: schemas.ConsumoQuimicoCreate) -> ConsumoQuimico:
    insumo_db = leer_insumo_quimico(db, consumo.insumo_quimico_id)
    if insumo_db.cantidad < consumo.cantidad_utilizada:
        raise exceptions.StockInsuficiente()
    
    _consumo = ConsumoQuimico(**consumo.model_dump())
    db.add(_consumo)
    
    insumo_db.cantidad -= consumo.cantidad_utilizada
    db.add(insumo_db)
    
    db.commit()
    db.refresh(_consumo)
    return _consumo

def listar_consumos(
    db: Session, page: int = 1, size: int = 10, mostrar_inactivos: bool = False, ordenar_por: str = "fecha", orden: str = "desc"
) -> Dict[str, Any]:
    skip = (page - 1) * size
    query = select(ConsumoQuimico)
    
    if not mostrar_inactivos:
        query = query.where(ConsumoQuimico.activo == True)

    columna_orden = getattr(ConsumoQuimico, ordenar_por, ConsumoQuimico.id)
    if orden == "desc":
        query = query.order_by(columna_orden.desc())
    else:
        query = query.order_by(columna_orden.asc())

    total = db.scalar(select(func.count()).select_from(query.subquery()))
    items = db.scalars(query.offset(skip).limit(size)).all()
    pages = (total + size - 1) // size if total else 0

    return {"items": items, "total": total, "page": page, "size": size, "pages": pages}

def leer_consumo(db: Session, consumo_id: int, incluir_inactivos: bool = False) -> ConsumoQuimico:
    query = select(ConsumoQuimico).where(ConsumoQuimico.id == consumo_id)
    if not incluir_inactivos:
        query = query.where(ConsumoQuimico.activo == True)
    db_consumo = db.scalar(query)
    if db_consumo is None:
        raise exceptions.ConsumoNoEncontrado()
    return db_consumo

def modificar_consumo(db: Session, consumo_id: int, consumo_in: schemas.ConsumoQuimicoUpdate) -> ConsumoQuimico:
    db_consumo = leer_consumo(db, consumo_id, incluir_inactivos=True)
    datos_actualizar = consumo_in.model_dump(exclude_unset=True)

    # 1. Lógica exclusiva de reactivación (Si pasa de inactivo a activo)
    if datos_actualizar.get("activo") is True and not db_consumo.activo:
        insumo = leer_insumo_quimico(db, db_consumo.insumo_quimico_id)
        if insumo.cantidad < db_consumo.cantidad_utilizada:
            raise exceptions.StockInsuficiente()
        insumo.cantidad -= db_consumo.cantidad_utilizada
        db.add(insumo)

    # 2. Lógica si se edita el registro (cambio de cantidad o insumo)
    elif db_consumo.activo and ("cantidad_utilizada" in datos_actualizar or "insumo_quimico_id" in datos_actualizar):
        nueva_cantidad = datos_actualizar.get("cantidad_utilizada", db_consumo.cantidad_utilizada)
        nuevo_insumo_id = datos_actualizar.get("insumo_quimico_id", db_consumo.insumo_quimico_id)
        insumo_original = leer_insumo_quimico(db, db_consumo.insumo_quimico_id)
        
        if nuevo_insumo_id == db_consumo.insumo_quimico_id:
            diferencia = nueva_cantidad - db_consumo.cantidad_utilizada
            if insumo_original.cantidad < diferencia:
                raise exceptions.StockInsuficiente()
            insumo_original.cantidad -= diferencia
            db.add(insumo_original)
        else:
            insumo_nuevo = leer_insumo_quimico(db, nuevo_insumo_id)
            if insumo_nuevo.cantidad < nueva_cantidad:
                raise exceptions.StockInsuficiente()
            insumo_original.cantidad += db_consumo.cantidad_utilizada
            insumo_nuevo.cantidad -= nueva_cantidad
            db.add(insumo_original)
            db.add(insumo_nuevo)

    db.execute(update(ConsumoQuimico).where(ConsumoQuimico.id == consumo_id).values(**datos_actualizar))
    db.commit()
    db.refresh(db_consumo)
    return db_consumo

def eliminar_consumo(db: Session, consumo_id: int) -> schemas.ConsumoQuimicoDelete:
    db_consumo = leer_consumo(db, consumo_id)
    if db_consumo.activo:
        # Baja Lógica y se devuelve el stock
        db_consumo.activo = False
        insumo_db = leer_insumo_quimico(db, db_consumo.insumo_quimico_id)
        insumo_db.cantidad += db_consumo.cantidad_utilizada
        db.add(insumo_db)
        db.commit()
        db.refresh(db_consumo)
    return db_consumo

def obtener_consumo_acumulado(db: Session, fecha_desde: date | None = None, fecha_hasta: date | None = None):
    # Armamos la consulta cruzando Consumo, Insumo y Unidad de Medida
    query = (
        select(
            InsumoQuimico.id.label("insumo_id"),
            InsumoQuimico.nombre.label("nombre_insumo"),
            func.sum(ConsumoQuimico.cantidad_utilizada).label("cantidad_total"),
            UnidadMedida.sufijo.label("unidad_medida")
        )
        .join(ConsumoQuimico, InsumoQuimico.id == ConsumoQuimico.insumo_quimico_id)
        .join(UnidadMedida, InsumoQuimico.unidad_medida_id == UnidadMedida.id)
        .where(ConsumoQuimico.activo == True)
    )

    # Si nos pasan fechas, filtramos
    if fecha_desde:
        query = query.where(ConsumoQuimico.fecha >= fecha_desde)
    if fecha_hasta:
        query = query.where(ConsumoQuimico.fecha <= fecha_hasta)

    # Agrupamos por producto
    query = query.group_by(InsumoQuimico.id, InsumoQuimico.nombre, UnidadMedida.sufijo)
    
    resultados = db.execute(query).all()
    
    # Devolvemos la lista con el formato que definimos en el schema
    return [
        {
            "insumo_id": r.insumo_id,
            "nombre_insumo": r.nombre_insumo,
            "cantidad_total": r.cantidad_total,
            "unidad_medida": r.unidad_medida
        }
        for r in resultados
    ]