"""
Alembic environment configuration for IssueDesk.

Uses the project's app.core.config.settings for database URL
and imports all models to support autogenerate.
"""

from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ── IMPORT ALL MODELS ────────────────────────────────────────
# This ensures Alembic can detect all table definitions
# for autogenerate support. Import the Base that all models use.
from app.core.database import Base
from app.core.config import settings

# Import all models so they are registered on Base.metadata
import app.models.user          # noqa: F401
import app.models.project       # noqa: F401
import app.models.project_member  # noqa: F401
import app.models.issue         # noqa: F401
import app.models.comment       # noqa: F401

target_metadata = Base.metadata

# ── Override sqlalchemy.url with our settings ────────────────
# Uses the DATABASE_URL from .env instead of the placeholder in alembic.ini
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()