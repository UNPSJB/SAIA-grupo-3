from datetime import date
from functools import wraps
import math

from fastapi import HTTPException
from sqlalchemy import case, func, or_, select, update
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.orm import Session

from src.abastecimiento.models import (
    ConsumoLoteRecepcion,
    LoteRecepcionInsumo,
    Proveedor,
)
from src.abastecimiento.schemas import LoteInput, ProveedorInput
from src.documentacion.vencimientos import calcular_estado
from src.insumos.models import Insumo
from src.loteProduccion.models import LoteProduccion
from src.producto.models import Producto


EPS = 1e-9


def atomico(funcion):
    @wraps(funcion)
    def ejecutar(db: Session, *args, **kwargs):
        try:
            resultado = funcion(db, *args, **kwargs)
            db.flush()

            db.commit()
            return resultado

        except IntegrityError:
            db.rollback()
            raise HTTPException(
                409,
                "La operación viola una restricción de datos. "
                "Verificá el CUIT y la clave de operación.",
            ) from None

        except OperationalError:
            db.rollback()
            raise HTTPException(
                409,
                "No se pudo completar la operación sobre la base de datos. "
                "Reintentá; si persiste, revisá el registro del servidor.",
            ) from None

        except Exception:
            db.rollback()
            raise

    return ejecutar


def obtener(db: Session, modelo, identificador: int):
    objeto = db.get(modelo, identificador)

    if objeto is None:
        raise HTTPException(404, "Registro no encontrado.")

    return objeto


def pagina(db: Session, consulta, page: int, size: int, transformar):
    total = db.scalar(
        select(func.count()).select_from(consulta.order_by(None).subquery())
    ) or 0

    objetos = db.scalars(
        consulta.offset((page - 1) * size).limit(size)
    ).all()

    return {
        "items": [transformar(objeto) for objeto in objetos],
        "page": page,
        "size": size,
        "total": total,
        "pages": (total + size - 1) // size if total else 0,
    }


def proveedor_salida(proveedor: Proveedor):
    vencimiento = proveedor.vencimiento_habilitacion

    return {
        "id": proveedor.id,
        "nombre": proveedor.nombre,
        "cuit": proveedor.cuit,
        "telefono": proveedor.telefono,
        "email": proveedor.email,
        "numero_habilitacion": proveedor.numero_habilitacion,
        "vencimiento_habilitacion": vencimiento,
        "activo": proveedor.activo,
        "habilitacion_estado": (
            calcular_estado(vencimiento, date.today()).value
            if vencimiento
            else None
        ),
    }


def lote_salida(lote: LoteRecepcionInsumo):
    proveedor = lote.proveedor
    hoy = date.today()
    advertencias = []

    if (
        proveedor.vencimiento_habilitacion
        and proveedor.vencimiento_habilitacion < hoy
    ):
        advertencias.append("La habilitación del proveedor está vencida.")

    if lote.fecha_vencimiento < hoy:
        advertencias.append("El lote está vencido y no puede utilizarse.")

    return {
        "id": lote.id,
        "insumo_id": lote.insumo_id,
        "insumo_nombre": lote.insumo.nombre,
        "unidad": lote.insumo.unidadMedidaObj.sufijo,
        "proveedor_id": lote.proveedor_id,
        "proveedor_nombre": proveedor.nombre,
        "numero_lote": lote.numero_lote,
        "cantidad": lote.cantidad,
        "cantidad_disponible": lote.cantidad_disponible,
        "fecha_recepcion": lote.fecha_recepcion,
        "fecha_vencimiento": lote.fecha_vencimiento,
        "registrado_por_id": lote.registrado_por_id,
        "fecha_registro": lote.fecha_registro,
        "activo": lote.activo,
        "conciliacion": lote.conciliacion,
        "clave_operacion": lote.clave_operacion,
        "estado_vencimiento": calcular_estado(
            lote.fecha_vencimiento,
            hoy,
        ).value,
        "dias_restantes": (lote.fecha_vencimiento - hoy).days,
        "advertencias": advertencias,
    }


