from datetime import date
from datetime import timedelta
from uuid import uuid4

from src.abastecimiento.models import ConsumoLoteRecepcion, LoteRecepcionInsumo
from tests.stock_trazable import identificar_stock
from sqlalchemy import select

from tests.database import (
    client,
    headers_administradora,
    headers_operadora,
    headers_sin_permisos,
    insumo_activo,
    insumo_inactivo,
    lote_recepcion,
    otro_insumo_activo,
    persona_administradora,
    persona_operadora,
    persona_sin_permisos,
    producto,
    proveedor_activo,
    db_session,
    unidad_medida,
)


def test_endpoint_registrar_lote_con_insumos(
    client,
    db_session,
    persona_operadora,
    headers_operadora,
    producto,
    insumo_activo,
    otro_insumo_activo,
):
    lotes = identificar_stock(db_session, persona_operadora, insumo_activo, otro_insumo_activo)
    # Act
    respuesta = client.post(
        "/lotes-produccion/",
        headers=headers_operadora,
        json={
            "producto_id": producto.id,
            "fecha_produccion": date.today().isoformat(),
            "cantidad": 12.5,
            "insumos": [
                {
                    "insumo_id": insumo_activo.id,
                    "cantidad_usada": 2.5,
                    "lotes_recepcion": [
                        {
                            "lote_recepcion_id": lotes[insumo_activo.id],
                            "cantidad": 2.5,
                        }
                    ],
                },
                {
                    "insumo_id": otro_insumo_activo.id,
                    "cantidad_usada": 1.25,
                    "lotes_recepcion": [
                        {
                            "lote_recepcion_id": lotes[otro_insumo_activo.id],
                            "cantidad": 1.25,
                        }
                    ],
                },
            ],
        },
    )
    assert respuesta.status_code == 200
    datos = respuesta.json()

    # Assert
    detalles = {
        asociado["insumo_id"]: asociado
        for asociado in datos["insumos_asociados"]
    }
    assert {
        insumo_id: asociado["cantidad_usada"] for insumo_id, asociado in detalles.items()
    } == {
        insumo_activo.id: 2.5,
        otro_insumo_activo.id: 1.25,
    }
    assert detalles[insumo_activo.id]["insumo"]["unidadMedidaObj"]["sufijo"] == "kg"
    assert "cantidad" not in detalles[insumo_activo.id]["insumo"]


def test_endpoint_listar_insumos_disponibles_solo_activos(
    client,
    headers_operadora,
    insumo_activo,
    insumo_inactivo,
):
    # Act
    respuesta = client.get(
        "/lotes-produccion/insumos-disponibles",
        headers=headers_operadora,
    )
    datos = respuesta.json()

    # Assert
    assert respuesta.status_code == 200
    assert [insumo["id"] for insumo in datos] == [insumo_activo.id]
    assert datos[0]["nombre"] == "Harina"
    assert datos[0]["cantidad"] == 0
    assert datos[0]["unidadMedidaObj"]["sufijo"] == "kg"


def test_endpoint_lista_lotes_utilizables_ordenados_por_vencimiento_proximo(
    client,
    headers_operadora,
    insumo_activo,
    lote_recepcion,
    db_session,
    persona_administradora,
):
    segundo = LoteRecepcionInsumo(
        insumo_id=insumo_activo.id,
        proveedor_id=lote_recepcion.proveedor_id,
        numero_lote="HAR-TRAZA-002",
        cantidad=10,
        cantidad_disponible=10,
        fecha_recepcion=date.today() - timedelta(days=2),
        fecha_vencimiento=date.today() + timedelta(days=60),
        registrado_por_id=persona_administradora.id,
        activo=True,
        conciliacion=False,
        clave_operacion=str(uuid4()),
    )
    db_session.add(segundo)
    db_session.commit()

    respuesta = client.get(
        f"/lotes-produccion/insumos/{insumo_activo.id}/lotes-disponibles",
        params={"fecha_produccion": date.today().isoformat()},
        headers=headers_operadora,
    )

    assert respuesta.status_code == 200
    assert [lote["id"] for lote in respuesta.json()] == [
        lote_recepcion.id,
        segundo.id,
    ]
    assert respuesta.json()[0]["es_vencimiento_proximo"] is True
    assert respuesta.json()[1]["es_vencimiento_proximo"] is False


