from src.aditivoReferencia.models import AditivoReferencia
from src.claseFuncional.models import ClaseFuncional


def _aditivo(db_session, activo=True):
    clase = ClaseFuncional(nombre="Leudante", ins_opcional=False, activo=True)
    db_session.add(clase)
    db_session.flush()
    aditivo = AditivoReferencia(clase_funcional_id=clase.id, nombre="Bicarbonato de sodio", ins="500(ii)", activo=activo)
    db_session.add(aditivo)
    db_session.commit()
    return aditivo


def test_un_insumo_nuevo_es_ingrediente_por_defecto(client, headers_administradora, unidad_medida):
    respuesta = client.post(
        "/insumos/", headers=headers_administradora, json={"nombre": "Harina 000", "unidad_medida_id": unidad_medida.id}
    )

    assert respuesta.json()["tipo"] == "ingrediente"
    assert respuesta.json()["aditivo_referencia"] is None


def test_un_aditivo_necesita_su_aditivo_de_referencia(client, db_session, headers_administradora, unidad_medida):
    aditivo = _aditivo(db_session)
    base = {"nombre": "Bicarbonato", "unidad_medida_id": unidad_medida.id, "tipo": "aditivo"}

    sin_referencia = client.post("/insumos/", headers=headers_administradora, json=base)
    con_referencia = client.post(
        "/insumos/", headers=headers_administradora, json={**base, "aditivo_referencia_id": aditivo.id}
    )

    assert sin_referencia.status_code == 400
    assert con_referencia.status_code == 200, con_referencia.text
    assert con_referencia.json()["aditivo_referencia"]["ins"] == "500(ii)"


def test_no_acepta_un_aditivo_de_referencia_dado_de_baja(client, db_session, headers_administradora, unidad_medida):
    aditivo = _aditivo(db_session, activo=False)

    respuesta = client.post(
        "/insumos/",
        headers=headers_administradora,
        json={"nombre": "Bicarbonato", "unidad_medida_id": unidad_medida.id, "tipo": "aditivo", "aditivo_referencia_id": aditivo.id},
    )

    assert respuesta.status_code == 400


def test_pasar_a_ingrediente_quita_el_aditivo_de_referencia(client, db_session, headers_administradora, unidad_medida):
    aditivo = _aditivo(db_session)
    insumo = client.post(
        "/insumos/",
        headers=headers_administradora,
        json={"nombre": "Bicarbonato", "unidad_medida_id": unidad_medida.id, "tipo": "aditivo", "aditivo_referencia_id": aditivo.id},
    ).json()

    respuesta = client.put(f"/insumos/{insumo['id']}", headers=headers_administradora, json={"tipo": "ingrediente"})

    assert respuesta.status_code == 200, respuesta.text
    assert respuesta.json()["tipo"] == "ingrediente"
    assert respuesta.json()["aditivo_referencia_id"] is None