def listar_proveedores(
    db: Session,
    page=1,
    size=10,
    buscar="",
    mostrar_inactivos=False,
):
    consulta = select(Proveedor)

    if not mostrar_inactivos:
        consulta = consulta.where(Proveedor.activo.is_(True))

    if buscar.strip():
        termino = buscar.strip().lower()
        cuit = termino.replace("-", "").replace(" ", "")

        consulta = consulta.where(
            or_(
                func.lower(Proveedor.nombre).contains(
                    termino,
                    autoescape=True,
                ),
                Proveedor.cuit.contains(cuit, autoescape=True),
            )
        )

    return pagina(
        db,
        consulta.order_by(Proveedor.nombre, Proveedor.id),
        page,
        size,
        proveedor_salida,
    )


@atomico
def guardar_proveedor(
    db: Session,
    datos: ProveedorInput,
    proveedor_id: int | None = None,
):
    duplicado = select(Proveedor.id).where(Proveedor.cuit == datos.cuit)

    if proveedor_id is not None:
        duplicado = duplicado.where(Proveedor.id != proveedor_id)

    if db.scalar(duplicado) is not None:
        raise HTTPException(
            409,
            "El CUIT ya está registrado, incluso si el proveedor está inactivo.",
        )

    valores = datos.model_dump(mode="json")

    if proveedor_id is None:
        # La fecha debe mantenerse como date para SQLAlchemy.
        valores["vencimiento_habilitacion"] = datos.vencimiento_habilitacion
        proveedor = Proveedor(**valores)
        db.add(proveedor)
    else:
        proveedor = obtener(db, Proveedor, proveedor_id)
        valores["vencimiento_habilitacion"] = datos.vencimiento_habilitacion

        for campo, valor in valores.items():
            setattr(proveedor, campo, valor)

    db.flush()
    return proveedor_salida(proveedor)


@atomico
def cambiar_estado_proveedor(db: Session, proveedor_id: int, activo: bool):
    proveedor = obtener(db, Proveedor, proveedor_id)
    proveedor.activo = activo
    db.flush()
    return proveedor_salida(proveedor)


def bloquear_insumo(
    db: Session,
    insumo_id: int,
    permitir_inactivo=False,
):
    # Bloquea las modificaciones concurrentes del saldo del mismo insumo.
    # Funciona también con SQLite, donde SELECT FOR UPDATE no bloquea filas.
    resultado = db.execute(
        update(Insumo)
        .where(Insumo.id == insumo_id)
        .values(cantidad=Insumo.cantidad)
        .execution_options(synchronize_session=False)
    )

    if resultado.rowcount != 1:
        raise HTTPException(404, "El insumo no existe.")

    insumo = db.scalar(
        select(Insumo)
        .where(Insumo.id == insumo_id)
        .execution_options(populate_existing=True)
    )

    if not permitir_inactivo and not insumo.activo:
        raise HTTPException(409, "El insumo está dado de baja.")

    return insumo


def resumen_stock(db: Session, insumo_id: int):
    insumo = obtener(db, Insumo, insumo_id)

    identificado, utilizable, vencido = db.execute(
        select(
            func.coalesce(
                func.sum(LoteRecepcionInsumo.cantidad_disponible),
                0,
            ),
            func.coalesce(
                func.sum(
                    case(
                        (
                            LoteRecepcionInsumo.fecha_vencimiento >= date.today(),
                            LoteRecepcionInsumo.cantidad_disponible,
                        ),
                        else_=0,
                    )
                ),
                0,
            ),
            func.coalesce(
                func.sum(
                    case(
                        (
                            LoteRecepcionInsumo.fecha_vencimiento < date.today(),
                            LoteRecepcionInsumo.cantidad_disponible,
                        ),
                        else_=0,
                    )
                ),
                0,
            ),
        ).where(
            LoteRecepcionInsumo.insumo_id == insumo_id,
            LoteRecepcionInsumo.activo.is_(True),
        )
    ).one()

    sin_lote = insumo.cantidad - identificado

    if sin_lote < -EPS:
        raise HTTPException(
            409,
            "El saldo de los lotes supera el stock del insumo. Revisá el inventario.",
        )

    return {
        "insumo_id": insumo_id,
        "stock_total": insumo.cantidad,
        "stock_identificado": identificado,
        "stock_sin_lote": max(0, sin_lote),
        "stock_utilizable": utilizable,
        "stock_vencido": vencido,
    }


