from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import router as api_router
from app.config import get_settings

settings = get_settings()

app = FastAPI(
    title='RelayAI API',
    description='Automated follow up calls scheduling and information collection',
    version='0.1.0',
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*']
)

# Routes
app.include_router(api_router)

@app.get('/health')
async def health_check():
    return {'status': 'healthy'}