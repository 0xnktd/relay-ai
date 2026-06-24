from fastapi import APIRouter

from app.api.v1.contacts import router as contacts_router
from app.api.v1.calls import router as calls_router
from app.api.v1.templates import router as templates_router
from app.api.v1.webhooks import router as webhooks_router

router = APIRouter(prefix='/api/v1')

router.include_router(contacts_router)
router.include_router(templates_router)
router.include_router(calls_router)
router.include_router(webhooks_router)