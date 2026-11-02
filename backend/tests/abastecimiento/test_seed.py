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
from scripts.seed_productos import PRODUCTOS
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
    for modelo in [Proveedor, LoteRecepcionInsumo, ConsumoLoteRecepcion]:
        assert db_session.scalar(select(func.count()).select_from(modelo)) >= seed.CANTIDAD
    assert db_session.scalar(select(func.count()).select_from(ConsumoStockAnterior)) == 0

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
        assert anterior == 0
        assert sum(c.cantidad for c, _ in recibidos) == pytest.approx(asociacion.cantidad_usada)
        produccion = db_session.get(LoteProduccion, asociacion.lote_id)
        for _, recepcion in recibidos:
            assert recepcion.fecha_recepcion <= produccion.fecha_produccion <= recepcion.fecha_vencimiento


def test_primera_recepcion_muestra_produccion_anterior_al_vencimiento(db_session, ejecutar_seed):
    from src.abastecimiento.services import trazabilidad

    ejecutar_seed()
    recepcion = db_session.scalar(select(LoteRecepcionInsumo).where(
        LoteRecepcionInsumo.numero_lote == "DEMO-REC-001"))
    filas = trazabilidad(db_session, recepcion.id)
    assert len(filas) == 1
    assert filas[0]["codigo"] == "L-ABAST-HIST-001"
    assert filas[0]["producto"] == "Pan francés · DEMO abastecimiento"
    assert filas[0]["cantidad_utilizada"] == pytest.approx(1)
    assert recepcion.fecha_recepcion <= filas[0]["fecha_produccion"] < recepcion.fecha_vencimiento
    assert recepcion.cantidad_disponible == pytest.approx(49)

    cantidades_antes, saldos_antes = conteos(db_session), saldos(db_session)
    ejecutar_seed()
    assert trazabilidad(db_session, recepcion.id) == filas
    assert conteos(db_session) == cantidades_antes
    assert saldos(db_session) == saldos_antes


def test_todos_los_productos_demo_tienen_lote_y_trazabilidad_con_proveedor(
    db_session, ejecutar_seed
):
    ejecutar_seed()

    for nombre, _, _ in PRODUCTOS:
        producto = db_session.scalar(
            select(Producto).where(Producto.nombre == nombre)
        )
        assert producto is not None
        lote = db_session.scalar(
            select(LoteProduccion).where(
                LoteProduccion.codigo.like("L-SEED-%"),
                LoteProduccion.producto_id == producto.id,
            )
        )
        assert lote is not None, f"{nombre} no tiene lote de producción demo"

        asociaciones = db_session.scalars(
            select(LoteInsumo).where(LoteInsumo.lote_id == lote.id)
        ).all()
        assert asociaciones, f"{nombre} no tiene insumos asociados"

        for asociacion in asociaciones:
            consumos = db_session.execute(
                select(ConsumoLoteRecepcion, LoteRecepcionInsumo, Proveedor)
                .join(
                    LoteRecepcionInsumo,
                    LoteRecepcionInsumo.id == ConsumoLoteRecepcion.lote_recepcion_id,
                )
                .join(Proveedor, Proveedor.id == LoteRecepcionInsumo.proveedor_id)
                .where(
                    ConsumoLoteRecepcion.lote_produccion_id == lote.id,
                    LoteRecepcionInsumo.insumo_id == asociacion.insumo_id,
                )
            ).all()
            cantidad_trazada = sum(consumo.cantidad for consumo, _, _ in consumos)
            assert cantidad_trazada == pytest.approx(asociacion.cantidad_usada)
            assert consumos
            assert all(proveedor.nombre for _, _, proveedor in consumos)


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


