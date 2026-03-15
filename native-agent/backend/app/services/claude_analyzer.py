# backend/app/services/claude_analyzer.py

import anthropic
import json
from app.config import settings

client = anthropic.Anthropic(api_key=settings.anthropic_api_key)


# ── FUNCTION 1: Real-Time Alert (Haiku — fast & cheap) ──────────

async def generate_haiku_alert(event: dict) -> str:
    """
    Called on every CRITICAL event.
    Returns one plain-English sentence the proctor can act on immediately.
    """
    response = client.messages.create(
        model='claude-haiku-4-5-20251001',
        max_tokens=100,
        messages=[{
            'role': 'user',
            'content': (
                f'Write exactly one plain-English sentence explaining this exam '
                f'integrity violation to a proctor with no technical background. '
                f'Be specific about what is happening and why it is suspicious. '
                f'Event type: {event["event_type"]}. '
                f'Details: {json.dumps(event.get("metadata", {}))}.'
            )
        }]
    )
    return response.content[0].text


# ── FUNCTION 2: Credibility Report (Sonnet — thorough) ──────────

async def generate_credibility_report(
    session_id: str, events: list, score: int
) -> dict:
    """
    Called at exam end or on proctor request.
    Returns a structured JSON report with verdict and recommendations.
    """
    event_summary = [
        {
            'type': e['event_type'],
            'severity': e['severity'],
            'time': e['timestamp'],
            'meta': e.get('metadata', {})
        }
        for e in events
    ]

    prompt = f'''You are an academic integrity analyst. Analyse this exam session and generate
a structured Credibility Report.

Session ID: {session_id}
Final Trust Score: {score}/100
Total Violations: {len(events)}

Violation Timeline: {json.dumps(event_summary, indent=2)}

Return ONLY valid JSON with exactly these fields:
{{
  "verdict": "CLEAR | UNDER_REVIEW | SUSPICIOUS | FLAGGED",
  "executive_summary": "2-3 sentence summary for university admin",
  "red_flags": [
    {{"timestamp": "...", "event": "...", "severity": "...",
      "explanation": "plain-English explanation"}}
  ],
  "recommendation": "specific action for institution",
  "confidence": 0.0
}}
    '''

    response = client.messages.create(
        model='claude-sonnet-4-6',
        max_tokens=1500,
        messages=[{'role': 'user', 'content': prompt}]
    )

    text = response.content[0].text
    # Strip markdown code fences if present
    text = text.replace('```json', '').replace('```', '').strip()
    return json.loads(text)


# ── FUNCTION 3: Answer Naturalness Scorer (Haiku) ───────────────

async def score_answer_naturalness(answer_text: str) -> dict:
    """
    Called on each exam answer submission.
    Returns probability that the answer was AI-generated.
    """
    response = client.messages.create(
        model='claude-haiku-4-5-20251001',
        max_tokens=200,
        messages=[{
            'role': 'user',
            'content': (
                'Analyse this exam answer for signs of AI generation. '
                'Return ONLY valid JSON: '
                '{"ai_probability": 0.0-1.0, "flag": true/false, '
                '"reason": "brief explanation"}. '
                f'Answer text: {answer_text}'
            )
        }]
    )
    text = response.content[0].text.strip()
    text = text.replace('```json', '').replace('```', '').strip()
    return json.loads(text)
