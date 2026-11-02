from datetime import date, timedelta
from uuid import uuid4

import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import func, select

from src.abastecimiento import schemas, services
from src.abastecimiento.models import ConsumoLoteRecepcion, ConsumoStockAnterior, LoteRecepcionInsumo, Proveedor
from src.documentacion.constants import DIAS_AVISO_VENCIMIENTO
from src.documentacion.vencimientos import listar_vencimientos_consolidados
from src.insumos import schemas as insumo_schemas, services as insumo_services
from src.loteProduccion import schemas as produccion_schemas, services as produccion_services
from src.loteProduccion.models import LoteInsumo, LoteProduccion


def recibir(db, insumo, proveedor, persona, **cambios):
    valores = dict(
        insumo_id=insumo.id, proveedor_id=proveedor["id"], numero_lote="HAR-001",
        cantidad=10, fecha_recepcion=date.today() - timedelta(days=2),
        fecha_vencimiento=date.today() + timedelta(days=DIAS_AVISO_VENCIMIENTO), clave_operacion=uuid4(),
    )
    valores.update(cambios)
    datos = schemas.LoteInput(**valores)
    return services.guardar_recepcion(db, datos, persona.id), datos


def producir(db, insumo, persona, producto, cantidad):
    return produccion_services.crear_lote(db, produccion_schemas.LoteProduccionCreate(
        producto_id=producto.id, fecha_produccion=date.today(), cantidad=1,
        insumos=[produccion_schemas.LoteInsumoCreate(insumo_id=insumo.id, cantidad_usada=cantidad)],
    ), persona.id)


def test_crear_proveedor(db_session, datos_proveedor):
    nuevo = services.guardar_proveedor(
        db_session, schemas.ProveedorInput(**datos_proveedor)
    )
    assert nuevo["id"] is not None
    assert nuevo["nombre"] == datos_proveedor["nombre"]
    assert nuevo["cuit"] == "30123456789"
    for campo in ("telefono", "email", "numero_habilitacion"):
        assert nuevo[campo] == datos_proveedor[campo]
    assert nuevo["vencimiento_habilitacion"] == date.fromisoformat(
        datos_proveedor["vencimiento_habilitacion"]
    )
    assert nuevo["activo"] is True


def test_listar_proveedores(db_session, proveedor):
    resultado = services.listar_proveedores(db_session)
    assert resultado["total"] == 1
    assert resultado["items"][0]["id"] == proveedor["id"]


def test_leer_proveedor(db_session, proveedor):
    encontrado = services.obtener(db_session, Proveedor, proveedor["id"])
    assert encontrado.id == proveedor["id"]
    assert encontrado.nombre == proveedor["nombre"]


def test_leer_proveedor_inexistente(db_session):
    with pytest.raises(HTTPException) as error:
        services.obtener(db_session, Proveedor, 999)
    assert error.value.status_code == 404


def test_modificar_proveedor(db_session, proveedor, datos_proveedor):
    datos = schemas.ProveedorInput(
        **{**datos_proveedor, "nombre": "Molino actualizado"}
    )
    actualizado = services.guardar_proveedor(
        db_session, datos, proveedor_id=proveedor["id"]
    )
    assert actualizado["id"] == proveedor["id"]
    assert actualizado["nombre"] == "Molino actualizado"
    assert actualizado["cuit"] == proveedor["cuit"]
    assert services.listar_proveedores(db_session)["total"] == 1


def test_baja_logica_y_reactivacion_proveedor(db_session, proveedor):
    baja = services.cambiar_estado_proveedor(db_session, proveedor["id"], False)
    assert baja["activo"] is False
    assert db_session.get(Proveedor, proveedor["id"]) is not None
    assert services.listar_proveedores(db_session)["total"] == 0
    assert services.listar_proveedores(db_session, mostrar_inactivos=True)["total"] == 1
    reactivado = services.cambiar_estado_proveedor(db_session, proveedor["id"], True)
    assert reactivado["activo"] is True
    assert services.listar_proveedores(db_session)["total"] == 1