def test_endpoint_registra_consumo_distribuido_manualmente_entre_recepciones(
    client,
    db_session,
    headers_operadora,
    producto,
    insumo_activo,
    lote_recepcion,
    persona_administradora,
):
    segundo = LoteRecepcionInsumo(
        insumo_id=insumo_activo.id,
        proveedor_id=lote_recepcion.proveedor_id,
        numero_lote="HAR-TRAZA-002",
        cantidad=10,
        cantidad_disponible=10,
        fecha_recepcion=date.today() - timedelta(days=2),
        fecha_vencimiento=date.today() + timedelta(days=60),
        registrado_por_id=persona_administradora.id,
        activo=True,
        conciliacion=False,
        clave_operacion=str(uuid4()),
    )
    db_session.add(segundo)
    db_session.commit()
    lote_recepcion_id = lote_recepcion.id
    segundo_id = segundo.id

    respuesta = client.post(
        "/lotes-produccion/",
        headers=headers_operadora,
        json={
            "producto_id": producto.id,
            "fecha_produccion": date.today().isoformat(),
            "cantidad": 12,
            "insumos": [
                {
                    "insumo_id": insumo_activo.id,
                    "cantidad_usada": 15,
                    "lotes_recepcion": [
                        {"lote_recepcion_id": lote_recepcion_id, "cantidad": 8},
                        {"lote_recepcion_id": segundo_id, "cantidad": 7},
                    ],
                }
            ],
        },
    )

    assert respuesta.status_code == 200, respuesta.text
    assert db_session.get(LoteRecepcionInsumo, lote_recepcion_id).cantidad_disponible == 4
    assert db_session.get(LoteRecepcionInsumo, segundo_id).cantidad_disponible == 3
    consumos = db_session.scalars(
        select(ConsumoLoteRecepcion).order_by(ConsumoLoteRecepcion.lote_recepcion_id)
    ).all()
    assert [consumo.cantidad for consumo in consumos] == [8, 7]


def test_endpoint_rechaza_si_el_lote_elegido_no_tiene_saldo_suficiente(
    client,
    db_session,
    headers_operadora,
    producto,
    insumo_activo,
    lote_recepcion,
    persona_administradora,
):
    segundo = LoteRecepcionInsumo(
        insumo_id=insumo_activo.id,
        proveedor_id=lote_recepcion.proveedor_id,
        numero_lote="HAR-TRAZA-002",
        cantidad=10,
        cantidad_disponible=10,
        fecha_recepcion=date.today() - timedelta(days=2),
        fecha_vencimiento=date.today() + timedelta(days=60),
        registrado_por_id=persona_administradora.id,
        activo=True,
        conciliacion=False,
        clave_operacion=str(uuid4()),
    )
    db_session.add(segundo)
    db_session.commit()
    lote_recepcion_id = lote_recepcion.id
    segundo_id = segundo.id

    respuesta = client.post(
        "/lotes-produccion/",
        headers=headers_operadora,
        json={
            "producto_id": producto.id,
            "fecha_produccion": date.today().isoformat(),
            "cantidad": 12,
            "insumos": [
                {
                    "insumo_id": insumo_activo.id,
                    "cantidad_usada": 13,
                    "lotes_recepcion": [
                        {"lote_recepcion_id": lote_recepcion_id, "cantidad": 13},
                    ],
                }
            ],
        },
    )

    assert respuesta.status_code == 409
    assert "saldo disponible" in respuesta.json()["detail"]
    assert db_session.get(LoteRecepcionInsumo, lote_recepcion_id).cantidad_disponible == 12
    assert db_session.get(LoteRecepcionInsumo, segundo_id).cantidad_disponible == 10
    assert db_session.scalars(select(ConsumoLoteRecepcion)).all() == []


