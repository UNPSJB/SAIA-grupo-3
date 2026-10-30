from datetime import date

from tests.database import (
    client,
    headers_operadora,
    headers_sin_permisos,
    insumo_activo,
    insumo_inactivo,
    otro_insumo_activo,
    persona_operadora,
    persona_sin_permisos,
    producto,
    db_session,
    unidad_medida,
)


def test_endpoint_registrar_lote_con_insumos(
    client,
    headers_operadora,
    producto,
    insumo_activo,
    otro_insumo_activo,
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
                {"insumo_id": insumo_activo.id, "cantidad_usada": 2.5},
                {"insumo_id": otro_insumo_activo.id, "cantidad_usada": 1.25},
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
    assert datos[0]["unidadMedidaObj"]["sufijo"] == "kg"


def test_endpoint_insumos_disponibles_requiere_permiso(
    client,
    headers_sin_permisos,
):
    # Act
    sin_token = client.get("/lotes-produccion/insumos-disponibles")
    sin_permiso = client.get(
        "/lotes-produccion/insumos-disponibles",
        headers=headers_sin_permisos,
    )

    # Assert
    assert sin_token.status_code == 401
    assert sin_permiso.status_code == 403


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
    assert respuesta.status_code == 400
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
    assert respuesta.status_code == 400
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
