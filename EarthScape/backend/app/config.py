from pathlib import Path
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(BACKEND_ROOT / ".env"), extra="ignore")

    demo_mode: bool = True
    environment: str = "development"
    frontend_url: str = "http://localhost:5173"

    mongo_uri: str = "mongodb://localhost:27017"
    mongo_db_name: str = "earthscape"

    jwt_secret_key: str = "change-this-super-secret-key-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7

    hdfs_namenode_url: str = "http://localhost:9870"
    hdfs_local_root: str = "../data/hdfs_simulated"
    upload_dir: str = "../data/uploads"
    model_dir: str = "../models"
    report_dir: str = "../reports"

    max_upload_size_mb: int = 50

    kafka_bootstrap_servers: str = ""
    kafka_enabled: bool = False

    rate_limit_per_minute: int = 120

    @property
    def hdfs_root_path(self) -> Path:
        p = (BACKEND_ROOT / self.hdfs_local_root).resolve()
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def upload_path(self) -> Path:
        p = (BACKEND_ROOT / self.upload_dir).resolve()
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def model_path(self) -> Path:
        p = (BACKEND_ROOT / self.model_dir).resolve()
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def report_path(self) -> Path:
        p = (BACKEND_ROOT / self.report_dir).resolve()
        p.mkdir(parents=True, exist_ok=True)
        return p


@lru_cache
def get_settings() -> Settings:
    return Settings()
