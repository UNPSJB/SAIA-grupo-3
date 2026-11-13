import pytest


def crear(client, headers, datos):
    return client.post("/recetas/", headers=headers, json=datos)


def nueva_version(client, headers, receta, datos, version_base_id=None, motivo="Ajuste de sal"):
    cuerpo = {**datos, "version_base_id": version_base_id or receta["version_vigente"]["id"], "motivo": motivo}
    cuerpo.pop("producto_id", None)
    return client.post(f"/recetas/{receta['id']}/versiones", headers=headers, json=cuerpo)


def test_crear_receta_valida_deja_la_version_1_vigente(client, headers_administradora, datos_receta, sorbato):
    respuesta = crear(client, headers_administradora, datos_receta())

    assert respuesta.status_code == 200, respuesta.text
    receta = respuesta.json()
    vigente = receta["version_vigente"]
    assert vigente["numero"] == 1
    assert vigente["estado"] == "vigente"
    assert vigente["motivo"] == "Versión inicial"
    assert [renglon["tipo"] for renglon in vigente["renglones"]] == ["ingrediente", "ingrediente", "aditivo"]
    aditivo = vigente["renglones"][2]["aditivo_referencia"]
    assert (aditivo["nombre"], aditivo["ins"], aditivo["clase_funcional"]["nombre"]) == (
        "Sorbato de potasio",
        "202",
        "Conservante",
    )
    assert [paso["nombre"] for paso in vigente["pasos"]] == ["Mezclar", "Hornear"]
    assert vigente["pasos"][1]["punto_control"] is True
    assert vigente["porcion_medida_casera"] == "1 unidad"
    assert receta["cantidad_versiones"] == 1
    assert "versiones" not in receta


def test_un_producto_solo_tiene_una_receta(client, headers_administradora, datos_receta):
    crear(client, headers_administradora, datos_receta())

    respuesta = crear(client, headers_administradora, datos_receta())

    assert respuesta.status_code == 400
    assert "nueva versión" in respuesta.json()["detail"]


@pytest.mark.parametrize(
    "cambios",
    [
        {"renglones": []},
        {"rendimiento_cantidad": None},
        {"rendimiento_cantidad": 0},
    ],
)
def test_rechaza_receta_sin_ingredientes_o_sin_rendimiento(client, headers_administradora, datos_receta, cambios):
    datos = {campo: valor for campo, valor in datos_receta(**cambios).items() if valor is not None}

    assert crear(client, headers_administradora, datos).status_code == 422


def test_rechaza_receta_con_solo_aditivos(client, headers_administradora, datos_receta):
    datos = datos_receta()
    datos["renglones"] = datos["renglones"][2:]

    respuesta = crear(client, headers_administradora, datos)

    assert respuesta.status_code == 422
    assert "al menos un ingrediente" in respuesta.text


def test_rechaza_aditivo_sin_cantidad(client, headers_administradora, datos_receta):
    datos = datos_receta()
    del datos["renglones"][2]["cantidad"]

    assert crear(client, headers_administradora, datos).status_code == 422


def test_rechaza_aditivo_sin_clase_funcional(
    client, headers_administradora, datos_receta, aditivo_sin_clase, unidad_medida
):
    datos = datos_receta()
    datos["renglones"].append(
        {"insumo_id": aditivo_sin_clase.id, "tipo": "aditivo", "cantidad": 0.01, "unidad_medida_id": unidad_medida.id}
    )

    respuesta = crear(client, headers_administradora, datos)

    assert respuesta.status_code == 400
    assert "clase funcional" in respuesta.json()["detail"]


def test_modificar_crea_la_version_2_y_archiva_la_1(client, headers_administradora, datos_receta):
    receta = crear(client, headers_administradora, datos_receta()).json()
    datos = datos_receta()
    datos["renglones"][0]["cantidad"] = 7.5

    respuesta = nueva_version(client, headers_administradora, receta, datos)

    assert respuesta.status_code == 200, respuesta.text
    actualizada = respuesta.json()
    assert actualizada["version_vigente"]["numero"] == 2
    assert actualizada["version_vigente"]["motivo"] == "Ajuste de sal"
    assert actualizada["version_vigente"]["renglones"][0]["cantidad"] == 7.5
    assert actualizada["cantidad_versiones"] == 2
    historial = client.get(f"/recetas/{receta['id']}/versiones", headers=headers_administradora).json()
    assert [(v["numero"], v["estado"]) for v in historial] == [(2, "vigente"), (1, "archivada")]
    version_1 = client.get(
        f"/recetas/versiones/{receta['version_vigente']['id']}", headers=headers_administradora
    ).json()
    assert version_1["estado"] == "archivada"
    assert version_1["renglones"][0]["cantidad"] == 8