def test_endpoint_rechaza_distribucion_distinta_a_cantidad_usada(
    client,
    db_session,
    headers_operadora,
    producto,
    insumo_activo,
    lote_recepcion,
):
    lote_recepcion_id = lote_recepcion.id
    respuesta = client.post(
        "/lotes-produccion/",
        headers=headers_operadora,
        json={
            "producto_id": producto.id,
            "fecha_produccion": date.today().isoformat(),
            "cantidad": 12,
            "insumos": [
                {
                    "insumo_id": insumo_activo.id,
                    "cantidad_usada": 5,
                    "lotes_recepcion": [
                        {"lote_recepcion_id": lote_recepcion_id, "cantidad": 4},
                    ],
                }
            ],
        },
    )

    assert respuesta.status_code == 422
    assert db_session.scalars(select(ConsumoLoteRecepcion)).all() == []
    assert db_session.get(LoteRecepcionInsumo, lote_recepcion_id).cantidad_disponible == 12


def test_endpoint_insumos_disponibles_requiere_permiso(
    client,
    headers_sin_permisos,
    insumo_activo,
):
    # Act
    sin_token = client.get("/lotes-produccion/insumos-disponibles")
    sin_permiso = client.get(
        "/lotes-produccion/insumos-disponibles",
        headers=headers_sin_permisos,
    )
    ruta_lotes = f"/lotes-produccion/insumos/{insumo_activo.id}/lotes-disponibles"
    sin_token_lotes = client.get(
        ruta_lotes,
        params={"fecha_produccion": date.today().isoformat()},
    )
    sin_permiso_lotes = client.get(
        ruta_lotes,
        params={"fecha_produccion": date.today().isoformat()},
        headers=headers_sin_permisos,
    )

    # Assert
    assert sin_token.status_code == 401
    assert sin_permiso.status_code == 403
    assert sin_token_lotes.status_code == 401
    assert sin_permiso_lotes.status_code == 403


def test_endpoint_no_registra_lote_con_insumo_inactivo(
    client,
    headers_operadora,
    producto,
    insumo_inactivo,
):
    # Act
    respuesta = client.post(
        "/lotes-produccion/",
        headers=headers_operadora,
        json={
            "producto_id": producto.id,
            "fecha_produccion": date.today().isoformat(),
            "cantidad": 12.5,
            "insumos": [{"insumo_id": insumo_inactivo.id, "cantidad_usada": 1}],
        },
    )

    # Assert
    assert respuesta.status_code == 409
    assert respuesta.json()["detail"] == "No se pueden asociar insumos dados de baja."


def test_endpoint_no_registra_lote_con_insumo_duplicado(
    client,
    headers_operadora,
    producto,
    insumo_activo,
):
    # Act
    respuesta = client.post(
        "/lotes-produccion/",
        headers=headers_operadora,
        json={
            "producto_id": producto.id,
            "fecha_produccion": date.today().isoformat(),
            "cantidad": 12.5,
            "insumos": [
                {"insumo_id": insumo_activo.id, "cantidad_usada": 1},
                {"insumo_id": insumo_activo.id, "cantidad_usada": 2},
            ],
        },
    )

    # Assert
    assert respuesta.status_code == 409
    assert respuesta.json()["detail"] == "No se puede asociar el mismo insumo más de una vez al lote."


def test_endpoint_no_registra_lote_con_cantidad_usada_cero(
    client,
    headers_operadora,
    producto,
    insumo_activo,
):
    # Act
    respuesta = client.post(
        "/lotes-produccion/",
        headers=headers_operadora,
        json={
            "producto_id": producto.id,
            "fecha_produccion": date.today().isoformat(),
            "cantidad": 12.5,
            "insumos": [{"insumo_id": insumo_activo.id, "cantidad_usada": 0}],
        },
    )

    # Assert
    assert respuesta.status_code == 422


