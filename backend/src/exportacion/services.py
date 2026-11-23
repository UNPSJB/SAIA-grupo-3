from typing import Any, Callable


def recolectar_todos(funcion: Callable[..., dict[str, Any]], *args: Any, **kwargs: Any) -> list[Any]:
    """Reutiliza cualquier servicio paginado existente para devolver todos los registros
    filtrados y ordenados sin duplicar consultas."""
    items: list[Any] = []
    page = 1
    while True:
        resultado = funcion(*args, page=page, size=100, **kwargs)
        lote = resultado["items"]
        items.extend(lote)
        if page >= resultado["pages"] or not lote:
            break
        page += 1
    return items