def test_editar_una_version_archivada_devuelve_error(client, headers_administradora, datos_receta):
    receta = crear(client, headers_administradora, datos_receta()).json()
    version_1 = receta["version_vigente"]["id"]
    nueva_version(client, headers_administradora, receta, datos_receta())

    respuesta = nueva_version(client, headers_administradora, receta, datos_receta(), version_base_id=version_1)

    assert respuesta.status_code == 400
    assert "solo lectura" in respuesta.json()["detail"]


def test_las_versiones_no_se_pueden_editar_ni_borrar(client, headers_administradora, datos_receta):
    receta = crear(client, headers_administradora, datos_receta()).json()
    version_id = receta["version_vigente"]["id"]

    assert client.put(f"/recetas/versiones/{version_id}", headers=headers_administradora, json={}).status_code == 405
    assert client.delete(f"/recetas/versiones/{version_id}", headers=headers_administradora).status_code == 405


def test_nueva_version_exige_motivo(client, headers_administradora, datos_receta):
    receta = crear(client, headers_administradora, datos_receta()).json()

    respuesta = nueva_version(client, headers_administradora, receta, datos_receta(), motivo="  ")

    assert respuesta.status_code == 422


def test_producto_dado_de_baja_no_admite_nuevas_versiones(
    client, db_session, headers_administradora, datos_receta, producto
):
    receta = crear(client, headers_administradora, datos_receta()).json()
    producto.activo = False
    db_session.commit()

    respuesta = nueva_version(client, headers_administradora, receta, datos_receta())

    assert respuesta.status_code == 400
    assert "dado de baja" in respuesta.json()["detail"]


def test_operario_no_puede_crear_ni_modificar_recetas(
    client, headers_administradora, headers_operadora, datos_receta
):
    assert crear(client, headers_operadora, datos_receta()).status_code == 403
    receta = crear(client, headers_administradora, datos_receta()).json()

    assert nueva_version(client, headers_operadora, receta, datos_receta()).status_code == 403
    assert client.get(f"/recetas/{receta['id']}", headers=headers_operadora).status_code == 200


def test_rechaza_insumo_quimico(client, headers_administradora, datos_receta, quimico_que_no_es_ingrediente, unidad_medida):
    datos = datos_receta()
    datos["renglones"].append(
        {"insumo_id": quimico_que_no_es_ingrediente.id, "tipo": "ingrediente", "cantidad": 1, "unidad_medida_id": unidad_medida.id}
    )

    respuesta = crear(client, headers_administradora, datos)

    assert respuesta.status_code == 400
    assert "Limpieza" in respuesta.json()["detail"]


def test_rechaza_insumo_dado_de_baja(client, headers_administradora, datos_receta, insumo_inactivo, unidad_medida):
    datos = datos_receta()
    datos["renglones"].append(
        {"insumo_id": insumo_inactivo.id, "tipo": "ingrediente", "cantidad": 1, "unidad_medida_id": unidad_medida.id}
    )

    respuesta = crear(client, headers_administradora, datos)

    assert respuesta.status_code == 400
    assert "dado de baja" in respuesta.json()["detail"]


def test_rechaza_insumo_repetido(client, headers_administradora, datos_receta):
    datos = datos_receta()
    datos["renglones"].append(dict(datos["renglones"][0]))

    respuesta = crear(client, headers_administradora, datos)

    assert respuesta.status_code == 400
    assert "repetido" in respuesta.json()["detail"]


def test_rechaza_tipo_distinto_al_del_maestro(client, headers_administradora, datos_receta):
    datos = datos_receta()
    datos["renglones"][2]["tipo"] = "ingrediente"

    respuesta = crear(client, headers_administradora, datos)

    assert respuesta.status_code == 400
    assert "aditivo" in respuesta.json()["detail"]


def test_listado_muestra_productos_con_y_sin_receta(client, headers_administradora, datos_receta, producto):
    sin_receta = client.get("/recetas/", headers=headers_administradora).json()
    assert [(item["producto"]["id"], item["receta_id"]) for item in sin_receta] == [(producto.id, None)]

    crear(client, headers_administradora, datos_receta())
    con_receta = client.get("/recetas/", headers=headers_administradora).json()

    assert con_receta[0]["version_vigente"]["numero"] == 1


def test_receta_por_producto(client, headers_administradora, datos_receta, producto):
    assert client.get(f"/recetas/producto/{producto.id}", headers=headers_administradora).status_code == 404
    crear(client, headers_administradora, datos_receta())

    respuesta = client.get(f"/recetas/producto/{producto.id}", headers=headers_administradora)

    assert respuesta.status_code == 200
    assert respuesta.json()["producto"]["id"] == producto.id
