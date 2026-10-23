"""Migración SQLite: ejecutar desde backend con python migrate_superadmin.py."""
from sqlalchemy import inspect, text


def migrate(engine):
    if engine.dialect.name != "sqlite":
        raise RuntimeError("Esta migración requiere SQLite.")
    with engine.begin() as connection:
        inspector = inspect(connection)
        if not inspector.has_table("personal"):
            raise RuntimeError("No existe la tabla personal; inicializá la base primero.")
        if "superadmin" not in {c["name"] for c in inspector.get_columns("personal")}:
            connection.execute(text("ALTER TABLE personal ADD COLUMN superadmin BOOLEAN NOT NULL DEFAULT 0"))
        connection.execute(text(
            "UPDATE personal SET superadmin=1, administrar=1, operar=1, activo=1 "
            "WHERE username='admin' AND superadmin=0"
        ))


if __name__ == "__main__":
    from src.database import engine
    migrate(engine)
    print("Migración de superadmin completada.")
