from datetime import date, timedelta

from src.consumoQuimico.schemas import ConsumoQuimicoCreate
from src.consumoQuimico.services import crear_consumo
from src.insumosQuimicos.models import InsumoQuimico, TipoQuimico

HOY = date.today()
HACE_5_DIAS = HOY - timedelta(days=5)
HACE_10_DIAS = HOY - timedelta(days=10)
MANANA = HOY + timedelta(days=1)


def crear_quimico(db_session, unidad_medida, nombre, cantidad):
    quimico = InsumoQuimico(
        nombre=nombre,
        cantidad=cantidad,
        tipo_quimico=TipoQuimico.DETERGENTE,
        unidad_medida_id=unidad_medida.id,
        activo=True,
    )
    db_session.add(quimico)
    db_session.commit()
    db_session.refresh(quimico)
    return quimico


def registrar(db_session, quimico, cantidad, tarea="Limpieza de mesadas", fecha=HOY):
    return crear_consumo(db_session, ConsumoQuimicoCreate(
        insumo_quimico_id=quimico.id,
        cantidad_utilizada=cantidad,
        fecha=fecha,
        tarea_limpieza=tarea,
    ))


def stock(db_session, quimico):
    db_session.expire_all()
    return db_session.get(InsumoQuimico, quimico.id).cantidad
