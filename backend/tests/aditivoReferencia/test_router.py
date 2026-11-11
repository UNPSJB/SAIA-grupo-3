import pytest

from src.claseFuncional.models import ClaseFuncional


@pytest.fixture
def clases(db_session):
    conservante = ClaseFuncional(nombre="Conservante", ins_opcional=False, activo=True)
    aromatizante = ClaseFuncional(nombre="Aromatizante", ins_opcional=True, activo=True)
    db_session.add_all([conservante, aromatizante])
    db_session.commit()
    return conservante, aromatizante


def test_crear_aditivo_con_ins(client, headers_administradora, clases):
    conservante, _ = clases

    respuesta = client.post(
        "/aditivos-referencia/",
        headers=headers_administradora,
        json={"clase_funcional_id": conservante.id, "nombre": "Sorbato de potasio", "ins": " 202 "},
    )

    assert respuesta.status_code == 200, respuesta.text
    assert respuesta.json()["ins"] == "202"
    assert respuesta.json()["clase_funcional"]["nombre"] == "Conservante"


def test_ins_obligatorio_salvo_para_aromatizantes(client, headers_administradora, clases):
    conservante, aromatizante = clases

    sin_ins = client.post(
        "/aditivos-referencia/",
        headers=headers_administradora,
        json={"clase_funcional_id": conservante.id, "nombre": "Benzoato de sodio"},
    )
    aroma = client.post(
        "/aditivos-referencia/",
        headers=headers_administradora,
        json={"clase_funcional_id": aromatizante.id, "nombre": "Aroma de vainilla"},
    )

    assert sin_ins.status_code == 400
    assert "INS es obligatorio" in sin_ins.json()["detail"]
    assert aroma.status_code == 200
    assert aroma.json()["ins"] is None


@pytest.mark.parametrize("ins", ["abc", "2", "202xx"])
def test_ins_con_formato_invalido(client, headers_administradora, clases, ins):
    respuesta = client.post(
        "/aditivos-referencia/",
        headers=headers_administradora,
        json={"clase_funcional_id": clases[0].id, "nombre": "Prueba", "ins": ins},
    )

    assert respuesta.status_code == 422


def test_ins_y_nombre_no_se_repiten(client, headers_administradora, clases):
    datos = {"clase_funcional_id": clases[0].id, "nombre": "Sorbato de potasio", "ins": "202"}
    client.post("/aditivos-referencia/", headers=headers_administradora, json=datos)

    otro_nombre = client.post("/aditivos-referencia/", headers=headers_administradora, json={**datos, "nombre": "Otro"})
    otro_ins = client.post("/aditivos-referencia/", headers=headers_administradora, json={**datos, "ins": "211"})

    assert "INS" in otro_nombre.json()["detail"]
    assert "nombre" in otro_ins.json()["detail"]


def test_cambiar_a_una_clase_que_exige_ins(client, headers_administradora, clases):
    conservante, aromatizante = clases
    aroma = client.post(
        "/aditivos-referencia/",
        headers=headers_administradora,
        json={"clase_funcional_id": aromatizante.id, "nombre": "Aroma de limón"},
    ).json()

    respuesta = client.put(
        f"/aditivos-referencia/{aroma['id']}",
        headers=headers_administradora,
        json={"clase_funcional_id": conservante.id},
    )

    assert respuesta.status_code == 400


def test_buscar_por_ins_o_clase(client, headers_administradora, clases):
    client.post(
        "/aditivos-referencia/",
        headers=headers_administradora,
        json={"clase_funcional_id": clases[0].id, "nombre": "Sorbato de potasio", "ins": "202"},
    )
    client.post(
        "/aditivos-referencia/",
        headers=headers_administradora,
        json={"clase_funcional_id": clases[1].id, "nombre": "Aroma de vainilla"},
    )

    por_ins = client.get("/aditivos-referencia/?buscar=202", headers=headers_administradora).json()
    por_clase = client.get("/aditivos-referencia/?buscar=aromat", headers=headers_administradora).json()

    assert [item["nombre"] for item in por_ins["items"]] == ["Sorbato de potasio"]
    assert [item["nombre"] for item in por_clase["items"]] == ["Aroma de vainilla"]
