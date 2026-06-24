import logging
from fastapi import APIRouter, Depends, HTTPException, status
from uuid import UUID
from datetime import datetime, timezone
import phonenumbers
from app.api.deps import get_current_user, AuthUser, get_contact_repo
from app.repositories import ContactRepository
from app.schemas.contact import (
    ContactCreate, ContactResponse, ContactUpdate,
    BulkImportRequest, BulkImportResult
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix='/contacts', tags=['contacts'])

@router.post('', response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
async def create_contact(
    data: ContactCreate,
    user: AuthUser = Depends(get_current_user),
    repo: ContactRepository = Depends(get_contact_repo),
):
    contact = await repo.create(UUID(user.id), data.model_dump())
    return contact

@router.get('', response_model=list[ContactResponse])                                          
async def list_contacts(                                                                       
    limit: int = 50,                                                                           
    offset: int = 0,                                                                           
    user: AuthUser = Depends(get_current_user),                                                
    repo: ContactRepository = Depends(get_contact_repo),                                       
):                                                                                             
    return await repo.list_by_user(UUID(user.id), limit=limit, offset=offset)

@router.get('/{contact_id}', response_model=ContactResponse)
async def get_contact(
    contact_id: UUID,
    user: AuthUser = Depends(get_current_user),
    repo: ContactRepository = Depends(get_contact_repo)
):
    contact = await repo.get_by_id(contact_id, UUID(user.id))
    if not contact:
        raise HTTPException(status_code=404, detail='Contact not found')
    return contact

@router.patch('/{contact_id}', response_model=ContactResponse)
async def update_contact(
    contact_id: UUID,
    data: ContactUpdate,
    user: AuthUser = Depends(get_current_user),
    repo: ContactRepository = Depends(get_contact_repo),
):
    data = {k:v for k, v in dict(data).items() if v is not None}
    data['updated_at'] = datetime.now(timezone.utc).isoformat()

    contact = await repo.update(contact_id, UUID(user.id), data)
    if not contact:
        raise HTTPException(status_code=404, detail='Contact not found')
    return contact

@router.delete('/{contact_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_contact(
    contact_id: UUID,
    user: AuthUser = Depends(get_current_user),
    repo: ContactRepository = Depends(get_contact_repo),
):
    deleted = await repo.delete(contact_id, UUID(user.id))
    if not deleted:
        raise HTTPException(status_code=404, detail='Contact not found')


@router.post('/bulk', response_model=BulkImportResult)
async def bulk_import_contacts(
    data: BulkImportRequest,
    user: AuthUser = Depends(get_current_user),
    repo: ContactRepository = Depends(get_contact_repo),
):
    """
    Import multiple contacts at once.

    Accepts a list of contacts and imports them.
    If skip_duplicates is True, contacts with existing phone numbers are skipped.
    """
    user_id = UUID(user.id)
    contacts_to_import = []
    skipped = 0
    errors = []

    for idx, contact in enumerate(data.contacts):
        # Validate and normalize phone number
        try:
            phone = contact.phone.strip()
            # Try to parse as international format
            if not phone.startswith('+'):
                # Assume Indian number if no country code
                phone = '+91' + phone.lstrip('0')

            parsed = phonenumbers.parse(phone)
            if not phonenumbers.is_valid_number(parsed):
                errors.append({
                    'row': idx + 1,
                    'phone': contact.phone,
                    'error': 'Invalid phone number'
                })
                continue

            normalized_phone = phonenumbers.format_number(
                parsed, phonenumbers.PhoneNumberFormat.E164
            )
        except Exception as e:
            errors.append({
                'row': idx + 1,
                'phone': contact.phone,
                'error': f'Invalid phone format: {str(e)}'
            })
            continue

        # Check for duplicates
        if data.skip_duplicates:
            existing = await repo.get_by_phone(normalized_phone, user_id)
            if existing:
                skipped += 1
                continue

        contacts_to_import.append({
            'phone': normalized_phone,
            'name': contact.name.strip() if contact.name else None,
            'email': contact.email.strip().lower() if contact.email else None,
            'timezone': contact.timezone,
            'metadata': {}
        })

    # Bulk insert
    imported_count = 0
    if contacts_to_import:
        try:
            result = await repo.bulk_create(user_id, contacts_to_import)
            imported_count = len(result)
        except Exception as e:
            logger.error(f"Bulk import failed: {e}")
            raise HTTPException(
                status_code=500,
                detail=f'Bulk import failed: {str(e)}'
            )

    return BulkImportResult(
        total=len(data.contacts),
        imported=imported_count,
        skipped=skipped,
        errors=errors
    )