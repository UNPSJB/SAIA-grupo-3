from datetime import date, datetime, timedelta
import pytest
from fastapi import HTTPException
from src.incidente import services
from src.incidente.models import Incidente
from src.incidente.constants import EstadoIncidente
from src.tipoIncidente.models import TipoIncidente


def test_estadisticas_agrupan_filtran_y_actualizan(db_session, persona_operadora):
    hoy=date.today()
    tipo=TipoIncidente(nombre='Plagas',color='danger',activo=True)
    otro=TipoIncidente(nombre='Roturas',color='info',activo=True)
    db_session.add_all([tipo,otro]);db_session.flush()
    def agregar(tipo, dia):
        db_session.add(Incidente(descripcion='Hallazgo de prueba',tipo_id=tipo.id,reportado_por_dni=persona_operadora.dni,fecha_hora=datetime.combine(dia,datetime.min.time()),estado=EstadoIncidente.ABIERTO));db_session.commit()
    agregar(tipo,hoy);agregar(otro,hoy-timedelta(days=40))
    resultado=services.estadisticas_incidentes(db_session,hoy,hoy)
    assert resultado.total==1
    assert {i.tipo.nombre:i.total for i in resultado.por_tipo}=={'Plagas':1,'Roturas':0}
    agregar(tipo,hoy)
    assert services.estadisticas_incidentes(db_session,hoy,hoy).total==2


def test_estadisticas_rechazan_rango_invertido(db_session):
    with pytest.raises(HTTPException):services.estadisticas_incidentes(db_session,date(2026,2,1),date(2026,1,1))
