from tests.database import (
    client,
    db_session,
    headers_administradora,
    persona_administradora,
    unidad_medida,
)


def test_endpoint_crear_insumo_sin_cantidad(
    client,
    headers_administradora,
    unidad_medida,
):
    respuesta = client.post(
        "/insumos/",
        headers=headers_administradora,
        json={
            "nombre": "Harina",
            "unidad_medida_id": unidad_medida.id,
        },
    )

    assert respuesta.status_code == 200, respuesta.text
    assert respuesta.json()["cantidad"] == 0


def test_endpoint_rechaza_cantidad_en_catalogo(
    client,
    headers_administradora,
    unidad_medida,
):
    respuesta = client.post(
        "/insumos/",
        headers=headers_administradora,
        json={
            "nombre": "Harina",
            "unidad_medida_id": unidad_medida.id,
            "cantidad": 50,
        },
    )

    assert respuesta.status_code == 422