def test_seed_completa_origen_demo_antiguo_sin_repetir_descuentos(
    db_session, ejecutar_seed
):
    # Simula un consumo del seed viejo sin fuente identificada.
    ejecutar_seed()
    historico = db_session.scalar(select(LoteProduccion).where(
        LoteProduccion.codigo == "L-ABAST-SEED-001"))
    asociaciones = db_session.scalars(select(LoteInsumo).where(
        LoteInsumo.lote_id == historico.id)).all()
    agua = next(a for a in asociaciones if "Agua" in a.insumo.nombre)
    origen = db_session.scalar(select(ConsumoLoteRecepcion).join(
        LoteRecepcionInsumo,
        LoteRecepcionInsumo.id == ConsumoLoteRecepcion.lote_recepcion_id,
    ).where(ConsumoLoteRecepcion.lote_produccion_id == historico.id,
            LoteRecepcionInsumo.insumo_id == agua.insumo_id))
    db_session.delete(origen)
    consumo = ConsumoStockAnterior(lote_produccion_id=historico.id,
                                  insumo_id=agua.insumo_id, cantidad=agua.cantidad_usada)
    db_session.add(consumo)
    db_session.commit()
    consumo_id = consumo.id
    asociaciones_antes = {a.insumo_id: a.cantidad_usada for a in asociaciones}
    antes, saldos_antes = conteos(db_session), saldos(db_session)

    ejecutar_seed()

    despues = conteos(db_session)
    assert despues["LoteProduccion"] == antes["LoteProduccion"]
    assert despues["LoteInsumo"] == antes["LoteInsumo"]
    assert db_session.get(ConsumoStockAnterior, consumo_id) is None
    assert saldos(db_session)["insumos"] == saldos_antes["insumos"]
    recepciones_ahora = saldos(db_session)["recepciones"]
    assert all(recepciones_ahora[k] == v for k, v in saldos_antes["recepciones"].items())
    assert {a.insumo_id: a.cantidad_usada for a in historico.insumos_asociados} == asociaciones_antes
    reparada = db_session.scalar(select(LoteRecepcionInsumo).where(
        LoteRecepcionInsumo.numero_lote.like("DEMO-HIST-%")))
    assert reparada.cantidad_disponible == 0
    assert reparada.cantidad == agua.cantidad_usada
    assert reparada.proveedor.nombre.startswith("DEMO -")
    assert reparada.fecha_recepcion <= historico.fecha_produccion <= reparada.fecha_vencimiento
    cantidades_reparadas, saldos_reparados = conteos(db_session), saldos(db_session)
    ejecutar_seed()
    assert conteos(db_session) == cantidades_reparadas
    assert saldos(db_session) == saldos_reparados


def test_seed_completa_lote_canonico_del_seed_viejo(db_session, ejecutar_seed):
    ejecutar_seed()
    lote = db_session.scalar(select(LoteProduccion).where(LoteProduccion.codigo == "L-SEED-001"))
    from src.loteProduccion.services import trazabilidad_lote_produccion

    fuentes = db_session.scalars(select(ConsumoLoteRecepcion).where(
        ConsumoLoteRecepcion.lote_produccion_id == lote.id)).all()
    for fuente in fuentes:
        db_session.delete(fuente)
    db_session.commit()
    saldos_antes = saldos(db_session)
    antes = [(a.insumo_id, a.cantidad_usada) for a in lote.insumos_asociados]

    ejecutar_seed()

    datos = trazabilidad_lote_produccion(db_session, lote.id)
    assert datos["insumos"]
    for insumo in datos["insumos"]:
        assert insumo["cantidad_historica_sin_origen"] == pytest.approx(0)
        assert insumo["cantidad_stock_anterior"] == 0
        assert sum(r["cantidad_utilizada"] for r in insumo["lotes_recepcion"]) == pytest.approx(insumo["cantidad_usada"])
        assert all(r["proveedor_nombre"] and r["numero_lote"] and r["fecha_vencimiento"]
                   for r in insumo["lotes_recepcion"])
    assert [(a.insumo_id, a.cantidad_usada) for a in lote.insumos_asociados] == antes
    assert saldos(db_session)["insumos"] == saldos_antes["insumos"]


