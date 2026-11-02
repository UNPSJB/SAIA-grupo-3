import sqlite3
from sqlalchemy import func, select
from tests.database import db_session  # noqa: F401
from tests.abastecimiento.test_seed import ejecutar_seed  # noqa: F401
from src.equipos.models import Equipo
from src.registroTemperatura.models import RegistroTemperatura
from scripts.migrate_integracion_temperatura import migrar


def test_seed_temperaturas_no_duplica_ni_reconfigura_equipos(db_session, ejecutar_seed):
    ejecutar_seed()
    equipos = db_session.scalars(select(Equipo).where(Equipo.numero_serie.like('SAIA-DEMO-FRIO-%'))).all()
    assert len(equipos) == 4
    assert db_session.scalar(select(func.count()).select_from(RegistroTemperatura)) == 160
    original = db_session.scalar(select(Equipo).where(Equipo.numero_serie == 'SAIA-EQ-0001'))
    assert not original.controla_temperatura
    equipo = equipos[0]
    equipo.temperatura_minima = -20
    equipo.temperatura_maxima = -10
    db_session.commit()
    antes = [(r.id, r.temperatura_registrada, r.fecha_hora_registro)
             for r in db_session.scalars(select(RegistroTemperatura).order_by(RegistroTemperatura.id))]
    ejecutar_seed()
    assert equipo.temperatura_minima == -20 and equipo.temperatura_maxima == -10
    despues = [(r.id, r.temperatura_registrada, r.fecha_hora_registro)
               for r in db_session.scalars(select(RegistroTemperatura).order_by(RegistroTemperatura.id))]
    assert antes == despues


def test_migracion_columnas_conserva_datos_y_es_repetible(tmp_path):
    ruta = tmp_path / 'anterior.db'
    with sqlite3.connect(ruta) as db:
        db.executescript('CREATE TABLE equipos (id INTEGER, nombre TEXT); INSERT INTO equipos VALUES (1, "Equipo original"); CREATE TABLE insumos (id INTEGER); CREATE TABLE insumos_quimicos (id INTEGER); CREATE TABLE notificaciones (id INTEGER, leida BOOLEAN); INSERT INTO notificaciones VALUES (1, 1);')
    respaldo = migrar(ruta)
    assert respaldo.is_file()
    assert migrar(ruta) is None
    with sqlite3.connect(ruta) as db:
        assert db.execute('SELECT nombre, controla_temperatura, temperatura_minima, temperatura_maxima FROM equipos').fetchone() == ('Equipo original', 0, None, None)
        assert db.execute('SELECT leida, resuelta FROM notificaciones').fetchone() == (1, 0)
