import pytest
from src.producto.models import Producto

@pytest.fixture
def receta_con_historial(client, headers_administradora, datos_receta):
    receta = client.post("/recetas/", headers=headers_administradora, json=datos_receta()).json()
    datos = datos_receta()
    datos.pop("producto_id")
    datos["renglones"][0]["cantidad"] = 9
    client.post(
        f"/recetas/{receta['id']}/versiones",
        headers=headers_administradora,
        json={**datos, "version_base_id": receta["version_vigente"]["id"], "motivo": "Más harina"},
    )
    return client.get(f"/recetas/{receta['id']}", headers=headers_administradora).json()


def test_operario_recibe_la_version_vigente_y_no_las_archivadas(client, headers_operadora, receta_con_historial, producto):
    respuesta = client.get(f"/recetas/producto/{producto.id}", headers=headers_operadora)

    assert respuesta.status_code == 200, respuesta.text
    receta = respuesta.json()
    assert receta["version_vigente"]["numero"] == 2
    assert receta["version_vigente"]["estado"] == "vigente"
    assert receta["version_vigente"]["renglones"][0]["cantidad"] == 9
    assert receta["cantidad_versiones"] == 2
    assert "versiones" not in receta


def test_operario_ve_el_historial_solo_si_lo_pide(client, headers_operadora, receta_con_historial):
    historial = client.get(f"/recetas/{receta_con_historial['id']}/versiones", headers=headers_operadora)

    assert historial.status_code == 200
    assert [(v["numero"], v["estado"]) for v in historial.json()] == [(2, "vigente"), (1, "archivada")]
    archivada = client.get(f"/recetas/versiones/{historial.json()[1]['id']}", headers=headers_operadora).json()
    assert archivada["estado"] == "archivada"
    assert archivada["renglones"][0]["cantidad"] == 8


def test_operario_puede_ver_pero_no_editar(client, headers_operadora, receta_con_historial, datos_receta):
    datos = datos_receta()
    datos.pop("producto_id")
    nueva = {**datos, "version_base_id": receta_con_historial["version_vigente"]["id"], "motivo": "Intento"}

    assert client.post(f"/recetas/{receta_con_historial['id']}/versiones", headers=headers_operadora, json=nueva).status_code == 403
    assert client.post("/recetas/", headers=headers_operadora, json=datos_receta()).status_code == 403
    assert client.get("/recetas/insumos-disponibles", headers=headers_operadora).status_code == 403


@pytest.mark.parametrize(
    "ruta",
    ["/recetas/vigentes", "/recetas/{id}", "/recetas/{id}/versiones", "/recetas/producto/{producto}"],
)
def test_usuario_sin_permisos_recibe_403(client, headers_sin_permisos, receta_con_historial, producto, ruta):
    url = ruta.format(id=receta_con_historial["id"], producto=producto.id)

    assert client.get(url, headers=headers_sin_permisos).status_code == 403


def test_producto_sin_receta_devuelve_404(client, db_session, headers_operadora, unidad_medida):
    sin_receta = Producto(nombre="Sin receta", unidad_medida_id=unidad_medida.id, activo=True)
    db_session.add(sin_receta)
    db_session.commit()

    respuesta = client.get(f"/recetas/producto/{sin_receta.id}", headers=headers_operadora)

    assert respuesta.status_code == 404
    assert "todavía no tiene receta" in respuesta.json()["detail"]
    assert client.get("/recetas/producto/9999", headers=headers_operadora).status_code == 404


def test_lista_de_recetas_vigentes_para_operar(
    client, db_session, headers_operadora, receta_con_historial, unidad_medida
):
    db_session.add_all([
        Producto(nombre="Sin receta", unidad_medida_id=unidad_medida.id, activo=True),
        Producto(nombre="Dado de baja", unidad_medida_id=unidad_medida.id, activo=False),
    ])
    db_session.commit()

    vigentes = client.get("/recetas/vigentes", headers=headers_operadora).json()
    filtradas = client.get("/recetas/vigentes?buscar=zzz", headers=headers_operadora).json()

    assert [item["receta_id"] for item in vigentes] == [receta_con_historial["id"]]
    assert vigentes[0]["version_vigente"]["numero"] == 2
    assert (vigentes[0]["cantidad_ingredientes"], vigentes[0]["cantidad_pasos"]) == (2, 2)
    assert filtradas == []


def test_un_producto_dado_de_baja_no_aparece_entre_las_vigentes(
    client, db_session, headers_operadora, receta_con_historial, producto
):
    producto.activo = False
    db_session.commit()

    assert client.get("/recetas/vigentes", headers=headers_operadora).json() == []
