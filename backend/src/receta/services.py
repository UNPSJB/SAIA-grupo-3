from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.areas.services import obtener_ingredientes
from src.equipos.models import Equipo
from src.insumos.constants import TipoInsumo
from src.insumos.models import Insumo
from src.personal.models import Personal
from src.producto.models import Producto
from src.receta import exceptions, schemas
from src.receta.constants import EstadoVersionReceta
from src.receta.models import PasoReceta, Receta, RenglonReceta, VersionReceta
from src.unidadMedida.conversion import convertir
from src.unidadMedida.models import UnidadMedida
<<<<<<< HEAD
from src.receta.constants import DECIMALES_ESCALADO, DECIMALES_PORCENTAJE, TOLERANCIA_COMPOSICION
from src.receta.composicion import a_gramos, calcular_composicion, mensaje_faltante
=======
from src.receta.constants import DECIMALES_ESCALADO
>>>>>>> dev

ETIQUETA_TIPO = {TipoInsumo.INGREDIENTE: "ingrediente", TipoInsumo.ADITIVO: "aditivo"}


def _producto_activo(db: Session, producto_id: int) -> Producto:
    producto = db.get(Producto, producto_id)
    if producto is None:
        raise exceptions.ProductoNoEncontrado()
    if not producto.activo:
        raise exceptions.ProductoInactivo()
    return producto


def _validar_unidades(db: Session, ids: set[int]) -> None:
    activas = set(
        db.scalars(select(UnidadMedida.id).where(UnidadMedida.id.in_(ids), UnidadMedida.activo.is_(True)))
    )
    if activas != ids:
        raise exceptions.UnidadInvalida()


def _armar_renglones(db: Session, renglones: list[schemas.RenglonCreate]) -> list[RenglonReceta]:
    ingredientes = obtener_ingredientes(db, [renglon.insumo_id for renglon in renglones])
    vistos: set[int] = set()
    armados = []
    for orden, renglon in enumerate(renglones, start=1):
        insumo: Insumo = ingredientes[renglon.insumo_id]
        if renglon.insumo_id in vistos:
            raise exceptions.InsumoRepetido(insumo.nombre)
        vistos.add(renglon.insumo_id)
        if not insumo.activo:
            raise exceptions.InsumoInactivo(insumo.nombre)
        if renglon.tipo != insumo.tipo:
            raise exceptions.TipoNoCoincide(insumo.nombre, ETIQUETA_TIPO[insumo.tipo])
        aditivo = insumo.aditivo_referencia if renglon.tipo == TipoInsumo.ADITIVO else None
        if renglon.tipo == TipoInsumo.ADITIVO and (aditivo is None or aditivo.clase_funcional is None):
            raise exceptions.AditivoSinClase(insumo.nombre)
        armados.append(
            RenglonReceta(
                orden=orden,
                insumo_id=insumo.id,
                tipo=renglon.tipo,
                aditivo_referencia_id=aditivo.id if aditivo else None,
                cantidad=renglon.cantidad,
                unidad_medida_id=renglon.unidad_medida_id,
            )
        )
    return armados


def _armar_pasos(db: Session, pasos: list[schemas.PasoCreate]) -> list[PasoReceta]:
    armados = []
    for orden, paso in enumerate(pasos, start=1):
        if paso.equipo_id is not None:
            equipo = db.get(Equipo, paso.equipo_id)
            if equipo is None or not equipo.activo:
                raise exceptions.EquipoInvalido(paso.nombre)
        armados.append(PasoReceta(orden=orden, **paso.model_dump()))
    return armados


def _armar_version(
    db: Session, datos: schemas.VersionDatos, numero: int, motivo: str, persona: Personal
) -> VersionReceta:
    unidades = {datos.rendimiento_unidad_id, *(renglon.unidad_medida_id for renglon in datos.renglones)}
    if datos.porcion_unidad_id is not None:
        unidades.add(datos.porcion_unidad_id)
    _validar_unidades(db, unidades)
    return VersionReceta(
        numero=numero,
        estado=EstadoVersionReceta.VIGENTE,
        motivo=motivo,
        rendimiento_cantidad=datos.rendimiento_cantidad,
        rendimiento_unidad_id=datos.rendimiento_unidad_id,
        porcion_cantidad=datos.porcion_cantidad,
        porcion_unidad_id=datos.porcion_unidad_id,
        porcion_medida_casera=datos.porcion_medida_casera,
        creado_por_id=persona.id,
        renglones=_armar_renglones(db, datos.renglones),
        pasos=_armar_pasos(db, datos.pasos),
    )


