"""
Database configuration with security enhancements.
"""
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import Pool, QueuePool

from app.config import get_settings

settings = get_settings()

is_sqlite = "sqlite" in settings.database_url
is_postgres = "postgresql" in settings.database_url

connect_args = {"check_same_thread": False} if is_sqlite else {}
if is_postgres:
    connect_args = {
        "sslmode": "require",
        "application_name": "admitflow-backend",
        "options": f"-c statement_timeout={settings.db_statement_timeout_ms}",
    }

engine_kwargs = {
    "echo": settings.db_echo,
    "pool_pre_ping": True,
    "connect_args": connect_args,
}
if is_postgres:
    engine_kwargs.update(
        {
            "poolclass": QueuePool,
            "pool_size": settings.db_pool_size,
            "max_overflow": settings.db_max_overflow,
            "pool_timeout": settings.db_pool_timeout,
            "pool_recycle": settings.db_pool_recycle,
        }
    )

engine = create_engine(settings.database_url, **engine_kwargs)

# Query timeout for PostgreSQL (prevent DoS)
if is_postgres:
    @event.listens_for(Pool, "connect")
    def set_query_timeout(dbapi_conn, connection_record):
        try:
            cursor = dbapi_conn.cursor()
            cursor.execute(f"SET statement_timeout = '{settings.db_statement_timeout_ms}'")
            cursor.close()
        except Exception:
            pass

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Database session dependency."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database tables."""
    from app import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    if settings.environment == "development":
        print(f"Database initialized: {settings.database_url}")

