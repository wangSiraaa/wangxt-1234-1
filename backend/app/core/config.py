from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://postgres:postgres@localhost:5432/lawfirm_case"
    secret_key: str = "your-secret-key-for-jwt"
    access_token_expire_minutes: int = 60 * 24 * 7

    class Config:
        env_file = ".env"


settings = Settings()