def modificar_stock(db: Session, insumo_id: int, diferencia: float):
    nuevo = Insumo.cantidad + diferencia

    resultado = db.execute(
        update(Insumo)
        .where(
            Insumo.id == insumo_id,
            nuevo >= -EPS,
        )
        .values(
            cantidad=case(
                (nuevo < 0, 0),
                else_=nuevo,
            )
        )
        .execution_options(synchronize_session=False)
    )

    if resultado.rowcount != 1:
        raise HTTPException(409, "La operación dejaría stock negativo.")

    db.expire_all()


def tiene_consumos(db: Session, lote_id: int):
    return db.scalar(
        select(ConsumoLoteRecepcion.id)
        .where(ConsumoLoteRecepcion.lote_recepcion_id == lote_id)
        .limit(1)
    ) is not None


@atomico
def guardar_recepcion(
    db: Session,
    datos: LoteInput,
    registrado_por_id: int,
    lote_id: int | None = None,
    conciliacion=False,
):
    clave = str(datos.clave_operacion)

    if lote_id is None:
        existente = db.scalar(
            select(LoteRecepcionInsumo).where(
                LoteRecepcionInsumo.clave_operacion == clave
            )
        )

        if existente is not None:
            coincide = (
                existente.insumo_id == datos.insumo_id
                and existente.proveedor_id == datos.proveedor_id
                and existente.numero_lote == datos.numero_lote
                and existente.cantidad == datos.cantidad
                and existente.fecha_recepcion == datos.fecha_recepcion
                and existente.fecha_vencimiento == datos.fecha_vencimiento
                and existente.conciliacion == conciliacion
            )

            if not coincide:
                raise HTTPException(
                    409,
                    "Esta clave de operación ya fue utilizada con otros datos.",
                )

            return lote_salida(existente)

    bloquear_insumo(db, datos.insumo_id)

    proveedor = obtener(db, Proveedor, datos.proveedor_id)

    if not proveedor.activo:
        raise HTTPException(
            409,
            "No se pueden registrar lotes de un proveedor dado de baja.",
        )

    if lote_id is None:
        anterior = 0.0

        lote = LoteRecepcionInsumo(
            insumo_id=datos.insumo_id,
            proveedor_id=datos.proveedor_id,
            numero_lote=datos.numero_lote,
            cantidad=datos.cantidad,
            cantidad_disponible=datos.cantidad,
            fecha_recepcion=datos.fecha_recepcion,
            fecha_vencimiento=datos.fecha_vencimiento,
            registrado_por_id=registrado_por_id,
            clave_operacion=clave,
            conciliacion=conciliacion,
        )
    else:
        lote = obtener(db, LoteRecepcionInsumo, lote_id)
        db.refresh(lote)

        if not lote.activo or tiene_consumos(db, lote.id):
            raise HTTPException(
                409,
                "No se puede modificar una recepción anulada o con consumos.",
            )

        if (
            lote.insumo_id != datos.insumo_id
            or lote.proveedor_id != datos.proveedor_id
            or lote.clave_operacion != clave
        ):
            raise HTTPException(
                422,
                "No se puede cambiar el insumo, proveedor o clave de la recepción.",
            )

        anterior = lote.cantidad
        conciliacion = lote.conciliacion

    diferencia = datos.cantidad - anterior

    if conciliacion:
        saldo = resumen_stock(db, datos.insumo_id)

        if diferencia > saldo["stock_sin_lote"] + EPS:
            raise HTTPException(
                409,
                "La cantidad supera el stock anterior que falta identificar.",
            )
    else:
        modificar_stock(db, datos.insumo_id, diferencia)

    lote.numero_lote = datos.numero_lote
    lote.cantidad = datos.cantidad
    lote.cantidad_disponible = datos.cantidad
    lote.fecha_recepcion = datos.fecha_recepcion
    lote.fecha_vencimiento = datos.fecha_vencimiento

    db.add(lote)
    db.flush()

    return lote_salida(lote)