def test_endpoint_no_registra_lote_si_falta_stock(
    client,
    headers_operadora,
    producto,
    insumo_activo,
):
    # Act
    respuesta = client.post(
        "/lotes-produccion/",
        headers=headers_operadora,
        json={
            "producto_id": producto.id,
            "fecha_produccion": date.today().isoformat(),
            "cantidad": 12.5,
            "insumos": [{"insumo_id": insumo_activo.id, "cantidad_usada": 51}],
        },
    )

    # Assert
    assert respuesta.status_code == 400
    assert respuesta.json()["detail"] == (
        "Uno o más insumos no tienen stock suficiente para las cantidades indicadas."
    )


def test_endpoint_buscar_lote_y_consultar_trazabilidad_en_ambos_sentidos(
    client,
    headers_administradora,
    headers_operadora,
    producto,
    insumo_activo,
    lote_recepcion,
):
    producto_id = producto.id
    nombre_producto = producto.nombre
    insumo_id = insumo_activo.id
    lote_recepcion_id = lote_recepcion.id
    numero_lote = lote_recepcion.numero_lote
    proveedor_nombre = lote_recepcion.proveedor.nombre
    fecha_recepcion = lote_recepcion.fecha_recepcion.isoformat()
    fecha_vencimiento = lote_recepcion.fecha_vencimiento.isoformat()
    fecha_produccion = date.today().isoformat()

    alta = client.post(
        "/lotes-produccion/",
        headers=headers_operadora,
        json={
            "producto_id": producto_id,
            "fecha_produccion": fecha_produccion,
            "cantidad": 8,
            "insumos": [
                {
                    "insumo_id": insumo_id,
                    "cantidad_usada": 3,
                    "lotes_recepcion": [
                        {"lote_recepcion_id": lote_recepcion_id, "cantidad": 3},
                    ],
                },
            ],
        },
    )
    assert alta.status_code == 200, alta.text
    lote_produccion_id = alta.json()["id"]

    busqueda = client.get(
        "/lotes-insumo/",
        params={"buscar": "TRAZA-001"},
        headers=headers_administradora,
    )
    assert busqueda.status_code == 200, busqueda.text
    assert busqueda.json()["total"] == 1
    assert busqueda.json()["items"][0]["id"] == lote_recepcion_id

    for termino in ("Harina", "Proveedor de prueba"):
        busqueda = client.get(
            "/lotes-insumo/",
            params={"buscar": termino},
            headers=headers_administradora,
        )
        assert busqueda.status_code == 200, busqueda.text
        assert busqueda.json()["total"] == 1
        assert busqueda.json()["items"][0]["id"] == lote_recepcion_id

    hacia_adelante = client.get(
        f"/lotes-insumo/{lote_recepcion_id}/trazabilidad",
        headers=headers_administradora,
    )
    assert hacia_adelante.status_code == 200, hacia_adelante.text
    assert hacia_adelante.json() == [
        {
            "lote_produccion_id": lote_produccion_id,
            "codigo": alta.json()["codigo"],
            "producto": nombre_producto,
            "fecha_produccion": fecha_produccion,
            "cantidad_utilizada": 3,
            "activo": True,
        }
    ]

    hacia_atras = client.get(
        f"/lotes-produccion/{lote_produccion_id}/trazabilidad",
        headers=headers_administradora,
    )
    assert hacia_atras.status_code == 200, hacia_atras.text
    insumo = hacia_atras.json()["insumos"][0]
    assert insumo["insumo_id"] == insumo_id
    assert insumo["cantidad_usada"] == 3
    assert insumo["lotes_recepcion"] == [
        {
            "lote_recepcion_id": lote_recepcion_id,
            "numero_lote": numero_lote,
            "proveedor_nombre": proveedor_nombre,
            "fecha_recepcion": fecha_recepcion,
            "fecha_vencimiento": fecha_vencimiento,
            "cantidad_utilizada": 3,
        }
    ]
    assert insumo["cantidad_stock_anterior"] == 0
    assert insumo["cantidad_historica_sin_origen"] == 0


def test_endpoint_trazabilidad_requiere_administracion(
    client,
    headers_operadora,
    lote_recepcion,
):
    lote_recepcion_id = lote_recepcion.id
    respuesta = client.get(
        f"/lotes-insumo/{lote_recepcion_id}/trazabilidad",
        headers=headers_operadora,
    )
    assert respuesta.status_code == 403