def test_modificar_proveedor_con_cuit_duplicado(db_session, proveedor, datos_proveedor):
    otro = services.guardar_proveedor(
        db_session, schemas.ProveedorInput(nombre="Otro proveedor", cuit="30987654321")
    )
    with pytest.raises(HTTPException) as error:
        services.guardar_proveedor(
            db_session, schemas.ProveedorInput(**datos_proveedor), proveedor_id=otro["id"]
        )
    assert error.value.status_code == 409
    assert db_session.get(Proveedor, otro["id"]).cuit == "30987654321"


@pytest.mark.parametrize("activo", [True, False])
def test_cuit_unico_incluso_con_proveedor_inactivo(db_session, proveedor, activo):
    assert proveedor["cuit"] == "30123456789"
    services.cambiar_estado_proveedor(db_session, proveedor["id"], activo)
    with pytest.raises(HTTPException) as error:
        services.guardar_proveedor(db_session, schemas.ProveedorInput(nombre="Duplicado", cuit="30123456789"))
    assert error.value.status_code == 409
    assert services.listar_proveedores(db_session)["total"] == int(activo)
    assert services.listar_proveedores(db_session, mostrar_inactivos=True)["total"] == 1
    services.cambiar_estado_proveedor(db_session, proveedor["id"], True)
    assert services.listar_proveedores(db_session)["total"] == 1


def test_recepcion_es_idempotente_y_guarda_actor(db_session, insumo_activo, proveedor, persona_operadora):
    lote, datos = recibir(db_session, insumo_activo, proveedor, persona_operadora)
    repetido = services.guardar_recepcion(db_session, datos, persona_operadora.id)
    db_session.refresh(insumo_activo)
    assert insumo_activo.cantidad == 60
    assert repetido["id"] == lote["id"]
    assert lote["cantidad_disponible"] == 10
    assert lote["registrado_por_id"] == persona_operadora.id
    with pytest.raises(HTTPException):
        services.guardar_recepcion(db_session, datos.model_copy(update={"cantidad": 11}), persona_operadora.id)
    db_session.refresh(insumo_activo)
    assert insumo_activo.cantidad == 60


def test_no_recibe_de_proveedor_inactivo(db_session, insumo_activo, proveedor, persona_operadora):
    services.cambiar_estado_proveedor(db_session, proveedor["id"], False)
    with pytest.raises(HTTPException) as error:
        recibir(db_session, insumo_activo, proveedor, persona_operadora)
    assert error.value.status_code == 409
    db_session.refresh(insumo_activo)
    assert insumo_activo.cantidad == 50
    assert db_session.scalar(select(func.count()).select_from(LoteRecepcionInsumo)) == 0


@pytest.mark.parametrize("cambio", [
    {"cantidad": 0}, {"cantidad": -1}, {"cantidad": float("inf")},
    {"cantidad": float("nan")}, {"numero_lote": "  "},
    {"fecha_recepcion": date.today() + timedelta(days=1)},
    {"fecha_vencimiento": date.today() - timedelta(days=3)},
])
def test_recepcion_valida_cantidades_y_fechas(db_session, insumo_activo, proveedor, persona_operadora, cambio):
    with pytest.raises(ValidationError):
        recibir(db_session, insumo_activo, proveedor, persona_operadora, **cambio)
    db_session.refresh(insumo_activo)
    assert insumo_activo.cantidad == 50


def test_editar_y_anular_ajustan_stock_sin_borrar_historial(db_session, insumo_activo, proveedor, persona_operadora):
    lote, datos = recibir(db_session, insumo_activo, proveedor, persona_operadora)
    services.guardar_recepcion(db_session, datos.model_copy(update={"cantidad": 15}), persona_operadora.id, lote_id=lote["id"])
    db_session.refresh(insumo_activo)
    assert insumo_activo.cantidad == 65
    services.anular_recepcion(db_session, lote["id"])
    services.anular_recepcion(db_session, lote["id"])
    db_session.refresh(insumo_activo)
    assert insumo_activo.cantidad == 50
    assert services.listar_recepciones(db_session)["total"] == 0
    assert services.listar_recepciones(db_session, mostrar_inactivos=True)["total"] == 1


