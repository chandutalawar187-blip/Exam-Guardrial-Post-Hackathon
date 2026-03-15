# backend/app/config.py

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    anthropic_api_key: str
    supabase_url: str
    supabase_key: str
    supabase_service_key: str
    jwt_secret: str = 'changeme'
    environment: str = 'development'
    port: int = 8000

    class Config:
        env_file = '.env'


settings = Settings()
