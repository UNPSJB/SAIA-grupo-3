from src.produccionDelDia.models import PasoLote
from src.receta.models import VersionReceta


def pasos_desde_version(version: VersionReceta) -> list[PasoLote]:
    return [
        PasoLote(
            paso_receta_id=paso.id,
            orden=paso.orden,
            nombre=paso.nombre,
            procedimiento=paso.procedimiento,
            equipo_id=paso.equipo_id,
            tiempo_minutos=paso.tiempo_minutos,
            temperatura_celsius=paso.temperatura_celsius,
            punto_control=paso.punto_control,
        )
        for paso in version.pasos
    ]
