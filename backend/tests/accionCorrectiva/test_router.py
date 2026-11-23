import pytest


def test_historial_de_movimientos_en_orden(
    client, headers_operadora, headers_administradora, tipo_incidente
):
    creado = client.post(
        "/incidentes/",
        headers=headers_operadora,
        data={"descripcion": "Falta sanitizante", "tipo_id": str(tipo_incidente.id)},
    )
    assert creado.status_code == 200, creado.text
    incidente_id = creado.json()["id"]

    cierre_1 = client.post(
        f"/incidentes/{incidente_id}/acciones-correctivas",
        headers=headers_administradora,
        json={"descripcion": "Se repuso sanitizante"},
    )
    assert cierre_1.status_code == 200, cierre_1.text

    reapertura = client.post(
        f"/incidentes/{incidente_id}/reabrir",
        headers=headers_administradora,
        json={"motivo": "El dosificador seguía perdiendo"},
    )
    assert reapertura.status_code == 200, reapertura.text

    cierre_2 = client.post(
        f"/incidentes/{incidente_id}/acciones-correctivas",
        headers=headers_administradora,
        json={"descripcion": "Se reemplazó el dosificador"},
    )
    assert cierre_2.status_code == 200, cierre_2.text

    historial = client.get(
        f"/incidentes/{incidente_id}/movimientos",
        headers=headers_administradora,
    )
    assert historial.status_code == 200, historial.text
    movimientos = historial.json()

    assert [(m["accion"], m["motivo"]) for m in movimientos] == [
        ("reportado", None),
        ("cerrado", "Se repuso sanitizante"),
        ("reabierto", "El dosificador seguía perdiendo"),
        ("cerrado", "Se reemplazó el dosificador"),
    ]


@pytest.mark.parametrize("valor_vacio", ["", "   "])
def test_descripcion_o_motivo_vacio_devuelve_422(
    client, headers_administradora, incidente_abierto, valor_vacio
):
    cierre_invalido = client.post(
        f"/incidentes/{incidente_abierto.id}/acciones-correctivas",
        headers=headers_administradora,
        json={"descripcion": valor_vacio},
    )
    assert cierre_invalido.status_code == 422

    # Cerramos con una acción válida para probar edición y reapertura vacías
    accion = client.post(
        f"/incidentes/{incidente_abierto.id}/acciones-correctivas",
        headers=headers_administradora,
        json={"descripcion": "Acción válida"},
    ).json()

    edicion_invalida = client.put(
        f"/incidentes/acciones-correctivas/{accion['id']}",
        headers=headers_administradora,
        json={"descripcion": valor_vacio},
    )
    reapertura_invalida = client.post(
        f"/incidentes/{incidente_abierto.id}/reabrir",
        headers=headers_administradora,
        json={"motivo": valor_vacio},
    )

    assert edicion_invalida.status_code == 422
    assert reapertura_invalida.status_code == 422


def test_operario_no_puede_cerrar_reabrir_ni_editar_acciones_correctivas(
    client, headers_operadora, headers_administradora, incidente_abierto
):
    assert (
        client.post(
            f"/incidentes/{incidente_abierto.id}/acciones-correctivas",
            headers=headers_operadora,
            json={"descripcion": "Intento operario"},
        ).status_code
        == 403
    )

    accion = client.post(
        f"/incidentes/{incidente_abierto.id}/acciones-correctivas",
        headers=headers_administradora,
        json={"descripcion": "Cierre por admin"},
    ).json()

    assert (
        client.put(
            f"/incidentes/acciones-correctivas/{accion['id']}",
            headers=headers_operadora,
            json={"descripcion": "Intento editar"},
        ).status_code
        == 403
    )
    assert (
        client.post(
            f"/incidentes/{incidente_abierto.id}/reabrir",
            headers=headers_operadora,
            json={"motivo": "Intento reabrir"},
        ).status_code
        == 403
    )