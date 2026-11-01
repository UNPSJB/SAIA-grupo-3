from datetime import date

import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import sessionmaker

from scripts import seed_all as seed
from scripts import seed_personal
from src.abastecimiento.models import (
    Proveedor, LoteRecepcionInsumo, ConsumoLoteRecepcion, ConsumoStockAnterior,
)
from src.documentacion.vencimientos import calcular_estado
from src.insumos.models import Insumo
from src.loteProduccion.models import LoteInsumo, LoteProduccion
from src.loteProduccion.schemas import LoteInsumoCreate, LoteProduccionCreate
from src.loteProduccion.services import crear_lote
from src.models import ModeloBase
from src.personal.models import Personal
from src.producto.models import Producto
from tests.database import db_session  # noqa: F401


@pytest.fixture
def ejecutar_seed(db_session, tmp_path, monkeypatch):
    monkeypatch.setattr(seed, "UPLOADS_DIR", tmp_path / "almacenamiento" / "evidencias")
    monkeypatch.setattr(seed, "ARCHIVOS_DIR", tmp_path / "almacenamiento" / "documentos_tecnicos")
    monkeypatch.setattr(seed_personal, "get_password_hash", lambda password: "hash-demo-sin-autenticacion")
    motor = db_session.get_bind()
    fabrica = sessionmaker(bind=motor, autoflush=False)

    def ejecutar():
        db_session.commit()
        seed.cargar_seed(session_factory=fabrica, db_engine=motor, hoy=date.today())
        db_session.expire_all()

    return ejecutar


def conteos(db):
    return {
        m.class_.__name__: db.scalar(select(func.count()).select_from(m.class_))
        for m in ModeloBase.registry.mappers
    }


def saldos(db):
    return {
        "insumos": {i.id: i.cantidad for i in db.scalars(select(Insumo))},
        "recepciones": {
            r.id: (r.cantidad, r.cantidad_disponible, r.activo, r.fecha_recepcion, r.fecha_vencimiento)
            for r in db.scalars(select(LoteRecepcionInsumo))
        },
    }


def test_seed_carga_todas_las_tablas_y_escenarios_de_abastecimiento(db_session, ejecutar_seed):
    ejecutar_seed()
    for modelo in [Proveedor, LoteRecepcionInsumo, ConsumoLoteRecepcion, ConsumoStockAnterior]:
        assert db_session.scalar(select(func.count()).select_from(modelo)) >= seed.CANTIDAD

    proveedores = db_session.scalars(select(Proveedor)).all()
    assert len({p.cuit for p in proveedores}) == 15
    assert sum(not p.activo for p in proveedores) == 2
    assert {calcular_estado(p.vencimiento_habilitacion, date.today()).value for p in proveedores} == {"vencido", "por_vencer", "vigente"}

    recepciones = db_session.scalars(select(LoteRecepcionInsumo)).all()
    assert any(not r.activo for r in recepciones)
    assert any(r.activo and r.cantidad_disponible == 0 for r in recepciones)
    assert any(0 < r.cantidad_disponible < r.cantidad for r in recepciones)
    assert {calcular_estado(r.fecha_vencimiento, date.today()).value for r in recepciones} == {"vencido", "por_vencer", "vigente"}
    for recepcion in recepciones:
        assert 0 <= recepcion.cantidad_disponible <= recepcion.cantidad
        assert recepcion.fecha_recepcion <= recepcion.fecha_vencimiento
        assert db_session.get(Personal, recepcion.registrado_por_id) is not None

    for insumo in db_session.scalars(select(Insumo).where(Insumo.nombre.contains("DEMO abastecimiento"))):
        identificado = sum(r.cantidad_disponible for r in recepciones if r.insumo_id == insumo.id and r.activo)
        if insumo.nombre.startswith("Agua de amasado sin lote"):
            assert identificado == 0
            assert insumo.cantidad == pytest.approx(11)
        else:
            assert insumo.cantidad == pytest.approx(identificado)


def test_consumos_del_seed_conservan_cantidades_y_fechas_de_origen(db_session, ejecutar_seed):
    ejecutar_seed()
    for asociacion in db_session.scalars(select(LoteInsumo)):
        recibidos = db_session.execute(
            select(ConsumoLoteRecepcion, LoteRecepcionInsumo)
            .join(LoteRecepcionInsumo, LoteRecepcionInsumo.id == ConsumoLoteRecepcion.lote_recepcion_id)
            .where(ConsumoLoteRecepcion.lote_produccion_id == asociacion.lote_id,
                   LoteRecepcionInsumo.insumo_id == asociacion.insumo_id)
        ).all()
        anterior = db_session.scalar(select(func.sum(ConsumoStockAnterior.cantidad)).where(
            ConsumoStockAnterior.lote_produccion_id == asociacion.lote_id,
            ConsumoStockAnterior.insumo_id == asociacion.insumo_id,
        )) or 0
        assert sum(c.cantidad for c, _ in recibidos) + anterior == pytest.approx(asociacion.cantidad_usada)
        produccion = db_session.get(LoteProduccion, asociacion.lote_id)
        for _, recepcion in recibidos:
            assert recepcion.fecha_recepcion <= produccion.fecha_produccion <= recepcion.fecha_vencimiento


def test_fallo_en_ultimo_modulo_revierte_toda_la_carga(
    db_session, ejecutar_seed, monkeypatch
):
    cantidades_antes = conteos(db_session)

    def fallar(*args, **kwargs):
        raise RuntimeError("Fallo simulado en abastecimiento")

    monkeypatch.setattr(seed, "cargar_abastecimiento_demo", fallar)

    with pytest.raises(RuntimeError, match="Fallo simulado en abastecimiento"):
        ejecutar_seed()

    db_session.expire_all()
    assert conteos(db_session) == cantidades_antes


def test_repetir_seed_no_duplica_ni_reinicia_stock_o_estados(db_session, ejecutar_seed):
    ejecutar_seed()
    insumo = db_session.scalar(select(Insumo).where(Insumo.nombre == "Harina de trigo · DEMO abastecimiento"))
    producto = db_session.scalar(select(Producto).where(Producto.nombre == "Pan francés · DEMO abastecimiento"))
    admin = db_session.scalar(select(Personal).where(Personal.username == "admin"))
    crear_lote(db_session, LoteProduccionCreate(
        producto_id=producto.id, fecha_produccion=date.today(), cantidad=1,
        insumos=[LoteInsumoCreate(insumo_id=insumo.id, cantidad_usada=1)],
    ), admin.id)
    proveedor = db_session.scalar(select(Proveedor).order_by(Proveedor.id))
    proveedor.activo = False
    db_session.commit()
    proveedor_id = proveedor.id
    cantidades_antes, saldos_antes = conteos(db_session), saldos(db_session)

    ejecutar_seed()

    assert conteos(db_session) == cantidades_antes
    assert saldos(db_session) == saldos_antes
    assert db_session.get(Proveedor, proveedor_id).activo is False
