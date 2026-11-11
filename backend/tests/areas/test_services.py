import pytest

from src.areas import exceptions, services
from src.insumosQuimicos.models import InsumoQuimico, TipoQuimico


@pytest.fixture
def lavandina(db_session, unidad_medida):
    quimico = InsumoQuimico(
        nombre="Lavandina",
        cantidad=10,
        tipo_quimico=TipoQuimico.DESINFECTANTE,
        unidad_medida_id=unidad_medida.id,
        activo=True,
    )
    db_session.add(quimico)
    db_session.commit()
    return quimico


def test_obtener_ingredientes_devuelve_los_pedidos(db_session, insumo_activo, otro_insumo_activo):
    ingredientes = services.obtener_ingredientes(db_session, [insumo_activo.id, otro_insumo_activo.id])

    assert set(ingredientes) == {insumo_activo.id, otro_insumo_activo.id}


def test_una_receta_con_un_insumo_quimico_es_rechazada(db_session, insumo_activo, unidad_medida):
    quimico = InsumoQuimico(
        id=insumo_activo.id + 500,
        nombre="Lavandina",
        cantidad=10,
        tipo_quimico=TipoQuimico.DESINFECTANTE,
        unidad_medida_id=unidad_medida.id,
        activo=True,
    )
    db_session.add(quimico)
    db_session.commit()

    with pytest.raises(exceptions.NoEsIngrediente) as error:
        services.obtener_ingredientes(db_session, [insumo_activo.id, quimico.id])

    assert "Limpieza" in error.value.detail


def test_sin_ingredientes_no_consulta_nada(db_session):
    assert services.obtener_ingredientes(db_session, []) == {}


def test_un_ingrediente_no_puede_llamarse_como_un_quimico(db_session, lavandina):
    with pytest.raises(exceptions.NombreUsadoPorInsumoQuimico):
        services.validar_nombre_de_ingrediente(db_session, "  LAVANDINA ")


def test_un_quimico_no_puede_llamarse_como_un_ingrediente(db_session, insumo_activo):
    with pytest.raises(exceptions.NombreUsadoPorIngrediente):
        services.validar_nombre_de_insumo_quimico(db_session, insumo_activo.nombre.upper())