def crear_receta(db: Session, datos: schemas.RecetaCreate, persona: Personal) -> Receta:
    _producto_activo(db, datos.producto_id)
    if db.scalar(select(Receta.id).where(Receta.producto_id == datos.producto_id)) is not None:
        raise exceptions.RecetaExistente()
    version = _armar_version(db, datos, 1, datos.motivo, persona)
    receta = Receta(producto_id=datos.producto_id, versiones=[version])
    db.add(receta)
    db.flush()
    calcular_composicion(version)
    db.commit()
    db.refresh(receta)
    return receta


def guardar_nueva_version(db: Session, receta_id: int, datos: schemas.NuevaVersion, persona: Personal) -> Receta:
    receta = leer_receta(db, receta_id)
    vigente = receta.version_vigente
    if vigente is None or datos.version_base_id != vigente.id:
        base = db.get(VersionReceta, datos.version_base_id)
        if base is None or base.receta_id != receta.id:
            raise exceptions.VersionNoEncontrada()
        raise exceptions.VersionArchivada(base.numero)
    _producto_activo(db, receta.producto_id)
    numero = (db.scalar(select(func.max(VersionReceta.numero)).where(VersionReceta.receta_id == receta.id)) or 0) + 1
    nueva = _armar_version(db, datos, numero, datos.motivo, persona)
    vigente.estado = EstadoVersionReceta.ARCHIVADA
    receta.versiones.append(nueva)
    db.flush()
    calcular_composicion(nueva)
    db.commit()
    db.refresh(receta)
    return receta


def leer_receta(db: Session, receta_id: int) -> Receta:
    receta = db.get(Receta, receta_id)
    if receta is None:
        raise exceptions.RecetaNoEncontrada()
    return receta


def leer_receta_de_producto(db: Session, producto_id: int) -> Receta:
    if db.get(Producto, producto_id) is None:
        raise exceptions.ProductoNoEncontrado()
    receta = db.scalar(select(Receta).where(Receta.producto_id == producto_id))
    if receta is None:
        raise exceptions.ProductoSinReceta()
    return receta


def leer_version(db: Session, version_id: int) -> VersionReceta:
    version = db.get(VersionReceta, version_id)
    if version is None:
        raise exceptions.VersionNoEncontrada()
    return version


def listar_recetas(db: Session, buscar: str = "", mostrar_inactivos: bool = False) -> list[schemas.RecetaDeProducto]:
    query = select(Producto, Receta).outerjoin(Receta, Receta.producto_id == Producto.id).order_by(Producto.nombre)
    if not mostrar_inactivos:
        query = query.where(Producto.activo.is_(True))
    if buscar.strip():
        query = query.where(func.lower(Producto.nombre).contains(buscar.strip().lower()))
    return [
        schemas.RecetaDeProducto(
            producto=producto,
            receta_id=receta.id if receta else None,
            version_vigente=receta.version_vigente if receta else None,
        )
        for producto, receta in db.execute(query).all()
    ]


def listar_recetas_vigentes(db: Session, buscar: str = "") -> list[schemas.RecetaVigente]:
    query = (
        select(Receta)
        .join(Producto, Receta.producto_id == Producto.id)
        .where(Producto.activo.is_(True))
        .order_by(Producto.nombre)
    )
    if buscar.strip():
        query = query.where(func.lower(Producto.nombre).contains(buscar.strip().lower()))
    vigentes = []
    for receta in db.scalars(query):
        version = receta.version_vigente
        if version is None:
            continue
        vigentes.append(
            schemas.RecetaVigente(
                receta_id=receta.id,
                producto=receta.producto,
                version_vigente=version,
                cantidad_ingredientes=sum(1 for renglon in version.renglones if renglon.tipo == TipoInsumo.INGREDIENTE),
                cantidad_pasos=len(version.pasos),
            )
        )
    return vigentes


def listar_versiones(db: Session, receta_id: int) -> list[VersionReceta]:
    return leer_receta(db, receta_id).versiones


def listar_insumos_disponibles(db: Session) -> list[Insumo]:
    return list(db.scalars(select(Insumo).where(Insumo.activo.is_(True)).order_by(Insumo.nombre)))


def _redondear(valor: float) -> float:
    return round(valor, DECIMALES_ESCALADO)


