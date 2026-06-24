import logging
import json
from typing import Optional
from openai import AsyncOpenAI

from app.config import get_settings

logger = logging.getLogger(__name__)


class OpenAIService:
    """Service for OpenAI-powered extraction and analysis."""

    def __init__(self):
        settings = get_settings()
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = "gpt-4o-mini"

    async def extract_from_transcript(
        self,
        transcript: list[dict],
        questions: list[dict],
        extraction_schema: Optional[dict] = None
    ) -> dict:
        """
        Extract structured data from call transcript based on template questions.

        Args:
            transcript: List of {speaker, text, timestamp} entries
            questions: List of questions from the template
            extraction_schema: Optional custom extraction schema

        Returns:
            Dictionary with extracted answers and metadata
        """
        if not transcript:
            return {
                'answers': {},
                'summary': 'No transcript available',
                'sentiment': 'neutral'
            }

        # Format transcript for the prompt
        formatted_transcript = self._format_transcript(transcript)

        # Build extraction prompt
        prompt = self._build_extraction_prompt(
            formatted_transcript,
            questions,
            extraction_schema
        )

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": """You are an expert at analyzing phone call transcripts and extracting structured information.

Your task is to:
1. Extract answers to specific questions from the conversation
2. Provide a brief summary of the call
3. Assess the overall sentiment of the contact

Always respond with valid JSON. Be precise and extract only information that was explicitly stated or clearly implied."""
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                response_format={"type": "json_object"},
                temperature=0.1
            )

            result = json.loads(response.choices[0].message.content)

            return {
                'answers': result.get('answers', {}),
                'summary': result.get('summary', ''),
                'sentiment': result.get('sentiment', 'neutral'),
                'key_points': result.get('key_points', []),
                'follow_up_needed': result.get('follow_up_needed', False),
                'follow_up_reason': result.get('follow_up_reason', '')
            }

        except Exception as e:
            logger.error(f"OpenAI extraction failed: {e}")
            return {
                'answers': {},
                'summary': 'Extraction failed',
                'sentiment': 'unknown',
                'error': str(e)
            }

    def _format_transcript(self, transcript: list[dict]) -> str:
        """Format transcript into readable text."""
        lines = []
        for entry in transcript:
            speaker = "Agent" if entry.get('speaker') == 'agent' else "Contact"
            text = entry.get('text', '')
            lines.append(f"{speaker}: {text}")
        return "\n".join(lines)

    def _build_extraction_prompt(
        self,
        transcript: str,
        questions: list[dict],
        extraction_schema: Optional[dict] = None
    ) -> str:
        """Build the extraction prompt."""

        # Format questions
        questions_text = ""
        if questions:
            questions_text = "Questions to extract answers for:\n"
            for i, q in enumerate(questions, 1):
                q_text = q.get('question', q) if isinstance(q, dict) else q
                q_id = q.get('id', f'q{i}') if isinstance(q, dict) else f'q{i}'
                q_type = q.get('type', 'open_ended') if isinstance(q, dict) else 'open_ended'
                questions_text += f"- ID: {q_id} | Type: {q_type} | Question: {q_text}\n"

        # Custom schema fields
        schema_text = ""
        if extraction_schema:
            schema_text = "\nAdditional fields to extract:\n"
            for field, desc in extraction_schema.items():
                schema_text += f"- {field}: {desc}\n"

        prompt = f"""Analyze the following phone call transcript and extract information.

TRANSCRIPT:
{transcript}

{questions_text}
{schema_text}

Respond with a JSON object containing:
{{
    "answers": {{
        "<question_id>": {{
            "value": "<extracted answer or null if not found>",
            "confidence": <0.0 to 1.0>,
            "source_quote": "<relevant quote from transcript>"
        }}
    }},
    "summary": "<2-3 sentence summary of the call>",
    "sentiment": "<positive|neutral|negative>",
    "key_points": ["<key point 1>", "<key point 2>"],
    "follow_up_needed": <true|false>,
    "follow_up_reason": "<reason if follow-up needed, empty otherwise>"
}}

Rules:
- Only extract information explicitly stated or clearly implied in the transcript
- Set confidence lower if the answer required interpretation
- Use null for questions that weren't answered
- Be concise in summaries"""

        return prompt

    async def summarize_call(self, transcript: list[dict]) -> str:
        """Generate a brief summary of the call."""
        if not transcript:
            return "No transcript available"

        formatted = self._format_transcript(transcript)

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "Summarize phone calls in 2-3 concise sentences."
                    },
                    {
                        "role": "user",
                        "content": f"Summarize this call:\n\n{formatted}"
                    }
                ],
                temperature=0.3,
                max_tokens=150
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"Summary generation failed: {e}")
            return "Summary unavailable"


_openai_service: Optional[OpenAIService] = None


def get_openai_service() -> OpenAIService:
    """Get or create OpenAI service singleton."""
    global _openai_service
    if _openai_service is None:
        _openai_service = OpenAIService()
    return _openai_service
