from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_PUBLISHABLE_KEY: str
    SUPABASE_SECRET_KEY: str
    SUPABASE_JWT_SECRET: str

    VAPI_API_KEY: str = ""
    VAPI_PHONE_NUMBER_ID: str = ""  # Your VAPI phone number ID
    VAPI_WEBHOOK_SECRET: str = ""   # For verifying webhook signatures

    OPENAI_API_KEY: str = ""

    # Base URL for webhooks (your server's public URL)
    BASE_URL: str = "http://localhost:8000"

    # Frontend URL for CORS (comma-separated for multiple origins)
    FRONTEND_URL: str = "http://localhost:3000"

    DEBUG: bool = True

    class Config:
        env_file = ".env"

    @property
    def CORS_ORIGINS(self) -> list[str]:
        """Parse FRONTEND_URL into list of allowed origins."""
        origins = ["http://localhost:3000"]
        if self.FRONTEND_URL:
            for url in self.FRONTEND_URL.split(","):
                url = url.strip()
                if url and url not in origins:
                    origins.append(url)
        return origins

@lru_cache()
def get_settings() -> Settings:
    return Settings()