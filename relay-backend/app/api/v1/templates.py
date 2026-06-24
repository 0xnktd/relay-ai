from fastapi import APIRouter, Depends, HTTPException, status
from uuid import UUID
from datetime import datetime, timezone

from app.api.deps import get_current_user, AuthUser, get_template_repo
from app.repositories import TemplateRepository
from app.schemas.template import TemplateCreate, TemplateUpdate, TemplateResponse

router = APIRouter(prefix='/templates', tags=['templates'])

@router.post('', response_model=TemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    data: TemplateCreate,
    user: AuthUser = Depends(get_current_user),
    repo: TemplateRepository = Depends(get_template_repo)
):
    template = await repo.create(UUID(user.id), data.model_dump())
    return template

@router.get('', response_model=list[TemplateResponse])
async def list_templates(
    limit: int = 50,
    offset: int = 0,
    user: AuthUser = Depends(get_current_user),
    repo: TemplateRepository = Depends(get_template_repo)
):
    return await repo.list_by_user(UUID(user.id), limit=limit, offset=offset)

@router.get('/{template_id}', response_model=TemplateResponse)
async def get_template(
    template_id: UUID,
    user: AuthUser = Depends(get_current_user),
    repo: TemplateRepository = Depends(get_template_repo)
):
    template = await repo.get_by_id(template_id, UUID(user.id))
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template

@router.patch('/{template_id}', response_model=TemplateResponse)
async def update_template(
    template_id: UUID,
    data: TemplateUpdate,
    user: AuthUser = Depends(get_current_user),
    repo: TemplateRepository = Depends(get_template_repo)
):
    data = {k:v for k, v in dict(data).items() if v is not None}
    data['updated_at'] = datetime.now(timezone.utc).isoformat()

    template = await repo.update(template_id, UUID(user.id), data)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template

@router.delete('/{template_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: UUID,
    user: AuthUser = Depends(get_current_user),
    repo: TemplateRepository = Depends(get_template_repo)
):
    deleted = await repo.delete(template_id, UUID(user.id))
    if not deleted:
        raise HTTPException(status_code=404, detail="Template not found")