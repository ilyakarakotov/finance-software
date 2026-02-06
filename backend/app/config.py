from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    DB_MODE: str = "sqlite"  # "sqlite" for local dev, "azure" for production
    DB_SERVER: str = "localhost"
    DB_NAME: str = "greencity_finance"
    DB_USER: str = "sa"
    DB_PASSWORD: str = ""
    DB_DRIVER: str = "ODBC+Driver+18+for+SQL+Server"

    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    @property
    def database_url(self) -> str:
        if self.DB_MODE == "azure":
            return (
                f"mssql+pyodbc://{self.DB_USER}:{self.DB_PASSWORD}"
                f"@{self.DB_SERVER}.database.windows.net/{self.DB_NAME}"
                f"?driver={self.DB_DRIVER}&Encrypt=yes"
            )
        # Default: SQLite for local development
        db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "greencity.db")
        return f"sqlite:///{db_path}"

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