def test_conciliar_identifica_stock_sin_sumarlo(db_session, insumo_activo, proveedor, persona_operadora):
    _, datos = recibir(db_session, insumo_activo, proveedor, persona_operadora)
    datos = datos.model_copy(update={"cantidad": 20, "clave_operacion": uuid4()})
    lote = services.guardar_recepcion(db_session, datos, persona_operadora.id, conciliacion=True)
    resumen = services.resumen_stock(db_session, insumo_activo.id)
    assert resumen["stock_total"] == 60
    assert resumen["stock_identificado"] == 30
    assert resumen["stock_sin_lote"] == 30
    services.anular_recepcion(db_session, lote["id"])
    assert services.resumen_stock(db_session, insumo_activo.id)["stock_total"] == 60
    with pytest.raises(HTTPException):
        services.guardar_recepcion(db_session, datos.model_copy(update={"cantidad": 100, "clave_operacion": uuid4()}), persona_operadora.id, conciliacion=True)


def test_produccion_consume_fefo_y_descuenta_una_vez(db_session, insumo_activo, proveedor, persona_operadora, producto):
    primero, _ = recibir(db_session, insumo_activo, proveedor, persona_operadora, cantidad=20)
    segundo, _ = recibir(db_session, insumo_activo, proveedor, persona_operadora, cantidad=30, numero_lote="HAR-002", fecha_vencimiento=date.today()+timedelta(days=DIAS_AVISO_VENCIMIENTO + 30))
    produccion = producir(db_session, insumo_activo, persona_operadora, producto, 25)
    db_session.refresh(insumo_activo)
    assert insumo_activo.cantidad == 75
    assert db_session.get(LoteRecepcionInsumo, primero["id"]).cantidad_disponible == 0
    assert db_session.get(LoteRecepcionInsumo, segundo["id"]).cantidad_disponible == 25
    assert db_session.scalar(select(func.sum(ConsumoLoteRecepcion.cantidad))) == 25
    assert services.trazabilidad(db_session, primero["id"])[0]["lote_produccion_id"] == produccion.id
    resumen = services.resumen_stock(db_session, insumo_activo.id)
    assert resumen["stock_total"] == resumen["stock_identificado"] + resumen["stock_sin_lote"]


def test_stock_anterior_bloqueado_aunque_variable_antigua_este_activa(
    db_session, insumo_activo, persona_operadora, producto, monkeypatch
):
    monkeypatch.setenv("PERMITIR_STOCK_SIN_LOTE", "true")
    with pytest.raises(HTTPException) as error:
        producir(db_session, insumo_activo, persona_operadora, producto, 3)
    assert error.value.status_code == 409
    assert insumo_activo.nombre in error.value.detail
    assert db_session.scalar(select(ConsumoStockAnterior)) is None
    db_session.refresh(insumo_activo)
    assert insumo_activo.cantidad == 50


def test_politica_estricta_rechaza_stock_sin_lote(db_session, insumo_activo, persona_operadora, producto):
    with pytest.raises(HTTPException):
        producir(db_session, insumo_activo, persona_operadora, producto, 1)
    assert db_session.scalar(select(func.count()).select_from(LoteProduccion)) == 0
    db_session.refresh(insumo_activo)
    assert insumo_activo.cantidad == 50


def test_saldo_identificado_insuficiente_no_recurre_al_stock_anterior(
    db_session, insumo_activo, proveedor, persona_operadora, producto
):
    lote, _ = recibir(db_session, insumo_activo, proveedor, persona_operadora, cantidad=2)
    with pytest.raises(HTTPException) as error:
        producir(db_session, insumo_activo, persona_operadora, producto, 3)
    assert error.value.status_code == 409
    assert db_session.get(LoteRecepcionInsumo, lote["id"]).cantidad_disponible == 2
    assert db_session.scalar(select(ConsumoLoteRecepcion)) is None
    assert db_session.scalar(select(ConsumoStockAnterior)) is None
    assert db_session.scalar(select(LoteProduccion)) is None
    db_session.refresh(insumo_activo)
    assert insumo_activo.cantidad == 52