def test_seed_no_asigna_proveedores_demo_a_producciones_reales(db_session, ejecutar_seed):
    ejecutar_seed()
    original = db_session.scalar(select(LoteProduccion).where(LoteProduccion.codigo == "L-SEED-001"))
    real = LoteProduccion(codigo="PRODUCCION-REAL-ANTERIOR", producto_id=original.producto_id,
        fecha_produccion=original.fecha_produccion, cantidad=10,
        registrado_por_id=original.registrado_por_id, activo=True)
    db_session.add(real)
    db_session.flush()
    insumo_id = original.insumos_asociados[0].insumo_id
    db_session.add(LoteInsumo(lote_id=real.id, insumo_id=insumo_id, cantidad_usada=1))
    db_session.add(ConsumoStockAnterior(lote_produccion_id=real.id, insumo_id=insumo_id, cantidad=1))
    db_session.commit()
    real_id = real.id
    antes, saldos_antes = conteos(db_session), saldos(db_session)

    ejecutar_seed()

    assert conteos(db_session) == antes
    assert saldos(db_session) == saldos_antes
    assert db_session.scalar(select(ConsumoLoteRecepcion).where(
        ConsumoLoteRecepcion.lote_produccion_id == real_id)) is None
    assert db_session.scalar(select(ConsumoStockAnterior).where(
        ConsumoStockAnterior.lote_produccion_id == real_id)).cantidad == 1


def test_seed_completa_receta_ausente_de_ejemplo_antiguo(db_session, ejecutar_seed):
    ejecutar_seed()
    lote = db_session.scalar(select(LoteProduccion).where(LoteProduccion.codigo == "L-SEED-015"))
    fuentes = db_session.scalars(select(ConsumoLoteRecepcion).where(
        ConsumoLoteRecepcion.lote_produccion_id == lote.id)).all()
    for fuente in fuentes:
        recepcion = db_session.get(LoteRecepcionInsumo, fuente.lote_recepcion_id)
        recepcion.cantidad_disponible += fuente.cantidad
        db_session.get(Insumo, recepcion.insumo_id).cantidad += fuente.cantidad
        db_session.delete(fuente)
    for asociacion in list(lote.insumos_asociados):
        db_session.delete(asociacion)
    db_session.commit()

    ejecutar_seed()

    db_session.refresh(lote)
    assert lote.insumos_asociados
    for asociacion in lote.insumos_asociados:
        trazado = db_session.scalar(select(func.sum(ConsumoLoteRecepcion.cantidad))
            .join(LoteRecepcionInsumo,
                  LoteRecepcionInsumo.id == ConsumoLoteRecepcion.lote_recepcion_id)
            .where(ConsumoLoteRecepcion.lote_produccion_id == lote.id,
                   LoteRecepcionInsumo.insumo_id == asociacion.insumo_id))
        assert trazado == pytest.approx(asociacion.cantidad_usada)
    cantidades_antes, saldos_antes = conteos(db_session), saldos(db_session)
    ejecutar_seed()
    assert conteos(db_session) == cantidades_antes
    assert saldos(db_session) == saldos_antes


def test_seed_no_sobrescribe_codigo_demo_reutilizado(db_session, ejecutar_seed):
    ejecutar_seed()
    lote = db_session.scalar(select(LoteProduccion).where(LoteProduccion.codigo == "L-SEED-001"))
    otro_producto = db_session.scalar(select(Producto).where(Producto.id != lote.producto_id))
    lote.producto_id = otro_producto.id
    db_session.commit()
    producto_id = lote.producto_id
    antes, saldos_antes = conteos(db_session), saldos(db_session)
    with pytest.raises(RuntimeError, match="ocupado por otro registro"):
        ejecutar_seed()
    assert conteos(db_session) == antes
    assert saldos(db_session) == saldos_antes
    assert db_session.get(LoteProduccion, lote.id).producto_id == producto_id
