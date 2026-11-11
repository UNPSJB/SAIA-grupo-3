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
from src.unidadMedida.models import UnidadMedida

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


def listar_insumos_disponibles(db: Session) -> list[Insumo]:
    return list(db.scalars(select(Insumo).where(Insumo.activo.is_(True)).order_by(Insumo.nombre)))
