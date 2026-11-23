import pytest

from src.auth.utils import create_access_token
from src.equipos.models import Equipo, TipoEquipo
from src.personal.models import Personal
from src.produccionDelDia.models import PasoLote
from src.sector.models import Sector


@pytest.fixture
def hornos(db_session):
    sector = Sector(nombre="Hornos", activo=True)
    db_session.add(sector)
    db_session.commit()
    return sector


@pytest.fixture
def horno(db_session, hornos):
    equipo = Equipo(numero_serie="HR-1", nombre="Horno rotativo", tipo=TipoEquipo.EQUIPO, sector_id=hornos.id, activo=True)
    db_session.add(equipo)
    db_session.commit()
    return equipo


def _persona(db_session, usuario, dni, sectores):
    persona = Personal(nombre=usuario.title(), apellido="Prueba", dni=dni, nroLegajo=f"L-{dni}",
        email=f"{usuario}@example.com", username=usuario, hashed_password="unused",
        operar=True, administrar=False, activo=True, sectores=sectores)
    db_session.add(persona)
    db_session.commit()
    return {"Authorization": f"Bearer {create_access_token(persona)}"}


@pytest.fixture
def hornero(db_session, hornos):
    return _persona(db_session, "hornero", "501", [hornos])


@pytest.fixture
def sin_sector(db_session):
    return _persona(db_session, "ayudante", "502", [])


@pytest.fixture
def lote_con_horno(db_session, crear_lote, horno):
    lote = crear_lote()
    pasos = db_session.query(PasoLote).filter_by(lote_id=lote["id"]).order_by(PasoLote.orden).all()
    pasos[1].equipo_id = horno.id
    db_session.commit()
    return lote, pasos[0].id, pasos[1].id


def _lotes(client, headers):
    return client.get("/produccion-del-dia", headers=headers).json()


def realizar(client, headers, paso_id, **datos):
    return client.post(f"/produccion-del-dia/pasos/{paso_id}/realizar", headers=headers, data=datos)


def test_quien_tiene_el_sector_ve_el_lote_y_solo_puede_operar_sus_pasos(client, hornero, lote_con_horno):
    lote, mezclar, hornear = lote_con_horno

    lotes = _lotes(client, hornero)

    assert [l["id"] for l in lotes] == [lote["id"]]
    pasos = {p["id"]: p for p in lotes[0]["pasos"]}
    assert pasos[mezclar]["puede_operar"] is False
    assert pasos[hornear]["puede_operar"] is True
    assert pasos[hornear]["sector"]["nombre"] == "Hornos"


def test_el_sector_marca_su_paso_pero_no_el_de_otro_sector(client, hornero, lote_con_horno):
    _, mezclar, hornear = lote_con_horno

    assert realizar(client, hornero, mezclar).status_code == 403
    respuesta = realizar(client, hornero, hornear, valor_medido="95")
    assert respuesta.status_code == 200, respuesta.text
    assert respuesta.json()["realizado_por"]["nombre"] == "Hornero"


def test_quien_creo_el_lote_puede_marcar_todos_sus_pasos(client, headers_operadora, lote_con_horno):
    _, mezclar, hornear = lote_con_horno

    assert realizar(client, headers_operadora, mezclar).status_code == 200
    assert realizar(client, headers_operadora, hornear, valor_medido="94").status_code == 200


def test_sin_sector_no_ve_lotes_ajenos(client, sin_sector, lote_con_horno):
    lote, _, hornear = lote_con_horno

    assert _lotes(client, sin_sector) == []
    assert client.get(f"/produccion-del-dia/lotes/{lote['id']}/pasos", headers=sin_sector).status_code == 403
    assert realizar(client, sin_sector, hornear, valor_medido="95").status_code == 403


def test_el_sector_tambien_anula_su_paso(client, hornero, lote_con_horno):
    _, _, hornear = lote_con_horno
    realizar(client, hornero, hornear, valor_medido="95")

    respuesta = client.post(f"/produccion-del-dia/pasos/{hornear}/anular", headers=hornero, json={"motivo": "Lo marqué antes de tiempo."})

    assert respuesta.status_code == 200, respuesta.text
    assert respuesta.json()["estado"] == "pendiente"


def _datos_personal(**cambios):
    datos = {"nombre": "Jorge", "apellido": "Medina", "dni": "29874561", "nroLegajo": "L-900",
        "email": "jorge@example.com", "username": "jorge.medina", "password": "clave123", "operar": True}
    datos.update(cambios)
    return datos


def test_se_asignan_sectores_al_crear_y_modificar_personal(client, headers_administradora, hornos, db_session):
    envasado = Sector(nombre="Envasado", activo=True)
    db_session.add(envasado)
    db_session.commit()

    creada = client.post("/personal/", headers=headers_administradora, json=_datos_personal(sector_ids=[hornos.id]))
    assert creada.status_code == 200, creada.text
    assert [s["nombre"] for s in creada.json()["sectores"]] == ["Hornos"]

    modificada = client.put(f"/personal/{creada.json()['id']}", headers=headers_administradora,
        json={"sector_ids": [hornos.id, envasado.id]})
    assert modificada.status_code == 200, modificada.text
    assert [s["nombre"] for s in modificada.json()["sectores"]] == ["Envasado", "Hornos"]
    assert modificada.json()["sector_ids"] == [envasado.id, hornos.id]


def test_no_se_asigna_un_sector_dado_de_baja(client, headers_administradora, db_session):
    baja = Sector(nombre="Viejo", activo=False)
    db_session.add(baja)
    db_session.commit()

    respuesta = client.post("/personal/", headers=headers_administradora, json=_datos_personal(sector_ids=[baja.id]))

    assert respuesta.status_code == 400
