import httpx
import logging
from typing import Optional
from app.config import get_settings

logger = logging.getLogger(__name__)

VAPI_BASE_URL = "https://api.vapi.ai"


class VAPIService:
    def __init__(self):
        self.settings = get_settings()
        self.api_key = self.settings.VAPI_API_KEY
        self.phone_number_id = self.settings.VAPI_PHONE_NUMBER_ID
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    async def create_outbound_call(
        self,
        to_phone: str,
        assistant_config: dict,
        metadata: Optional[dict] = None
    ) -> dict:
        """
        Create an outbound phone call via VAPI.

        Args:
            to_phone: Phone number to call (E.164 format)
            assistant_config: VAPI assistant configuration
            metadata: Optional metadata to attach to the call

        Returns:
            VAPI call response with call ID
        """
        payload = {
            "phoneNumberId": self.phone_number_id,
            "customer": {
                "number": to_phone
            },
            "assistant": assistant_config
        }

        if metadata:
            payload["metadata"] = metadata

        logger.info(f"VAPI payload: phoneNumberId={self.phone_number_id}, customer={to_phone}")

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{VAPI_BASE_URL}/call/phone",
                headers=self.headers,
                json=payload,
                timeout=30.0
            )

            if response.status_code != 201:
                logger.error(f"VAPI call creation failed: {response.status_code} - {response.text}")
                response.raise_for_status()

            return response.json()

    async def get_call(self, call_id: str) -> dict:
        """Get call details from VAPI."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{VAPI_BASE_URL}/call/{call_id}",
                headers=self.headers,
                timeout=30.0
            )
            response.raise_for_status()
            return response.json()

    async def end_call(self, call_id: str) -> dict:
        """End an active call."""
        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{VAPI_BASE_URL}/call/{call_id}",
                headers=self.headers,
                timeout=30.0
            )
            response.raise_for_status()
            return response.json()

    def build_assistant_config(
        self,
        template: dict,
        contact_name: Optional[str] = None
    ) -> dict:
        """
        Build VAPI assistant configuration from our template.

        Args:
            template: Our call template from database
            contact_name: Name of the contact being called

        Returns:
            VAPI assistant configuration dict
        """
        # Build the system message from template
        system_message = f"""You are an AI phone assistant making a follow-up call.

Initial Message: {template.get('initial_message', 'Hello!')}

Questions to ask:
"""
        questions = template.get('questions', [])
        for i, q in enumerate(questions, 1):
            required = " (required)" if q.get('required') else ""
            system_message += f"{i}. {q['question']}{required}\n"

        if template.get('closing_message'):
            system_message += f"\nClosing Message: {template['closing_message']}"

        # Map our voice_id to VAPI voice config
        voice_config = self._get_voice_config(template.get('voice_id', 'nova'))

        assistant_config = {
            "model": {
                "provider": "openai",
                "model": "gpt-4o-mini",
                "messages": [
                    {
                        "role": "system",
                        "content": system_message
                    }
                ]
            },
            "voice": voice_config,
            "firstMessage": template.get('initial_message', 'Hello!'),
            "endCallMessage": template.get('closing_message', 'Thank you for your time. Goodbye!'),
            "maxDurationSeconds": template.get('max_duration_seconds', 300),
            "silenceTimeoutSeconds": 30,
            "responseDelaySeconds": 0.5,
            "transcriber": {
                "provider": "deepgram",
                "model": "nova-2",
                "language": "en"
            }
        }

        # Add server URL for webhooks if configured
        base_url = self.settings.BASE_URL
        if base_url and not base_url.startswith("http://localhost"):
            assistant_config["serverUrl"] = f"{base_url}/api/v1/webhooks/vapi"

        return assistant_config

    def _get_voice_config(self, voice_id: str) -> dict:
        """Map our voice IDs to VAPI voice configuration."""
        # Using OpenAI TTS voices via VAPI
        voice_map = {
            "alloy": {"provider": "openai", "voiceId": "alloy"},
            "echo": {"provider": "openai", "voiceId": "echo"},
            "fable": {"provider": "openai", "voiceId": "fable"},
            "onyx": {"provider": "openai", "voiceId": "onyx"},
            "nova": {"provider": "openai", "voiceId": "nova"},
            "shimmer": {"provider": "openai", "voiceId": "shimmer"},
        }
        return voice_map.get(voice_id, {"provider": "openai", "voiceId": "nova"})


def get_vapi_service() -> VAPIService:
    return VAPIService()
