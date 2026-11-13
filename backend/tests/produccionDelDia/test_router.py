import pytest

from src.archivos import services as archivos


def pasos(client, headers, lote_id):
    return client.get(f"/produccion-del-dia/lotes/{lote_id}/pasos", headers=headers).json()


def realizar(client, headers, paso_id, **datos):
    return client.post(f"/produccion-del-dia/pasos/{paso_id}/realizar", headers=headers, data=datos)


def anular(client, headers, paso_id, motivo):
    return client.post(f"/produccion-del-dia/pasos/{paso_id}/anular", headers=headers, json={"motivo": motivo})


def test_crear_un_lote_desde_la_receta_genera_los_pasos_en_orden(client, headers_operadora, crear_lote):
    lote = crear_lote()

    generados = pasos(client, headers_operadora, lote["id"])

    assert [(p["orden"], p["nombre"], p["estado"]) for p in generados] == [
        (1, "Mezclar", "pendiente"),
        (2, "Hornear", "pendiente"),
    ]
    assert generados[1]["punto_control"] is True
    assert generados[1]["temperatura_celsius"] == 220


def test_un_lote_sin_receta_no_tiene_pasos(client, headers_operadora, crear_lote):
    lote = crear_lote(con_receta=False)

    assert pasos(client, headers_operadora, lote["id"]) == []
    assert client.get("/produccion-del-dia", headers=headers_operadora).json() == []


def test_produccion_del_dia_muestra_mis_lotes_abiertos_con_sus_pasos(
    client, headers_operadora, otra_operadora, crear_lote
):
    lote = crear_lote()

    mia = client.get("/produccion-del-dia", headers=headers_operadora).json()
    ajena = client.get("/produccion-del-dia", headers=otra_operadora).json()

    assert [(item["id"], item["realizados"], item["total"], item["version_numero"]) for item in mia] == [
        (lote["id"], 0, 2, 1)
    ]
    assert ajena == []


def test_marcar_un_paso_registra_quien_y_cuando(client, headers_operadora, crear_lote, persona_operadora):
    lote = crear_lote()
    paso = pasos(client, headers_operadora, lote["id"])[0]

    respuesta = realizar(client, headers_operadora, paso["id"], observacion="  Sin novedades ")

    assert respuesta.status_code == 200, respuesta.text
    realizado = respuesta.json()
    assert realizado["estado"] == "realizado"
    assert realizado["realizado_por"]["id"] == persona_operadora.id
    assert realizado["realizado_en"] is not None
    assert realizado["observacion"] == "Sin novedades"
    movimientos = pasos(client, headers_operadora, lote["id"])[0]["movimientos"]
    assert [m["accion"] for m in movimientos] == ["realizado"]


def test_punto_de_control_sin_valor_medido_da_error(client, headers_operadora, crear_lote):
    hornear = pasos(client, headers_operadora, crear_lote()["id"])[1]

    sin_valor = realizar(client, headers_operadora, hornear["id"])
    con_valor = realizar(client, headers_operadora, hornear["id"], valor_medido="218,5")

    assert sin_valor.status_code == 400
    assert "valor medido" in sin_valor.json()["detail"]
    assert con_valor.status_code == 200
    assert con_valor.json()["valor_medido"] == 218.5


def test_valor_medido_no_numerico_da_error(client, headers_operadora, crear_lote):
    hornear = pasos(client, headers_operadora, crear_lote()["id"])[1]

    assert realizar(client, headers_operadora, hornear["id"], valor_medido="mucho").status_code == 422


def test_no_se_marca_dos_veces(client, headers_operadora, crear_lote):
    paso = pasos(client, headers_operadora, crear_lote()["id"])[0]
    realizar(client, headers_operadora, paso["id"])

    assert realizar(client, headers_operadora, paso["id"]).status_code == 400


def test_se_puede_adjuntar_una_foto(client, headers_operadora, crear_lote, tmp_path, monkeypatch):
    monkeypatch.setattr(archivos, "UPLOADS_DIR", tmp_path)
    paso = pasos(client, headers_operadora, crear_lote()["id"])[0]

    respuesta = client.post(
        f"/produccion-del-dia/pasos/{paso['id']}/realizar",
        headers=headers_operadora,
        files={"foto": ("masa.png", b"\x89PNG\r\n\x1a\n", "image/png")},
    )

    assert respuesta.status_code == 200, respuesta.text
    assert respuesta.json()["foto_path"].endswith(".png")
    assert len(list(tmp_path.iterdir())) == 1


@pytest.mark.parametrize("motivo", ["", "   "])
def test_anular_sin_motivo_da_error(client, headers_operadora, crear_lote, motivo):
    paso = pasos(client, headers_operadora, crear_lote()["id"])[0]
    realizar(client, headers_operadora, paso["id"])

    assert anular(client, headers_operadora, paso["id"], motivo).status_code == 422