def test_identificar_stock_es_idempotente_y_habilita_consumo_trazado(
    db_session, insumo_activo, proveedor, persona_operadora, producto
):
    datos = schemas.LoteInput(
        insumo_id=insumo_activo.id, proveedor_id=proveedor["id"],
        numero_lote="ORIGEN-VERIFICADO", cantidad=10, clave_operacion=uuid4(),
        fecha_recepcion=date.today() - timedelta(days=5),
        fecha_vencimiento=date.today() + timedelta(days=30),
    )
    lote = services.guardar_recepcion(db_session, datos, persona_operadora.id, conciliacion=True)
    repetido = services.guardar_recepcion(db_session, datos, persona_operadora.id, conciliacion=True)
    assert lote["id"] == repetido["id"]
    assert services.resumen_stock(db_session, insumo_activo.id)["stock_total"] == 50
    producir(db_session, insumo_activo, persona_operadora, producto, 4)
    resumen = services.resumen_stock(db_session, insumo_activo.id)
    assert resumen["stock_total"] == 46
    assert resumen["stock_sin_lote"] == 40
    assert resumen["stock_utilizable"] == 6
    assert db_session.scalar(select(ConsumoLoteRecepcion)).lote_recepcion_id == lote["id"]
    assert db_session.scalar(select(ConsumoStockAnterior)) is None


def test_falta_trazabilidad_en_segundo_insumo_revierte_toda_produccion(
    db_session, insumo_activo, unidad_medida, proveedor, persona_operadora, producto
):
    from src.insumos.models import Insumo

    otro = Insumo(nombre="Sal sin identificar", cantidad=10,
                  unidad_medida_id=unidad_medida.id, activo=True)
    db_session.add(otro)
    db_session.commit()
    lote, _ = recibir(db_session, insumo_activo, proveedor, persona_operadora, cantidad=5)
    with pytest.raises(HTTPException) as error:
        produccion_services.crear_lote(db_session, produccion_schemas.LoteProduccionCreate(
            producto_id=producto.id, fecha_produccion=date.today(), cantidad=1,
            insumos=[
                produccion_schemas.LoteInsumoCreate(insumo_id=insumo_activo.id, cantidad_usada=2),
                produccion_schemas.LoteInsumoCreate(insumo_id=otro.id, cantidad_usada=1),
            ],
        ), persona_operadora.id)
    assert error.value.status_code == 409
    assert db_session.get(LoteRecepcionInsumo, lote["id"]).cantidad_disponible == 5
    assert db_session.scalar(select(LoteProduccion)) is None
    assert db_session.scalar(select(LoteInsumo)) is None
    assert db_session.scalar(select(ConsumoLoteRecepcion)) is None
    db_session.refresh(insumo_activo)
    db_session.refresh(otro)
    assert insumo_activo.cantidad == 55
    assert otro.cantidad == 10


@pytest.mark.parametrize("exclusion", ["vencido", "anulado", "posterior"])
def test_lotes_no_elegibles_no_habilitan_consumos(
    db_session, insumo_activo, proveedor, persona_operadora, producto, exclusion
):
    cambios = {"fecha_vencimiento": date.today()-timedelta(days=1)} if exclusion == "vencido" else {}
    lote, _ = recibir(db_session, insumo_activo, proveedor, persona_operadora, **cambios)
    if exclusion == "anulado":
        services.anular_recepcion(db_session, lote["id"])
    fecha = date.today()-timedelta(days=3) if exclusion == "posterior" else date.today()
    with pytest.raises(HTTPException) as error:
        produccion_services.crear_lote(db_session, produccion_schemas.LoteProduccionCreate(
            producto_id=producto.id, fecha_produccion=fecha, cantidad=1,
            insumos=[produccion_schemas.LoteInsumoCreate(insumo_id=insumo_activo.id, cantidad_usada=1)],
        ), persona_operadora.id)
    assert error.value.status_code == 409
    assert db_session.scalar(select(ConsumoLoteRecepcion)) is None
    assert db_session.scalar(select(ConsumoStockAnterior)) is None