def escalar_receta(
    db: Session, receta_id: int, factor: float | None = None, cantidad_objetivo: float | None = None
) -> schemas.Escalado:
    if (factor is None) == (cantidad_objetivo is None):
        raise exceptions.EscaladoSinParametro()
    receta = leer_receta(db, receta_id)
    version = receta.version_vigente
    if version is None:
        raise exceptions.VersionNoEncontrada()
    factor_aplicado = factor if factor is not None else cantidad_objetivo / version.rendimiento_cantidad
    renglones = []
    for renglon in version.renglones:
        insumo = renglon.insumo
        escalada = renglon.cantidad * factor_aplicado
        en_unidad_stock = convertir(escalada, renglon.unidad_medida, insumo.unidadMedidaObj)
        disponible = insumo.cantidad if insumo.activo else 0.0
        renglones.append(
            schemas.RenglonEscalado(
                insumo=insumo,
                tipo=renglon.tipo,
                aditivo_referencia=renglon.aditivo_referencia,
                unidad_medida=renglon.unidad_medida,
                cantidad_receta=renglon.cantidad,
                cantidad_escalada=_redondear(escalada),
                unidad_stock=insumo.unidadMedidaObj,
                cantidad_en_unidad_stock=_redondear(en_unidad_stock) if en_unidad_stock is not None else None,
                stock_disponible=_redondear(disponible),
                stock_suficiente=(
                    None if en_unidad_stock is None or not insumo.activo else disponible + 1e-9 >= en_unidad_stock
                ),
            )
        )
    rendimiento = version.rendimiento_cantidad * factor_aplicado
    cantidad_lote = convertir(rendimiento, version.rendimiento_unidad, receta.producto.unidad_medida)
    return schemas.Escalado(
        receta_id=receta.id,
        version_id=version.id,
        version_numero=version.numero,
        producto=receta.producto,
        factor=_redondear(factor_aplicado) if factor is None else factor,
        rendimiento_receta=version.rendimiento_cantidad,
        rendimiento_escalado=_redondear(rendimiento),
        rendimiento_unidad=version.rendimiento_unidad,
        cantidad_lote=_redondear(cantidad_lote) if cantidad_lote is not None else None,
        renglones=renglones,
        hay_faltantes=any(not r.insumo.activo or r.stock_suficiente is False for r in renglones),
    )
<<<<<<< HEAD


def _grupo(renglones: list[RenglonReceta], completa: bool) -> schemas.GrupoComposicion:
    filas = [
        schemas.RenglonComposicion(
            renglon_id=renglon.id,
            orden=renglon.orden,
            insumo=renglon.insumo,
            tipo=renglon.tipo,
            aditivo_referencia=renglon.aditivo_referencia,
            cantidad=renglon.cantidad,
            unidad_medida=renglon.unidad_medida,
            gramos=round(renglon.gramos, DECIMALES_ESCALADO) if renglon.gramos is not None else None,
            porcentaje=round(renglon.porcentaje, DECIMALES_PORCENTAJE) if renglon.porcentaje is not None else None,
        )
        for renglon in renglones
    ]
    gramos = [renglon.gramos for renglon in renglones if renglon.gramos is not None]
    return schemas.GrupoComposicion(
        renglones=filas,
        subtotal_gramos=round(sum(gramos), DECIMALES_ESCALADO) if gramos else None,
        subtotal_porcentaje=round(sum(fila.porcentaje for fila in filas), DECIMALES_PORCENTAJE)
        if completa and filas
        else None,
    )


def obtener_composicion(db: Session, version_id: int) -> schemas.Composicion:
    version = leer_version(db, version_id)
    completa = version.composicion_completa
    ingredientes = [r for r in version.renglones if r.tipo == TipoInsumo.INGREDIENTE]
    aditivos = [r for r in version.renglones if r.tipo == TipoInsumo.ADITIVO]
    grupo_ingredientes = _grupo(ingredientes, completa)
    grupo_aditivos = _grupo(aditivos, completa)
    faltantes = []
    for renglon in version.renglones:
        if renglon.gramos is not None:
            continue
        conversion = a_gramos(renglon.cantidad, renglon.unidad_medida, renglon.insumo)
        if conversion.faltante is None:
            continue
        faltantes.append(
            schemas.FaltanteComposicion(
                insumo=renglon.insumo,
                unidad_medida=renglon.unidad_medida,
                equivalencia=conversion.faltante,
                mensaje=mensaje_faltante(conversion.faltante, renglon.insumo, renglon.unidad_medida),
            )
        )
    suma = None
    diferencia = None
    if completa:
        suma = round(
            sum(fila.porcentaje for grupo in (grupo_ingredientes, grupo_aditivos) for fila in grupo.renglones),
            DECIMALES_PORCENTAJE,
        )
        diferencia = round(suma - 100, DECIMALES_PORCENTAJE)
    return schemas.Composicion(
        version_id=version.id,
        receta_id=version.receta_id,
        version_numero=version.numero,
        estado=version.estado,
        completa=completa,
        total_gramos=round(version.composicion_total_gramos, DECIMALES_ESCALADO)
        if version.composicion_total_gramos is not None
        else None,
        calculada_en=version.composicion_calculada_en,
        ingredientes=grupo_ingredientes,
        aditivos=grupo_aditivos,
        suma_porcentajes=suma,
        diferencia=diferencia,
        verificacion_ok=diferencia is not None and abs(diferencia) <= TOLERANCIA_COMPOSICION,
        tolerancia=TOLERANCIA_COMPOSICION,
        faltantes=faltantes,
    )
=======
>>>>>>> dev