def test_anular_vuelve_el_paso_a_pendiente_y_queda_registrado(client, headers_operadora, crear_lote):
    lote = crear_lote()
    paso = pasos(client, headers_operadora, lote["id"])[0]
    realizar(client, headers_operadora, paso["id"])

    respuesta = anular(client, headers_operadora, paso["id"], "Lo marqué por error")
    realizar(client, headers_operadora, paso["id"])

    assert respuesta.status_code == 200
    assert respuesta.json()["estado"] == "pendiente"
    assert respuesta.json()["realizado_por"] is None
    movimientos = pasos(client, headers_operadora, lote["id"])[0]["movimientos"]
    assert [(m["accion"], m["motivo"]) for m in movimientos] == [
        ("realizado", None),
        ("anulado", "Lo marqué por error"),
        ("realizado", None),
    ]


def test_no_se_anula_un_paso_pendiente(client, headers_operadora, crear_lote):
    paso = pasos(client, headers_operadora, crear_lote()["id"])[0]

    assert anular(client, headers_operadora, paso["id"], "Motivo").status_code == 400


def test_un_lote_cerrado_no_permite_marcar_pasos(client, headers_operadora, headers_administradora, crear_lote):
    lote = crear_lote()
    paso = pasos(client, headers_operadora, lote["id"])[0]
    client.post(
        f"/lotes-produccion/{lote['id']}/cerrar",
        headers=headers_administradora,
        json={"confirmar_pasos_pendientes": True, "motivo": "Fin de turno"},
    )

    respuesta = realizar(client, headers_operadora, paso["id"])

    assert respuesta.status_code == 400
    assert "cerrado" in respuesta.json()["detail"]
    assert client.get("/produccion-del-dia", headers=headers_operadora).json() == []


def test_otra_operadora_no_puede_marcar_pasos_de_mi_lote(client, headers_operadora, otra_operadora, crear_lote):
    paso = pasos(client, headers_operadora, crear_lote()["id"])[0]

    assert realizar(client, otra_operadora, paso["id"]).status_code == 403
    assert client.get(f"/produccion-del-dia/lotes/{paso['lote_id']}/pasos", headers=otra_operadora).status_code == 403


def test_cambiar_la_receta_despues_no_altera_los_pasos_del_lote(
    client, headers_administradora, headers_operadora, crear_lote, receta, datos_receta
):
    lote = crear_lote()
    datos = datos_receta()
    datos.pop("producto_id")
    datos["pasos"] = [{"nombre": "Otro paso", "procedimiento": "Distinto"}]
    client.post(
        f"/recetas/{receta['id']}/versiones",
        headers=headers_administradora,
        json={**datos, "version_base_id": receta["version_vigente"]["id"], "motivo": "Cambio de pasos"},
    )

    assert [p["nombre"] for p in pasos(client, headers_operadora, lote["id"])] == ["Mezclar", "Hornear"]


def test_cerrar_con_pasos_pendientes_pide_confirmacion_y_motivo(
    client, headers_administradora, crear_lote
):
    lote = crear_lote()
    url = f"/lotes-produccion/{lote['id']}/cerrar"

    sin_confirmar = client.post(url, headers=headers_administradora)
    sin_motivo = client.post(url, headers=headers_administradora, json={"confirmar_pasos_pendientes": True})
    confirmado = client.post(
        url,
        headers=headers_administradora,
        json={"confirmar_pasos_pendientes": True, "motivo": "Se cortó la luz"},
    )

    assert sin_confirmar.status_code == 400
    assert "2 paso(s) sin realizar" in sin_confirmar.json()["detail"]
    assert sin_motivo.status_code == 400
    assert confirmado.status_code == 200, confirmado.text
    cerrado = confirmado.json()
    assert cerrado["estado"] == "cerrado"
    assert (cerrado["pasos_pendientes_al_cerrar"], cerrado["motivo_cierre_pendientes"]) == (2, "Se cortó la luz")


def test_cerrar_con_todos_los_pasos_hechos_no_pide_confirmacion(
    client, headers_operadora, headers_administradora, crear_lote
):
    lote = crear_lote()
    mezclar, hornear = pasos(client, headers_operadora, lote["id"])
    realizar(client, headers_operadora, mezclar["id"])
    realizar(client, headers_operadora, hornear["id"], valor_medido="220")

    respuesta = client.post(f"/lotes-produccion/{lote['id']}/cerrar", headers=headers_administradora)

    assert respuesta.status_code == 200
    assert respuesta.json()["pasos_pendientes_al_cerrar"] is None
