import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from src.equipos import exceptions as equipo_exceptions
from src.equipos.constants import ErrorCode as EquipoErrorCode
from src.equipos.models import TipoEquipo
from src.equipos.schemas import EquipoCreate, EquipoUpdate
from src.equipos.services import crear_equipo, eliminar_equipo, modificar_equipo
from src.sector import exceptions as sector_exceptions
from src.sector.schemas import SectorCreate, SectorUpdate
from src.sector.services import crear_sector, eliminar_sector, leer_sector, modificar_sector


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


def datos_equipo(sector_id, **cambios):
    datos = {"numero_serie": "LIC-001", "nombre": "Licuadora", "tipo": "equipo", "sector_id": sector_id}
    return datos | cambios


def test_crear_sector(db_session):
    sector = crear_sector(db_session, SectorCreate(nombre="Pastelería"))

    assert sector.id is not None
    assert sector.nombre == "Pastelería"
    assert sector.activo is True


def test_modificar_sector(db_session, sector_cocina):
    sector = modificar_sector(db_session, sector_cocina.id, SectorUpdate(nombre="Cocina central"))

    assert sector.nombre == "Cocina central"


def test_modificar_sector_con_su_mismo_nombre_no_es_duplicado(db_session, sector_cocina):
    sector = modificar_sector(db_session, sector_cocina.id, SectorUpdate(nombre="Cocina"))

    assert sector.nombre == "Cocina"


def test_baja_logica_de_sector(db_session, sector_cocina):
    sector_id = sector_cocina.id

    eliminado = eliminar_sector(db_session, sector_id)

    assert eliminado.activo is False
    with pytest.raises(sector_exceptions.SectorNoEncontrado):
        leer_sector(db_session, sector_id)
    assert leer_sector(db_session, sector_id, incluir_inactivos=True).activo is False


def test_reactivar_sector_dado_de_baja(db_session, sector_inactivo):
    sector = modificar_sector(db_session, sector_inactivo.id, SectorUpdate(activo=True))

    assert sector.activo is True


@pytest.mark.parametrize("nombre", ["Cocina", "cocina", "COCINA"])
def test_crear_sector_con_nombre_duplicado_lanza_error(db_session, sector_cocina, nombre):
    with pytest.raises(sector_exceptions.NombreDuplicado):
        crear_sector(db_session, SectorCreate(nombre=nombre))


def test_modificar_sector_a_un_nombre_existente_lanza_error(db_session, sector_cocina, sector_panaderia):
    with pytest.raises(sector_exceptions.NombreDuplicado):
        modificar_sector(db_session, sector_panaderia.id, SectorUpdate(nombre="cocina"))


def test_no_permite_dar_de_baja_sector_con_equipos_activos(db_session, sector_cocina, equipo_balanza):
    with pytest.raises(sector_exceptions.SectorTieneEquipos):
        eliminar_sector(db_session, sector_cocina.id)

    db_session.refresh(sector_cocina)
    assert sector_cocina.activo is True


def test_permite_dar_de_baja_sector_si_sus_equipos_estan_dados_de_baja(db_session, sector_cocina, equipo_balanza):
    eliminar_equipo(db_session, equipo_balanza.id)

    eliminado = eliminar_sector(db_session, sector_cocina.id)

    assert eliminado.activo is False


def test_crear_equipo_en_sector_activo(db_session, sector_cocina):
    equipo = crear_equipo(db_session, EquipoCreate(**datos_equipo(sector_cocina.id)))

    assert equipo.id is not None
    assert equipo.activo is True
    assert equipo.sector_id == sector_cocina.id
    assert equipo.tipo == TipoEquipo.EQUIPO


def test_crear_equipo_en_sector_inexistente_lanza_error(db_session):
    with pytest.raises(equipo_exceptions.SectorNoEncontrado):
        crear_equipo(db_session, EquipoCreate(**datos_equipo(999)))


def test_crear_equipo_en_sector_inactivo_lanza_error(db_session, sector_inactivo):
    with pytest.raises(equipo_exceptions.SectorNoEncontrado):
        crear_equipo(db_session, EquipoCreate(**datos_equipo(sector_inactivo.id)))


def test_mover_equipo_a_sector_inactivo_lanza_error(db_session, equipo_balanza, sector_inactivo):
    with pytest.raises(equipo_exceptions.SectorNoEncontrado):
        modificar_equipo(db_session, equipo_balanza.id, EquipoUpdate(sector_id=sector_inactivo.id))


@pytest.mark.parametrize("numero_serie", ["BAL-001", "bal-001", "Bal-001"])
def test_numero_serie_duplicado_sin_importar_mayusculas(db_session, sector_cocina, equipo_balanza, numero_serie):
    with pytest.raises(equipo_exceptions.NumeroSerieDuplicado):
        crear_equipo(db_session, EquipoCreate(**datos_equipo(sector_cocina.id, numero_serie=numero_serie)))


def test_modificar_equipo_a_numero_serie_existente_lanza_error(db_session, sector_cocina, equipo_balanza):
    otro_equipo = crear_equipo(db_session, EquipoCreate(**datos_equipo(sector_cocina.id)))

    with pytest.raises(equipo_exceptions.NumeroSerieDuplicado):
        modificar_equipo(db_session, otro_equipo.id, EquipoUpdate(numero_serie="bal-001"))


def test_modificar_equipo_con_su_mismo_numero_serie_no_es_duplicado(db_session, equipo_balanza):
    equipo = modificar_equipo(
        db_session, equipo_balanza.id, EquipoUpdate(numero_serie="BAL-001", nombre="Balanza digital")
    )

    assert equipo.nombre == "Balanza digital"


@pytest.mark.parametrize("tipo", ["maquina", "heladera", ""])
def test_tipo_de_equipo_invalido_es_rechazado(sector_cocina, tipo):
    with pytest.raises(ValidationError) as error:
        EquipoCreate(**datos_equipo(sector_cocina.id, tipo=tipo))

    assert EquipoErrorCode.TIPO_EQUIPO_INVALIDO in str(error.value)


@pytest.mark.parametrize(
    "tipo, esperado",
    [("HERRAMIENTA", TipoEquipo.HERRAMIENTA), ("Instrumento", TipoEquipo.INSTRUMENTO)],
)
def test_tipo_de_equipo_acepta_mayusculas(sector_cocina, tipo, esperado):
    equipo = EquipoCreate(**datos_equipo(sector_cocina.id, tipo=tipo))

    assert equipo.tipo == esperado
