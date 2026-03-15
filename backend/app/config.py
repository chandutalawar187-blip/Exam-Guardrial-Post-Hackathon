# backend/app/config.py

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_key: str = ""
    anthropic_api_key: str = ""
    admin_username: str = "124843"
    admin_password: str = "12345678"

    class Config:
        env_file = '.env'


settings = Settings()
