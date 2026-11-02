import pytest
from unittest.mock import Mock
from src.notificaciones import scheduler

@pytest.mark.parametrize('falla',[False,True])
def test_job_stock_usa_sesion_controlada_y_cierra(monkeypatch,falla):
    sesion=Mock()
    revisar=Mock(side_effect=RuntimeError('fallo de prueba')) if falla else Mock(return_value=[])
    monkeypatch.setattr(scheduler,'SessionLocal',lambda:sesion)
    monkeypatch.setattr(scheduler,'revisar_stock_todos',revisar)
    scheduler.ejecutar_job_stock()
    revisar.assert_called_once_with(sesion)
    sesion.close.assert_called_once()
    assert sesion.rollback.call_count==int(falla)


def test_configura_revision_diaria_sin_iniciar_scheduler_real(monkeypatch):
    instancia=Mock()
    monkeypatch.setattr(scheduler,'BackgroundScheduler',lambda:instancia)
    monkeypatch.setattr(scheduler,'_scheduler',None)
    scheduler.iniciar_scheduler()
    jobs={c.kwargs['id']:c for c in instancia.add_job.call_args_list}
    assert jobs['stock_diario'].args[0] is scheduler.ejecutar_job_stock
    assert 'hour=\'8\'' in str(jobs['stock_diario'].args[1])
    assert jobs['stock_al_iniciar'].args[0] is scheduler.ejecutar_job_stock
    instancia.start.assert_called_once()
