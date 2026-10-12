from datetime import date, timedelta
from typing import List
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from src.equipos.models import Equipo
from src.registroCalibracion import exceptions, schemas
from src.registroCalibracion.models import RegistroCalibracion


def _leer_equipo_activo(db: Session, equipo_id: int) -> Equipo:
    equipo = db.scalar(
        select(Equipo).where(Equipo.id == equipo_id, Equipo.activo == True)
    )
    if equipo is None:
        raise exceptions.EquipoNoEncontrado()
    return equipo


def _calcular_vencimiento(fecha_calibracion: date, periodicidad_dias: int | None) -> date | None:
    if not periodicidad_dias:
        return None
    return fecha_calibracion + timedelta(days=periodicidad_dias)


def _sincronizar_ultima_calibracion(db: Session, equipo: Equipo) -> None:
    ultima = db.scalar(
        select(func.max(RegistroCalibracion.fecha_calibracion)).where(
            RegistroCalibracion.equipo_id == equipo.id,
            RegistroCalibracion.activo == True,
        )
    )
    if ultima is not None:
        equipo.fecha_ultima_calibracion = ultima


def crear_registro(
    db: Session,
    registro: schemas.RegistroCalibracionCreate,
    certificado_path: str,
) -> RegistroCalibracion:
    equipo = _leer_equipo_activo(db, registro.equipo_id)

    db_registro = RegistroCalibracion(
        equipo_id=equipo.id,
        fecha_calibracion=registro.fecha_calibracion,
        otorgado_por=registro.otorgado_por,
        certificado_path=certificado_path,
        fecha_vencimiento_calculada=_calcular_vencimiento(
            registro.fecha_calibracion, equipo.periodicidad_dias
        ),
    )
    db.add(db_registro)
    db.flush()
    _sincronizar_ultima_calibracion(db, equipo)
    db.commit()
    db.refresh(db_registro)
    return db_registro


def listar_registros(db: Session, equipo_id: int | None = None) -> List[RegistroCalibracion]:
    query = select(RegistroCalibracion).where(RegistroCalibracion.activo == True)
    if equipo_id is not None:
        query = query.where(RegistroCalibracion.equipo_id == equipo_id)
    # La más reciente primero
    query = query.order_by(
        RegistroCalibracion.fecha_calibracion.desc(), RegistroCalibracion.id.desc()
    )
    return db.scalars(query).all()


def leer_registro(db: Session, registro_id: int) -> RegistroCalibracion:
    db_registro = db.scalar(
        select(RegistroCalibracion).where(
            RegistroCalibracion.id == registro_id,
            RegistroCalibracion.activo == True,
        )
    )
    if db_registro is None:
        raise exceptions.RegistroCalibracionNoEncontrado()
    return db_registro


def modificar_registro(
    db: Session,
    registro_id: int,
    registro: schemas.RegistroCalibracionUpdate,
    certificado_path: str | None = None,
) -> RegistroCalibracion:
    db_registro = leer_registro(db, registro_id)
    equipo = _leer_equipo_activo(db, db_registro.equipo_id)

    db_registro.fecha_calibracion = registro.fecha_calibracion
    db_registro.otorgado_por = registro.otorgado_por
    db_registro.fecha_vencimiento_calculada = _calcular_vencimiento(
        registro.fecha_calibracion, equipo.periodicidad_dias
    )
    if certificado_path is not None:
        db_registro.certificado_path = certificado_path

    db.flush()
    _sincronizar_ultima_calibracion(db, equipo)
    db.commit()
    db.refresh(db_registro)
    return db_registro


def eliminar_registro(db: Session, registro_id: int) -> RegistroCalibracion:
    db_registro = leer_registro(db, registro_id)
    db_registro.activo = False
    db.flush()

    equipo = db.scalar(select(Equipo).where(Equipo.id == db_registro.equipo_id))
    if equipo is not None:
        _sincronizar_ultima_calibracion(db, equipo)

    db.commit()
    db.refresh(db_registro)
    return db_registro