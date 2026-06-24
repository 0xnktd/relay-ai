import logging
from datetime import datetime, timezone
from uuid import UUID
from app.queue.client import PgmqClient
from app.repositories import CallRepository
from app.services.vapi import get_vapi_service
from app.config import get_settings

logger = logging.getLogger(__name__)
queue = PgmqClient()


async def handle_execute_call(payload: dict):
    """
    Execute a scheduled call via VAPI.
    Payload: {'call_id': 'uuid', 'attempt': 1}
    """
    call_id = payload['call_id']
    attempt = payload.get('attempt', 1)

    logger.info(f'Executing call {call_id}, attempt {attempt}')

    repo = CallRepository()
    settings = get_settings()

    # Get call details
    call = await repo.get_by_id_admin(call_id)
    if not call:
        logger.error(f"Call not found: {call_id}")
        return

    if call['status'] == 'cancelled':
        logger.info(f"Call {call_id} was cancelled, skipping.")
        return

    # Update status to in progress
    await repo.update(UUID(call_id), {'status': 'in_progress'})

    # Create call record
    record = await repo.create_record(UUID(call_id), {
        'started_at': datetime.now(timezone.utc).isoformat()
    })

    try:
        contact = call.get('contacts', {})
        template = call.get('call_templates', {})

        phone = contact.get('phone')
        if not phone:
            raise ValueError("Contact has no phone number")

        # Check if VAPI is configured
        if not settings.VAPI_API_KEY or not settings.VAPI_PHONE_NUMBER_ID:
            logger.warning("VAPI not configured, running in simulation mode")
            await _simulate_call(repo, call_id, record, contact, template)
            return

        # Build VAPI assistant config from template
        vapi = get_vapi_service()
        assistant_config = vapi.build_assistant_config(
            template=template,
            contact_name=contact.get('name')
        )

        # Create outbound call via VAPI
        vapi_response = await vapi.create_outbound_call(
            to_phone=phone,
            assistant_config=assistant_config,
            metadata={
                'call_id': call_id,
                'record_id': record['id'],
                'contact_id': str(call.get('contact_id')),
                'template_id': str(call.get('template_id'))
            }
        )

        vapi_call_id = vapi_response.get('id')
        logger.info(f"VAPI call created: {vapi_call_id} for internal call {call_id}")

        # Update record with VAPI call ID
        await repo.update_record(UUID(record['id']), {
            'provider_call_id': vapi_call_id
        })

        # The call will be updated via webhooks when it completes
        # Don't mark as completed here - wait for webhook

    except Exception as exp:
        logger.error(f"Call {call_id} failed: {exp}")
        await _handle_call_failure(repo, call_id, record, call, attempt)


async def _simulate_call(repo: CallRepository, call_id: str, record: dict, contact: dict, template: dict):
    """Simulate a call when VAPI is not configured (for testing)."""
    logger.info(f"Simulating call to {contact.get('phone')} using template {template.get('name')}")

    # Simulate call completion
    await repo.update_record(UUID(record['id']), {
        'ended_at': datetime.now(timezone.utc).isoformat(),
        'duration_seconds': 60,
        'outcome': 'successful',
        'transcript': [
            {'speaker': 'agent', 'text': template.get('initial_message', 'Hello!'), 'timestamp': 0},
            {'speaker': 'contact', 'text': "Hi there!", 'timestamp': 2},
            {'speaker': 'agent', 'text': template.get('closing_message', 'Thank you!'), 'timestamp': 5}
        ]
    })

    # Update call status
    await repo.update(UUID(call_id), {'status': 'completed'})

    # Enqueue extraction job
    queue.send('extraction_queue', {
        'call_record_id': record['id'],
        'transcript': [
            {'speaker': 'agent', 'text': template.get('initial_message', 'Hello!'), 'timestamp': 0},
            {'speaker': 'contact', 'text': "Hi there!", 'timestamp': 2}
        ],
        'questions': template.get('questions', []),
        'extraction_schema': template.get('extraction_schema', {})
    })

    logger.info(f'Simulated call {call_id} completed successfully')


async def _handle_call_failure(repo: CallRepository, call_id: str, record: dict, call: dict, attempt: int):
    """Handle call failure with retry logic."""
    max_retries = call.get('max_retries', 3)

    if attempt < max_retries:
        delay = 60 * (2 ** attempt)  # Exponential backoff
        queue.send_delayed('call_queue', {
            'call_id': call_id,
            'attempt': attempt + 1
        }, delay_seconds=delay)
        await repo.update(UUID(call_id), {'status': 'scheduled', 'retry_count': attempt})
        logger.info(f"Call {call_id} scheduled for retry {attempt + 1} in {delay}s")
    else:
        await repo.update(UUID(call_id), {'status': 'failed'})
        await repo.update_record(UUID(record['id']), {
            'outcome': 'failed',
            'ended_at': datetime.now(timezone.utc).isoformat()
        })
        logger.error(f"Call {call_id} failed after {attempt} attempts")


async def handle_extraction(payload: dict):
    """
    Extract structured data from call transcript using OpenAI.
    Payload: {
        'call_record_id': 'uuid',
        'transcript': [...],
        'questions': [...],
        'extraction_schema': {...}
    }
    """
    from app.services.openai import get_openai_service

    call_record_id = payload['call_record_id']
    transcript = payload.get('transcript', [])
    questions = payload.get('questions', [])
    extraction_schema = payload.get('extraction_schema', {})

    logger.info(f"Extracting data from call record {call_record_id}")

    settings = get_settings()

    # Check if OpenAI is configured
    if not settings.OPENAI_API_KEY:
        logger.warning("OpenAI not configured, skipping extraction")
        extracted_data = {
            'summary': 'Extraction skipped - OpenAI not configured',
            'answers': {},
            'sentiment': 'unknown'
        }
        confidence = 0.0
        model = 'none'
    else:
        # Use OpenAI for extraction
        openai_service = get_openai_service()
        extracted_data = await openai_service.extract_from_transcript(
            transcript=transcript,
            questions=questions,
            extraction_schema=extraction_schema
        )
        confidence = _calculate_avg_confidence(extracted_data.get('answers', {}))
        model = 'gpt-4o-mini'

    repo = CallRepository()
    await repo.create_extracted_data(UUID(call_record_id), {
        'structured_data': extracted_data,
        'confidence_score': confidence,
        'extraction_model': model
    })

    logger.info(f'Extraction completed for {call_record_id} with confidence {confidence:.2f}')


def _calculate_avg_confidence(answers: dict) -> float:
    """Calculate average confidence from extracted answers."""
    if not answers:
        return 0.0
    confidences = [
        a.get('confidence', 0.5)
        for a in answers.values()
        if isinstance(a, dict)
    ]
    return sum(confidences) / len(confidences) if confidences else 0.5


async def handle_notification(payload: dict):
    """
    Send notification to user.
    Payload: {'type': 'call_completed', 'user_id': 'uuid', ...}
    """
    notification_type = payload.get('type')
    logger.info(f'Sending notification: {notification_type}')

    # TODO: Implement email/webhook notifications
    pass