@atomico
def anular_recepcion(db: Session, lote_id: int):
    lote = obtener(db, LoteRecepcionInsumo, lote_id)
    bloquear_insumo(db, lote.insumo_id, permitir_inactivo=True)
    db.refresh(lote)

    if not lote.activo:
        return lote_salida(lote)

    if tiene_consumos(db, lote.id):
        raise HTTPException(
            409,
            "La recepción tiene consumos y no puede darse de baja.",
        )

    if not lote.conciliacion:
        modificar_stock(db, lote.insumo_id, -lote.cantidad_disponible)

    lote.activo = False
    db.flush()

    return lote_salida(lote)


def listar_recepciones(
    db: Session,
    page=1,
    size=10,
    insumo_id=None,
    proveedor_id=None,
    fecha_desde=None,
    fecha_hasta=None,
    estado=None,
    mostrar_inactivos=False,
    buscar="",
):
    if fecha_desde and fecha_hasta and fecha_desde > fecha_hasta:
        raise HTTPException(422, "El rango de fechas es inválido.")

    consulta = select(LoteRecepcionInsumo)

    if not mostrar_inactivos:
        consulta = consulta.where(LoteRecepcionInsumo.activo.is_(True))

    if insumo_id is not None:
        consulta = consulta.where(LoteRecepcionInsumo.insumo_id == insumo_id)

    if proveedor_id is not None:
        consulta = consulta.where(
            LoteRecepcionInsumo.proveedor_id == proveedor_id
        )

    if buscar.strip():
        termino = buscar.strip().lower()
        consulta = consulta.join(Insumo).join(Proveedor).where(
            or_(
                func.lower(LoteRecepcionInsumo.numero_lote).contains(
                    termino,
                    autoescape=True,
                ),
                func.lower(Insumo.nombre).contains(termino, autoescape=True),
                func.lower(Proveedor.nombre).contains(termino, autoescape=True),
            )
        )

    if fecha_desde is not None:
        consulta = consulta.where(
            LoteRecepcionInsumo.fecha_recepcion >= fecha_desde
        )

    if fecha_hasta is not None:
        consulta = consulta.where(
            LoteRecepcionInsumo.fecha_recepcion <= fecha_hasta
        )

    if estado:
        from datetime import timedelta
        from src.documentacion.constants import DIAS_AVISO_VENCIMIENTO

        hoy = date.today()
        limite = hoy + timedelta(days=DIAS_AVISO_VENCIMIENTO)
        fecha = LoteRecepcionInsumo.fecha_vencimiento

        if estado == "vencido":
            consulta = consulta.where(fecha < hoy)
        elif estado == "por_vencer":
            consulta = consulta.where(fecha.between(hoy, limite))
        else:
            consulta = consulta.where(fecha > limite)

    return pagina(
        db,
        consulta.order_by(
            LoteRecepcionInsumo.fecha_vencimiento,
            LoteRecepcionInsumo.id,
        ),
        page,
        size,
        lote_salida,
    )


