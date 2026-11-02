import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from src.equipos.schemas import EquipoCreate, EquipoUpdate
from src.equipos.services import modificar_equipo


def test_actualizar_rango_parcial_valida_configuracion_final(db_session, equipo_frio):
    modificar_equipo(db_session, equipo_frio.id, EquipoUpdate(temperatura_minima=3))
    assert equipo_frio.temperatura_minima == 3
    with pytest.raises(HTTPException) as error:
        modificar_equipo(db_session, equipo_frio.id, EquipoUpdate(temperatura_minima=12))
    assert error.value.status_code == 422
    assert equipo_frio.temperatura_minima == 3


@pytest.mark.parametrize('minima,maxima', [(8,2),(2,2),(None,8),(2,None)])
def test_rango_exige_minima_menor_a_maxima(equipo_frio, minima, maxima):
    with pytest.raises(ValidationError):
        EquipoCreate(nombre='Equipo de prueba', numero_serie='OTRO', tipo='equipo',
            sector_id=equipo_frio.sector_id, controla_temperatura=True,
            temperatura_minima=minima, temperatura_maxima=maxima)
