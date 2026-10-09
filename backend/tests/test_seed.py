from datetime import date
from sqlalchemy import func, select, text
from sqlalchemy.orm import sessionmaker
from seed import cargar_seed
from src.models import ModeloBase
from src.personal.models import Personal
from src.sector.models import Sector
from src.tipoDocumento.models import TipoDocumento
from src.unidadMedida.models import UnidadMedida
from src.documentacion.models import Documentacion
from src.notificaciones.models import Notificacion
from src.checklist.services import armar_checklist
from src.tarea.models import Tarea, FrecuenciaTarea
from src.insumosQuimicos.models import InsumoQuimico


def test_seed_covers_demo_scenarios_and_is_repeatable(db, user):
    db.commit()
    bind = db.get_bind()
    factory = sessionmaker(bind=bind, expire_on_commit=False)
    cargar_seed(session_factory=factory, db_engine=bind)
    with factory() as seeded:
        counts = {table.name: seeded.scalar(select(func.count()).select_from(table))
                  for table in ModeloBase.metadata.sorted_tables}
        users = {person.username: person for person in seeded.scalars(select(Personal)).all()}
        for name, admin, operate in [('admin', True, True), ('admin.solo', True, False), ('opera', False, True), ('sin.permisos', False, False)]:
            assert (users[name].administrar, users[name].operar) == (admin, operate)
        assert users['inactivo.demo'].activo is False
        assert users['ana'].nombre == 'Ana'
        for model in (Sector, TipoDocumento, UnidadMedida):
            assert seeded.scalar(select(func.count()).select_from(model).where(model.activo == True)) >= 30
            assert seeded.scalar(select(func.count()).select_from(model).where(model.activo == False)) >= 3
        for username in ('admin', 'opera'):
            checklist = armar_checklist(seeded, users[username].id, date.today())
            assert checklist.pendientes > 0
            assert checklist.realizadas == 2
        assert armar_checklist(seeded, users['operario.demo01'].id, date.today()).total == 0
        expirations = seeded.scalars(select(Documentacion.fecha_vencimiento)).all()
        assert any(day < date.today() for day in expirations)
        assert date.today() in expirations
        assert any(day > date.today() for day in expirations)
        assert seeded.scalar(select(Notificacion).where(Notificacion.leida == False))
        assert seeded.scalar(select(func.count()).select_from(Notificacion).where(Notificacion.leida == True)) > 0
        assert set(seeded.scalars(select(Tarea.frecuencia)).all()) == set(FrecuenciaTarea)
        assert seeded.scalar(select(InsumoQuimico).where(InsumoQuimico.nombre == 'Químico de prueba sin stock')).cantidad == 0
        assert not seeded.execute(text('PRAGMA foreign_key_check')).all()
    cargar_seed(session_factory=factory, db_engine=bind)
    with factory() as seeded:
        assert counts == {table.name: seeded.scalar(select(func.count()).select_from(table))
                          for table in ModeloBase.metadata.sorted_tables}
        assert not seeded.execute(text('PRAGMA foreign_key_check')).all()
