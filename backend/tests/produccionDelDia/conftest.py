import pytest

from src.auth.utils import create_access_token
from src.personal.models import Personal
from tests.receta.conftest import conservante, datos_receta, insumo_aditivo, sorbato


@pytest.fixture
def receta(client, headers_administradora, datos_receta):
    respuesta = client.post("/recetas/", headers=headers_administradora, json=datos_receta())
    assert respuesta.status_code == 200, respuesta.text
    return respuesta.json()


@pytest.fixture
def crear_lote(client, headers_operadora, receta, lote_recepcion):
    def crear(headers=None, con_receta=True):
        datos = {
            "producto_id": receta["producto"]["id"],
            "fecha_produccion": lote_recepcion.fecha_recepcion.isoformat(),
            "cantidad": 10,
            "insumos": [
                {
                    "insumo_id": lote_recepcion.insumo_id,
                    "cantidad_usada": 1,
                    "lotes_recepcion": [{"lote_recepcion_id": lote_recepcion.id, "cantidad": 1}],
                }
            ],
        }
        if con_receta:
            datos.update(version_receta_id=receta["version_vigente"]["id"], factor_receta=1)
        respuesta = client.post("/lotes-produccion/", headers=headers or headers_operadora, json=datos)
        assert respuesta.status_code == 200, respuesta.text
        return respuesta.json()

    return crear


@pytest.fixture
def otra_operadora(db_session):
    persona = Personal(
        nombre="Otra",
        apellido="Operadora",
        dni="401",
        nroLegajo="L-401",
        email="otra@example.com",
        username="otra",
        hashed_password="unused",
        operar=True,
        administrar=False,
        activo=True,
    )
    db_session.add(persona)
    db_session.commit()
    return {"Authorization": f"Bearer {create_access_token(persona)}"}
