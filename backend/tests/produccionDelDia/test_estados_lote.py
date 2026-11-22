from src.loteProduccion.constants import ErrorCode


def pasos(client, headers, lote_id):
    return client.get(f"/produccion-del-dia/lotes/{lote_id}/pasos", headers=headers).json()


def realizar(client, headers, paso, **datos):
    respuesta = client.post(f"/produccion-del-dia/pasos/{paso['id']}/realizar", headers=headers, data=datos)
    assert respuesta.status_code == 200, respuesta.text


def anular(client, headers, paso):
    respuesta = client.post(
        f"/produccion-del-dia/pasos/{paso['id']}/anular", headers=headers, json={"motivo": "Se marcó por error"}
    )
    assert respuesta.status_code == 200, respuesta.text


def estado(client, headers, lote_id):
    return client.get(f"/lotes-produccion/{lote_id}", headers=headers).json()["estado"]


def test_un_lote_recien_registrado_queda_abierto(crear_lote):
    assert crear_lote()["estado"] == "abierto"


def test_realizar_el_primer_paso_inicia_la_produccion(client, headers_operadora, crear_lote):
    lote = crear_lote()
    mezclar = pasos(client, headers_operadora, lote["id"])[0]

    realizar(client, headers_operadora, mezclar)

    assert estado(client, headers_operadora, lote["id"]) == "en_produccion"


def test_realizar_todos_los_pasos_finaliza_la_produccion(client, headers_operadora, crear_lote):
    lote = crear_lote()
    mezclar, hornear = pasos(client, headers_operadora, lote["id"])

    realizar(client, headers_operadora, mezclar)
    realizar(client, headers_operadora, hornear, valor_medido="220")

    assert estado(client, headers_operadora, lote["id"]) == "finalizado"


def test_anular_un_paso_vuelve_el_lote_al_estado_anterior(client, headers_operadora, crear_lote):
    lote = crear_lote()
    mezclar, hornear = pasos(client, headers_operadora, lote["id"])
    realizar(client, headers_operadora, mezclar)
    realizar(client, headers_operadora, hornear, valor_medido="220")

    anular(client, headers_operadora, hornear)
    assert estado(client, headers_operadora, lote["id"]) == "en_produccion"

    anular(client, headers_operadora, mezclar)
    assert estado(client, headers_operadora, lote["id"]) == "abierto"


def test_produccion_del_dia_sigue_mostrando_lotes_en_produccion_y_finalizados(client, headers_operadora, crear_lote):
    lote = crear_lote()
    mezclar, hornear = pasos(client, headers_operadora, lote["id"])

    def en_produccion_del_dia():
        return [item["id"] for item in client.get("/produccion-del-dia", headers=headers_operadora).json()]

    realizar(client, headers_operadora, mezclar)
    assert en_produccion_del_dia() == [lote["id"]]

    realizar(client, headers_operadora, hornear, valor_medido="220")
    assert en_produccion_del_dia() == [lote["id"]]


def test_un_lote_sin_receta_queda_abierto_hasta_que_se_cierra(client, headers_administradora, crear_lote):
    lote = crear_lote(con_receta=False)

    cerrado = client.post(f"/lotes-produccion/{lote['id']}/cerrar", headers=headers_administradora)

    assert lote["estado"] == "abierto"
    assert cerrado.status_code == 200, cerrado.text
    assert cerrado.json()["estado"] == "cerrado"


def test_solo_se_da_de_baja_un_lote_que_no_inicio_la_produccion(
    client, headers_operadora, headers_administradora, crear_lote
):
    en_curso = crear_lote()
    realizar(client, headers_operadora, pasos(client, headers_operadora, en_curso["id"])[0])
    sin_iniciar = crear_lote()

    por_delete = client.delete(f"/lotes-produccion/{en_curso['id']}", headers=headers_administradora)
    por_put = client.put(f"/lotes-produccion/{en_curso['id']}", headers=headers_administradora, json={"activo": False})
    aceptada = client.delete(f"/lotes-produccion/{sin_iniciar['id']}", headers=headers_administradora)

    assert por_delete.status_code == 400
    assert por_delete.json()["detail"] == ErrorCode.BAJA_CON_PRODUCCION_INICIADA
    assert por_put.status_code == 400
    assert aceptada.status_code == 200, aceptada.text
    assert aceptada.json()["activo"] is False
