from datetime import date, timedelta
from uuid import uuid4

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy import func, select

from src.abastecimiento import schemas, services
from src.abastecimiento.models import ConsumoLoteRecepcion, ConsumoStockAnterior, LoteRecepcionInsumo
from src.abastecimiento.router import router
from src.auth.utils import create_access_token
from src.config import settings
from src.database import get_db
from src.documentacion.constants import DIAS_AVISO_VENCIMIENTO
from src.documentacion.vencimientos import listar_vencimientos_consolidados
from src.insumos import schemas as insumo_schemas, services as insumo_services
from src.loteProduccion import schemas as produccion_schemas, services as produccion_services
from src.loteProduccion.models import LoteProduccion
from tests.database import (  # noqa: F401
    db_session, insumo_activo, persona_operadora, persona_sin_permisos,
    producto, unidad_medida,
)


@pytest.fixture
def proveedor(db_session):
    return services.guardar_proveedor(db_session, schemas.ProveedorInput(
        nombre="Molino de prueba", cuit="30-12345678-9",
        numero_habilitacion="HAB-PRUEBA",
        vencimiento_habilitacion=date.today() + timedelta(days=DIAS_AVISO_VENCIMIENTO),
    ))


def recibir(db, insumo, proveedor, persona, **cambios):
    valores = dict(
        insumo_id=insumo.id, proveedor_id=proveedor["id"], numero_lote="HAR-001",
        cantidad=10, fecha_recepcion=date.today() - timedelta(days=2),
        fecha_vencimiento=date.today() + timedelta(days=5), clave_operacion=uuid4(),
    )
    valores.update(cambios)
    datos = schemas.LoteInput(**valores)
    return services.guardar_recepcion(db, datos, persona.id), datos


def producir(db, insumo, persona, producto, cantidad):
    return produccion_services.crear_lote(db, produccion_schemas.LoteProduccionCreate(
        producto_id=producto.id, fecha_produccion=date.today(), cantidad=1,
        insumos=[produccion_schemas.LoteInsumoCreate(insumo_id=insumo.id, cantidad_usada=cantidad)],
    ), persona.id)


def test_cuit_unico_incluso_con_proveedor_inactivo(db_session, proveedor):
    assert proveedor["cuit"] == "30123456789"
    services.cambiar_estado_proveedor(db_session, proveedor["id"], False)
    with pytest.raises(HTTPException) as error:
        services.guardar_proveedor(db_session, schemas.ProveedorInput(nombre="Duplicado", cuit="30123456789"))
    assert error.value.status_code == 409
    assert services.listar_proveedores(db_session)["total"] == 0
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
    segundo, _ = recibir(db_session, insumo_activo, proveedor, persona_operadora, cantidad=30, numero_lote="HAR-002", fecha_vencimiento=date.today()+timedelta(days=30))
    produccion = producir(db_session, insumo_activo, persona_operadora, producto, 25)
    db_session.refresh(insumo_activo)
    assert insumo_activo.cantidad == 75
    assert db_session.get(LoteRecepcionInsumo, primero["id"]).cantidad_disponible == 0
    assert db_session.get(LoteRecepcionInsumo, segundo["id"]).cantidad_disponible == 25
    assert db_session.scalar(select(func.sum(ConsumoLoteRecepcion.cantidad))) == 25
    assert services.trazabilidad(db_session, primero["id"])[0]["lote_produccion_id"] == produccion.id
    resumen = services.resumen_stock(db_session, insumo_activo.id)
    assert resumen["stock_total"] == resumen["stock_identificado"] + resumen["stock_sin_lote"]


def test_stock_anterior_se_registra_sin_inventar_proveedor(db_session, insumo_activo, persona_operadora, producto, monkeypatch):
    monkeypatch.setattr(settings, "PERMITIR_STOCK_SIN_LOTE", True)
    produccion = producir(db_session, insumo_activo, persona_operadora, producto, 3)
    consumo = db_session.scalar(select(ConsumoStockAnterior))
    assert consumo.cantidad == 3
    assert consumo.lote_produccion_id == produccion.id
    db_session.refresh(insumo_activo)
    assert insumo_activo.cantidad == 47


def test_politica_estricta_rechaza_stock_sin_lote(db_session, insumo_activo, persona_operadora, producto, monkeypatch):
    monkeypatch.setattr(settings, "PERMITIR_STOCK_SIN_LOTE", False)
    with pytest.raises(HTTPException):
        producir(db_session, insumo_activo, persona_operadora, producto, 1)
    assert db_session.scalar(select(func.count()).select_from(LoteProduccion)) == 0
    db_session.refresh(insumo_activo)
    assert insumo_activo.cantidad == 50


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


def test_endpoints_exigen_admin_y_guardan_actor_autenticado(db_session, insumo_activo, persona_operadora):
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_db] = lambda: db_session
    token_operador = create_access_token(persona_operadora)
    with TestClient(app) as client:
        assert client.get("/proveedores/").status_code == 401
        assert client.post("/proveedores/", json={"nombre":"Molino","cuit":"30123456789"}, headers={"Authorization":f"Bearer {token_operador}"}).status_code == 403
        persona_operadora.administrar = True
        db_session.commit()
        token_admin = create_access_token(persona_operadora)
        headers = {"Authorization":f"Bearer {token_admin}"}
        respuesta = client.post("/proveedores/", json={"nombre":"Molino","cuit":"30123456789"}, headers=headers)
        assert respuesta.status_code == 200, respuesta.text
        payload = dict(insumo_id=insumo_activo.id,proveedor_id=respuesta.json()["id"],numero_lote="API-001",cantidad=2,fecha_recepcion=date.today().isoformat(),fecha_vencimiento=(date.today()+timedelta(days=3)).isoformat(),clave_operacion=str(uuid4()))
        recibida = client.post("/lotes-insumo/", json=payload, headers=headers)
        assert recibida.status_code == 200, recibida.text
        assert recibida.json()["registrado_por_id"] == persona_operadora.id
        assert client.get("/lotes-insumo/?proveedor_id="+str(respuesta.json()["id"]),headers=headers).json()["total"] == 1