def consumir_para_produccion(
    db: Session,
    insumo_id: int,
    cantidad: float,
    lote_produccion_id: int,
    fecha_produccion: date,
):
    # Distribuye el consumo; producción conserva el descuento general y el commit.
    if not math.isfinite(cantidad) or cantidad <= 0:
        raise HTTPException(422, "La cantidad consumida debe ser positiva.")

    insumo = bloquear_insumo(db, insumo_id)

    lotes = db.scalars(
        select(LoteRecepcionInsumo)
        .where(
            LoteRecepcionInsumo.insumo_id == insumo_id,
            LoteRecepcionInsumo.activo.is_(True),
            LoteRecepcionInsumo.cantidad_disponible > 0,
        )
        .order_by(
            LoteRecepcionInsumo.fecha_vencimiento,
            LoteRecepcionInsumo.fecha_recepcion,
            LoteRecepcionInsumo.id,
        )
        .execution_options(populate_existing=True)
    ).all()

    identificado = sum(lote.cantidad_disponible for lote in lotes)
    stock_anterior = insumo.cantidad - identificado
    if stock_anterior < -EPS:
        raise HTTPException(409, "El saldo de los lotes supera el stock general. Revisá el inventario.")
    stock_anterior = max(0.0, stock_anterior)

    utilizables = [
        lote for lote in lotes
        if lote.fecha_vencimiento >= date.today()
        and lote.fecha_recepcion <= fecha_produccion
    ]
    saldo = sum(lote.cantidad_disponible for lote in utilizables)
    faltante = max(0.0, cantidad - saldo)
    if faltante > EPS:
        raise HTTPException(
            409,
            f"No hay saldo suficiente en lotes vigentes identificados para {insumo.nombre}. "
            "Registrá una recepción o identificá el stock anterior con sus datos reales. "
            "No se pueden usar lotes vencidos o recibidos después de la producción.",
        )

    if cantidad > insumo.cantidad + EPS:
        raise HTTPException(
            409,
            "El stock general es insuficiente.",
        )

    pendiente = cantidad

    for lote in utilizables:
        if pendiente <= 0:
            break

        tomado = min(pendiente, lote.cantidad_disponible)
        lote.cantidad_disponible = max(
            0,
            lote.cantidad_disponible - tomado,
        )

        db.add(
            ConsumoLoteRecepcion(
                lote_produccion_id=lote_produccion_id,
                lote_recepcion_id=lote.id,
                cantidad=tomado,
            )
        )

        pendiente = max(0.0, pendiente - tomado)

    db.flush()


def trazabilidad(db: Session, lote_id: int):
    obtener(db, LoteRecepcionInsumo, lote_id)

    filas = db.execute(
        select(
            ConsumoLoteRecepcion,
            LoteProduccion,
            Producto.nombre,
        )
        .join(
            LoteProduccion,
            LoteProduccion.id == ConsumoLoteRecepcion.lote_produccion_id,
        )
        .join(Producto, Producto.id == LoteProduccion.producto_id)
        .where(ConsumoLoteRecepcion.lote_recepcion_id == lote_id)
        .order_by(LoteProduccion.fecha_produccion, LoteProduccion.id)
    ).all()

    return [
        {
            "lote_produccion_id": produccion.id,
            "codigo": produccion.codigo,
            "producto": nombre,
            "fecha_produccion": produccion.fecha_produccion,
            "cantidad_utilizada": consumo.cantidad,
            "activo": produccion.activo,
        }
        for consumo, produccion, nombre in filas
    ]


def vencimientos_abastecimiento(db: Session, hoy: date):
    filas = []

    lotes = db.scalars(
        select(LoteRecepcionInsumo).where(
            LoteRecepcionInsumo.activo.is_(True),
            LoteRecepcionInsumo.cantidad_disponible > 0,
        )
    ).all()

    for lote in lotes:
        filas.append(
            {
                "id": lote.id,
                "detalle_id": lote.id,
                "origen": "lote_insumo",
                "fecha_vencimiento": lote.fecha_vencimiento,
                "estado": calcular_estado(
                    lote.fecha_vencimiento,
                    hoy,
                ),
                "dias_restantes": (lote.fecha_vencimiento - hoy).days,
                "elemento": lote.insumo.nombre,
                "descripcion": (
                    f"Lote {lote.numero_lote} · {lote.proveedor.nombre} · "
                    f"Saldo: {lote.cantidad_disponible:g} "
                    f"{lote.insumo.unidadMedidaObj.sufijo}"
                ),
                "enlace": f"/recepciones-insumos?insumo_id={lote.insumo_id}",
            }
        )

    proveedores = db.scalars(
        select(Proveedor).where(
            Proveedor.activo.is_(True),
            Proveedor.vencimiento_habilitacion.is_not(None),
        )
    ).all()

    for proveedor in proveedores:
        fecha = proveedor.vencimiento_habilitacion

        filas.append(
            {
                "id": proveedor.id,
                "detalle_id": proveedor.id,
                "origen": "habilitacion_proveedor",
                "fecha_vencimiento": fecha,
                "estado": calcular_estado(fecha, hoy),
                "dias_restantes": (fecha - hoy).days,
                "elemento": proveedor.nombre,
                "descripcion": (
                    f"Habilitación: {proveedor.numero_habilitacion or 'Sin número'}"
                ),
                "enlace": "/proveedores",
            }
        )

    return filas
