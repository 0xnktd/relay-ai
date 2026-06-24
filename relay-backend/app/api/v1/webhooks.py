import logging
from fastapi import APIRouter, Request, HTTPException, BackgroundTasks
from datetime import datetime, timezone
from uuid import UUID

from app.repositories import CallRepository
from app.queue.client import PgmqClient

logger = logging.getLogger(__name__)
router = APIRouter(prefix='/webhooks', tags=['webhooks'])


@router.post('/vapi')
async def vapi_webhook(request: Request, background_tasks: BackgroundTasks):
    """
    Handle VAPI webhook events.

    VAPI sends various events during call lifecycle:
    - call.started: Call has been initiated
    - call.ended: Call has ended (includes transcript)
    - speech.update: Real-time speech updates
    - transcript.update: Transcript updates
    """
    try:
        payload = await request.json()
    except Exception as e:
        logger.error(f"Failed to parse VAPI webhook payload: {e}")
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event_type = payload.get('message', {}).get('type')
    call_data = payload.get('message', {}).get('call', {})
    vapi_call_id = call_data.get('id')
    metadata = call_data.get('metadata', {})

    # Our internal call_id and record_id are passed in metadata
    internal_call_id = metadata.get('call_id')
    record_id = metadata.get('record_id')

    logger.info(f"VAPI webhook: {event_type} for call {vapi_call_id}, internal: {internal_call_id}")

    if not internal_call_id:
        logger.warning(f"VAPI webhook missing internal call_id in metadata")
        return {"status": "ok", "message": "No internal call_id"}

    repo = CallRepository()

    if event_type == 'call-started':
        # Update record with VAPI call ID
        if record_id:
            await repo.update_record(UUID(record_id), {
                'provider_call_id': vapi_call_id,
                'started_at': datetime.now(timezone.utc).isoformat()
            })

    elif event_type == 'end-of-call-report':
        # Call has ended - process final data
        background_tasks.add_task(
            process_call_ended,
            internal_call_id,
            record_id,
            payload
        )

    elif event_type == 'hang':
        # Call was hung up
        if record_id:
            ended_reason = payload.get('message', {}).get('endedReason', 'unknown')
            outcome = _map_ended_reason_to_outcome(ended_reason)
            await repo.update_record(UUID(record_id), {
                'ended_at': datetime.now(timezone.utc).isoformat(),
                'outcome': outcome
            })

    return {"status": "ok"}


async def process_call_ended(call_id: str, record_id: str, payload: dict):
    """Process call ended event - extract transcript and update records."""
    repo = CallRepository()
    queue = PgmqClient()

    try:
        message = payload.get('message', {})
        call_data = message.get('call', {})

        # Extract transcript
        transcript = []
        messages = message.get('transcript', []) or message.get('messages', [])
        for msg in messages:
            if msg.get('role') in ['assistant', 'user']:
                transcript.append({
                    'speaker': 'agent' if msg.get('role') == 'assistant' else 'contact',
                    'text': msg.get('content', msg.get('message', '')),
                    'timestamp': msg.get('secondsFromStart', 0)
                })

        # Calculate duration
        started_at = call_data.get('startedAt')
        ended_at = call_data.get('endedAt')
        duration_seconds = None
        if started_at and ended_at:
            try:
                start = datetime.fromisoformat(started_at.replace('Z', '+00:00'))
                end = datetime.fromisoformat(ended_at.replace('Z', '+00:00'))
                duration_seconds = int((end - start).total_seconds())
            except Exception as e:
                logger.error(f"Error calculating duration: {e}")

        # Determine outcome
        ended_reason = call_data.get('endedReason', 'unknown')
        outcome = _map_ended_reason_to_outcome(ended_reason)

        # Get recording URL if available
        recording_url = message.get('recordingUrl') or call_data.get('recordingUrl')

        # Update call record
        if record_id:
            await repo.update_record(UUID(record_id), {
                'ended_at': datetime.now(timezone.utc).isoformat(),
                'duration_seconds': duration_seconds,
                'outcome': outcome,
                'transcript': transcript,
                'recording_url': recording_url
            })

        # Update call status
        call_status = 'completed' if outcome == 'successful' else 'failed'
        await repo.update(UUID(call_id), {'status': call_status})

        # If successful, enqueue extraction job
        if outcome == 'successful' and transcript:
            # Get template questions and extraction schema
            call = await repo.get_by_id_admin(call_id)
            questions = []
            extraction_schema = {}
            if call and call.get('call_templates'):
                template = call['call_templates']
                questions = template.get('questions', [])
                extraction_schema = template.get('extraction_schema', {})

            queue.send('extraction_queue', {
                'call_record_id': record_id,
                'transcript': transcript,
                'questions': questions,
                'extraction_schema': extraction_schema
            })

        logger.info(f"Processed call ended for {call_id}: {outcome}")

    except Exception as e:
        logger.error(f"Error processing call ended: {e}")
        # Mark as failed
        await repo.update(UUID(call_id), {'status': 'failed'})
        if record_id:
            await repo.update_record(UUID(record_id), {
                'outcome': 'failed',
                'ended_at': datetime.now(timezone.utc).isoformat()
            })


def _map_ended_reason_to_outcome(ended_reason: str) -> str:
    """Map VAPI ended reason to our outcome enum."""
    reason_map = {
        'assistant-ended-call': 'successful',
        'customer-ended-call': 'human_hangup',
        'customer-did-not-answer': 'no_answer',
        'customer-busy': 'busy',
        'voicemail': 'voicemail',
        'max-duration-reached': 'successful',
        'silence-timed-out': 'failed',
        'error': 'failed',
    }
    return reason_map.get(ended_reason, 'failed')
