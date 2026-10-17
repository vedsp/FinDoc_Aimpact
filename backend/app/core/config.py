import os
from pydantic import field_validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "FinDocAI"
    PROJECT_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    SECRET_KEY: str = os.getenv("SECRET_KEY", "findocai-sih2026-secret-key-team")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres.gshirmqrudawkyfxmkqb:2kGKR3hlb5eMmhA5@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres"
    )
    STORAGE_DIR: str = os.getenv("STORAGE_DIR", "./storage")

    # Supabase
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "https://gshirmqrudawkyfxmkqb.supabase.co")
    SUPABASE_SERVICE_KEY: str = os.getenv(
        "SUPABASE_SERVICE_KEY",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzaGlybXFydWRhd2t5Znhta3FiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDM5MzM0NSwiZXhwIjoyMTA1OTY5MzQ1fQ.Gti3_OijXpWMIJnDlxl93zvSnjI3AZ1tlSBE3K5XFXo"
    )
    SUPABASE_BUCKET: str = os.getenv("SUPABASE_BUCKET", "documents")
    # AI / LLM
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def fix_postgres_dialect(cls, v: str) -> str:
        """
        Rewrite bare postgresql:// URLs to use the psycopg3 driver.
        Supabase provides postgresql:// connection strings; SQLAlchemy needs
        postgresql+psycopg:// to use the installed psycopg (v3) package.
        """
        if isinstance(v, str) and v.startswith("postgresql://"):
            return v.replace("postgresql://", "postgresql+psycopg://", 1)
        return v

    model_config = {
        "case_sensitive": True,
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }

settings = Settings()