def test_historial_sin_trazabilidad_se_conserva_sin_agregar_nuevos_consumos(
    db_session, insumo_activo, persona_operadora, producto
):
    historico = LoteProduccion(codigo="HISTORICO", producto_id=producto.id,
        fecha_produccion=date.today()-timedelta(days=30), cantidad=1,
        registrado_por_id=persona_operadora.id, activo=True)
    db_session.add(historico)
    db_session.flush()
    consumo = ConsumoStockAnterior(lote_produccion_id=historico.id,
                                   insumo_id=insumo_activo.id, cantidad=3)
    db_session.add(consumo)
    db_session.commit()
    consumo_id, historico_id = consumo.id, historico.id
    with pytest.raises(HTTPException):
        producir(db_session, insumo_activo, persona_operadora, producto, 1)
    assert db_session.get(ConsumoStockAnterior, consumo_id).cantidad == 3
    assert db_session.get(LoteProduccion, historico_id) is not None
    assert db_session.scalar(select(func.count()).select_from(ConsumoStockAnterior)) == 1


def test_no_edita_ni_anula_recepcion_consumida(db_session, insumo_activo, proveedor, persona_operadora, producto):
    lote, datos = recibir(db_session, insumo_activo, proveedor, persona_operadora)
    producir(db_session, insumo_activo, persona_operadora, producto, 3)
    with pytest.raises(HTTPException):
        services.guardar_recepcion(db_session, datos, persona_operadora.id, lote_id=lote["id"])
    with pytest.raises(HTTPException):
        services.anular_recepcion(db_session, lote["id"])
    db_session.refresh(insumo_activo)
    assert insumo_activo.cantidad == 57
    assert db_session.get(LoteRecepcionInsumo, lote["id"]).cantidad_disponible == 7


def test_fallo_commit_revierte_produccion_y_saldos(db_session, insumo_activo, proveedor, persona_operadora, producto, monkeypatch):
    lote, _ = recibir(db_session, insumo_activo, proveedor, persona_operadora)
    def fallar():
        raise RuntimeError("Persistencia simulada")
    monkeypatch.setattr(db_session, "commit", fallar)
    with pytest.raises(RuntimeError):
        producir(db_session, insumo_activo, persona_operadora, producto, 3)
    db_session.refresh(insumo_activo)
    assert insumo_activo.cantidad == 60
    assert db_session.get(LoteRecepcionInsumo, lote["id"]).cantidad_disponible == 10
    assert db_session.scalar(select(func.count()).select_from(ConsumoLoteRecepcion)) == 0
    assert db_session.scalar(select(func.count()).select_from(LoteProduccion)) == 0


def test_stock_vencido_no_se_disfraza_de_stock_anterior(db_session, insumo_activo, proveedor, persona_operadora, producto):
    insumo_activo.cantidad = 0
    db_session.commit()
    lote, _ = recibir(db_session, insumo_activo, proveedor, persona_operadora, fecha_vencimiento=date.today()-timedelta(days=1))
    with pytest.raises(HTTPException):
        producir(db_session, insumo_activo, persona_operadora, producto, 1)
    assert services.resumen_stock(db_session, insumo_activo.id)["stock_vencido"] == 10
    assert db_session.get(LoteRecepcionInsumo, lote["id"]).cantidad_disponible == 10


def test_insumo_con_historial_no_admite_cambios_manuales_de_stock(db_session, insumo_activo, proveedor, persona_operadora):
    recibir(db_session, insumo_activo, proveedor, persona_operadora)
    with pytest.raises(HTTPException):
        insumo_services.modificar_insumo(db_session, insumo_activo.id, insumo_schemas.InsumoUpdate(cantidad=200))
    actualizado = insumo_services.modificar_insumo(db_session, insumo_activo.id, insumo_schemas.InsumoUpdate(nombre="Harina renombrada"))
    assert actualizado.nombre == "Harina renombrada"
    assert actualizado.cantidad == 60


