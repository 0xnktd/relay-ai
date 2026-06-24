from fastapi import APIRouter, Depends, HTTPException, status
from uuid import UUID
from datetime import datetime, timezone

from app.api.deps import get_current_user, AuthUser, get_call_repo
from app.repositories import CallRepository
from app.schemas.call import ScheduleCallRequest, ScheduledCallResponse, CallDetailResponse, CallStatus
from app.queue.client import PgmqClient

router = APIRouter(prefix='/calls', tags=['calls'])

@router.post('', response_model=ScheduledCallResponse, status_code=status.HTTP_201_CREATED)
async def schedule_call(
    data: ScheduleCallRequest,
    user: AuthUser = Depends(get_current_user),
    repo: CallRepository = Depends(get_call_repo)
):
    call = await repo.create(UUID(user.id), data.model_dump(mode='json'))
    # Enqueue to pgmq
    queue = PgmqClient()
    now = datetime.now(timezone.utc)
    scheduled_at = data.scheduled_at

    if scheduled_at <= now:
        # Execute immediately
        queue.send('call_queue', {'call_id': call['id'], 'attempt': 1})
    else:
        delay_seconds = int((scheduled_at - now).total_seconds())
        queue.send_delayed('call_queue', {'call_id': call['id'], 'attempt': 1}, delay_seconds)
        
    return call

@router.get('', response_model=list[ScheduledCallResponse])
async def list_calls(
    status: CallStatus = None,
    limit: int = 50,
    offset: int = 0,
    user: AuthUser = Depends(get_current_user),
    repo: CallRepository = Depends(get_call_repo),
):
    status_val = status.value if status else None
    return await repo.list_by_user(UUID(user.id), status=status_val, limit=limit, offset=offset)

@router.get('/{call_id}', response_model=CallDetailResponse)
async def get_call(
    call_id: UUID,
    user: AuthUser = Depends(get_current_user),
    repo: CallRepository = Depends(get_call_repo),
):
    call = await repo.get_by_id(call_id, UUID(user.id))
    if not call:
        raise HTTPException(status_code=404, detail='Call not found')
    records = await repo.get_records(call_id)
    
    # Get the most recent extracted_data from records
    extracted_data = None
    for record in records:
        if record.get('extracted_data') and len(record['extracted_data']) > 0:
            # extracted_data is a list, get the first (most recent) entry
            ed = record['extracted_data'][0] if isinstance(record['extracted_data'], list) else record['extracted_data']
            extracted_data = {
                'structured_data': ed.get('structured_data', {}),
                'confidence_score': ed.get('confidence_score'),
                'extraction_model': ed.get('extraction_model'),
                'created_at': ed.get('created_at')
            }
            break

    return {
        'call': call,
        'records': records,
        'extracted_data': extracted_data
    }

@router.delete('/{call_id}', status_code=status.HTTP_204_NO_CONTENT)
async def cancel_call(
    call_id: UUID,
    user: AuthUser = Depends(get_current_user),
    repo: CallRepository = Depends(get_call_repo)
):
    result = await repo.cancel(call_id, UUID(user.id))
    if not result:
        raise HTTPException(status_code=404, detail='Call not found or can not be cancelled')