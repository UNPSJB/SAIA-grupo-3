"""Revisión transaccional de stock: nunca confirma movimientos por su cuenta."""
from functools import wraps
from src.insumos.models import Insumo
from src.insumosQuimicos.models import InsumoQuimico


def revisar(db, insumo):
    from src.notificaciones.services import revisar_stock_insumo
    db.flush()
    db.refresh(insumo)
    return revisar_stock_insumo(db, insumo, confirmar=False)


def revisar_ids(db, modelo, ids):
    for identificador in sorted(set(ids)):
        objeto = db.get(modelo, identificador)
        if objeto is not None:
            revisar(db, objeto)


def revertir_si_falla(funcion):
    @wraps(funcion)
    def ejecutar(db, *args, **kwargs):
        try:
            return funcion(db, *args, **kwargs)
        except Exception:
            db.rollback()
            raise
    return ejecutar