def test_filtros_y_vencimientos_incluyen_lotes_y_habilitaciones(db_session, insumo_activo, proveedor, persona_operadora):
    recibir(db_session, insumo_activo, proveedor, persona_operadora)
    assert services.listar_recepciones(db_session, insumo_id=insumo_activo.id, proveedor_id=proveedor["id"], fecha_desde=date.today()-timedelta(days=2), fecha_hasta=date.today(), estado="por_vencer")["total"] == 1
    assert services.listar_recepciones(db_session, proveedor_id=999)["total"] == 0
    for orden in ["elemento", "fecha_vencimiento"]:
        filas = listar_vencimientos_consolidados(db_session, solo_alertas=True, ordenar_por=orden)["items"]
        assert {fila["origen"] for fila in filas} == {"lote_insumo", "habilitacion_proveedor"}
    assert listar_vencimientos_consolidados(db_session, origen="lote_insumo", buscar="HAR-001")["total"] == 1


@pytest.mark.parametrize(
    ("filtro", "esperado"),
    [("insumo", 1), ("proveedor", 1), ("fecha_incluida", 1),
     ("otro_insumo", 0), ("otro_proveedor", 0), ("fecha_excluida", 0)],
)
def test_listar_lotes_con_filtros(db_session, lote, filtro, esperado):
    fecha = lote["fecha_recepcion"]
    parametros = {
        "insumo": {"insumo_id": lote["insumo_id"]},
        "proveedor": {"proveedor_id": lote["proveedor_id"]},
        "fecha_incluida": {"fecha_desde": fecha, "fecha_hasta": fecha},
        "otro_insumo": {"insumo_id": lote["insumo_id"] + 1},
        "otro_proveedor": {"proveedor_id": lote["proveedor_id"] + 1},
        "fecha_excluida": {"fecha_desde": fecha + timedelta(days=1)},
    }[filtro]
    resultado = services.listar_recepciones(db_session, **parametros)
    assert resultado["total"] == esperado
    assert [item["id"] for item in resultado["items"]] == (
        [lote["id"]] if esperado else []
    )


@pytest.mark.parametrize(
    ("desplazamiento", "estado"),
    [(-1, "vencido"), (0, "por_vencer"),
     (DIAS_AVISO_VENCIMIENTO, "por_vencer"),
     (DIAS_AVISO_VENCIMIENTO + 1, "vigente")],
)
def test_estado_de_vencimiento_del_lote(
    db_session, insumo_activo, proveedor, persona_operadora, desplazamiento, estado
):
    lote, _ = recibir(
        db_session, insumo_activo, proveedor, persona_operadora,
        fecha_vencimiento=date.today() + timedelta(days=desplazamiento),
    )
    assert lote["estado_vencimiento"] == estado
    resultado = services.listar_recepciones(db_session, estado=estado)
    assert resultado["total"] == 1
    assert resultado["items"][0]["id"] == lote["id"]


@pytest.mark.parametrize("buscar,esperado", [
    ("HARINA", 1), ("molino", 1), ("  har-001  ", 1), ("  ", 1),
    ("inexistente", 0), ("%", 0), ("_", 0),
])
def test_busqueda_recepciones_por_insumo_proveedor_o_lote(db_session, lote, buscar, esperado):
    resultado = services.listar_recepciones(db_session, buscar=buscar)
    assert resultado["total"] == esperado
    assert [r["id"] for r in resultado["items"]] == ([lote["id"]] if esperado else [])


def test_busqueda_se_aplica_antes_de_paginar_y_combina_filtros(
    db_session, insumo_activo, proveedor, persona_operadora
):
    recibir(db_session, insumo_activo, proveedor, persona_operadora)
    segundo, _ = recibir(db_session, insumo_activo, proveedor, persona_operadora, numero_lote="BUSCADO-002")
    filtros = dict(buscar="buscado", size=1, insumo_id=insumo_activo.id,
                   proveedor_id=proveedor["id"], estado="por_vencer",
                   fecha_desde=date.today()-timedelta(days=2), fecha_hasta=date.today())
    resultado = services.listar_recepciones(db_session, **filtros)
    assert resultado["total"] == 1
    assert resultado["pages"] == 1
    assert resultado["items"][0]["id"] == segundo["id"]
    assert services.listar_recepciones(db_session, **{**filtros, "estado": "vencido"})["total"] == 0
    services.anular_recepcion(db_session, segundo["id"])
    assert services.listar_recepciones(db_session, **filtros)["total"] == 0
    assert services.listar_recepciones(db_session, **filtros, mostrar_inactivos=True)["total"] == 1
