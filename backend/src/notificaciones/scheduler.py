#este es el cron que se va a ejecutar por detras y alimenta la campanita 
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import text
from src.database import SessionLocal
from src.notificaciones.services import generar_aviso_vencimientos

logger = logging.getLogger(__name__)
_scheduler: BackgroundScheduler | None = None

def ejecutar_job_vencimientos() -> None:

    db = SessionLocal()
    db.execute(text("PRAGMA foreign_keys = ON"))
    try:
        aviso = generar_aviso_vencimientos(db)
        logger.info("Job de vencimientos: %s", aviso.mensaje if aviso else "sin vencimientos")
    except Exception:
        logger.exception("Falló el job de vencimientos")
        db.rollback()
    finally:
        db.close()

def iniciar_scheduler() -> None:
    global _scheduler
    _scheduler = BackgroundScheduler()
    # todos los dias a las 8am
    _scheduler.add_job(ejecutar_job_vencimientos, CronTrigger(hour=8, minute=0),
                       id="vencimientos_diario", replace_existing=True)
    # Y una vez al arrancar, por si el servidor estaba apagado a las 08:00
    _scheduler.add_job(ejecutar_job_vencimientos, id="vencimientos_al_iniciar")
    _scheduler.start()
    logger.info("Scheduler de notificaciones iniciado")

def detener_scheduler() -> None:
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
