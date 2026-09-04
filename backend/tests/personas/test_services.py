import pytest
from sqlalchemy.orm import Session
from tests.database import session
from src.Personall import exceptions
from src.Personall.services import (
    listar_Personals,
    crear_Personal,
    modificar_Personal,
    leer_Personal,
    eliminar_Personal
)
from src.Personall.schemas import PersonalCreate, PersonalUpdate


def test_crear_Personal(session: Session) -> None:
    nombre = "Pepe"
    email = "pepe@gmail.com"
    Personal_3 = crear_Personal(session, PersonalCreate(nombre=nombre, email=email))
    assert Personal_3.nombre == nombre
    assert Personal_3.email == email


def test_modificar_Personal(session: Session) -> None:
    nuevo_nombre = "Pepe"
    Personal_id = 2
    Personal_2 = leer_Personal(session, Personal_id)
    assert Personal_2.nombre == "Ana"
    Personal_2 = modificar_Personal(
        session, Personal_id, PersonalUpdate(nombre=nuevo_nombre, email=Personal_2.email)
    )
    assert Personal_2.nombre == nuevo_nombre

def test_eliminar_Personal(session: Session) -> None:

    # intentamos borrar a una Personal con mascotas.
    # verificamos que se lanza la excepcion esperada
    with pytest.raises(exceptions.PersonalTieneMascotas):
        Personal_id = 2
        Personal_2 = eliminar_Personal(session, Personal_id)

    # probamos crear una Personal nueva y eliminarla.
    nombre = "Pepe"
    email = "pepe@gmail.com"
    Personal_3 = crear_Personal(session, PersonalCreate(nombre=nombre, email=email))

    Personals = listar_Personals(session)
    assert len(Personals) == 3

    Personal_3 = eliminar_Personal(session, Personal_3.id)

    Personals = listar_Personals(session)
    assert len(Personals) == 2


def test_listar_Personals(session: Session) -> None:
    Personals = listar_Personals(session)
    assert len(Personals) == 2
