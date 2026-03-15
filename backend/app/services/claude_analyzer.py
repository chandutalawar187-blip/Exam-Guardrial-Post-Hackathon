# backend/app/services/claude_analyzer.py

import anthropic
import json
import re
from typing import List, Dict, Any, Optional
from app.config import settings

client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

def clean_json_response(text: str) -> str:
    """
    Strips backtick fences and other common LLM output artifacts to ensure valid JSON.
    """
    text = text.strip()
    # Remove ```json ... ``` or ``` ... ```
    text = re.sub(r'^```(?:json)?\s*', '', text)
    text = re.sub(r'\s*```$', '', text)
    return text.strip()

# ── AGENT-A: Real-Time Alert (Haiku) ──────────────────────────

async def generate_haiku_alert(event_json: dict) -> dict:
    """
    id: AGENT-A
    purpose: Translate raw JSON telemetry anomalies into a single plain-English sentence.
    """
    system_prompt = (
        "You are a real-time exam integrity alert engine. You receive a single structured JSON violation event "
        "from a multi-layer proctoring system. Your ONLY job is to output a concise, plain-English one-sentence "
        "alert and a severity classification. You MUST return ONLY a valid JSON object — no markdown, no code fences, "
        "no explanation, no preamble. Any deviation from valid JSON is a critical failure."
    )
    
    user_content = (
        f"VIOLATION EVENT (layer: {event_json.get('layer', 'UNKNOWN')}):\n\n"
        f"{json.dumps(event_json, indent=2)}\n\n"
        "Return EXACTLY this JSON schema — no extra keys:\n"
        "{\n"
        "  \"alert_sentence\": \"one plain-English sentence for a non-technical proctor\",\n"
        "  \"severity\": \"LOW | MEDIUM | HIGH | CRITICAL\",\n"
        "  \"layer\": \"L1 | L2 | L3 | L4 | L5\",\n"
        "  \"suggested_action\": \"Monitor | Warn Student | Flag for Review | Terminate Session\",\n"
        "  \"confidence\": 0.0\n"
        "}"
    )

    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=512,
            temperature=0,
            system=system_prompt,
            messages=[{"role": "user", "content": user_content}]
        )
        
        raw_text = response.content[0].text
        cleaned_text = clean_json_response(raw_text)
        return json.loads(cleaned_text)
    except Exception as e:
        print(f"[AGENT-A ERROR] {str(e)}")
        # Fallback to simple description if AI fails
        return {
            "alert_sentence": f"Anomaly detected in {event_json.get('layer')} layer: {event_json.get('event_type')}",
            "severity": event_json.get('severity', 'HIGH'),
            "layer": event_json.get('layer', 'L1'),
            "suggested_action": "Flag for Review",
            "confidence": 0.5
        }

# ── AGENT-B: Credibility Report (Sonnet) ──────────────────────

async def generate_credibility_report(
    session_metadata: dict,
    l1_events: dict,
    l2_events: dict,
    l3_events: dict,
    l4_events: dict,
    l5_ml_scores: dict,
    webcam_signals: dict,
    answer_naturalness: dict
) -> dict:
    """
    id: AGENT-B
    purpose: Ingest full violation timeline + ML scores to produce a structured forensic report.
    """
    system_prompt = (
        "You are a senior AI forensic analyst embedded in an academic integrity platform. You receive the complete "
        "violation timeline, machine-learning anomaly scores, and webcam signals from an exam session. You must "
        "synthesize ALL layers into a structured Credibility Report with a final verdict and actionable recommendation "
        "for the exam board. You MUST return ONLY a valid JSON object — no markdown, no code fences, no preamble. "
        "Any deviation from valid JSON is a critical failure."
    )

    user_content = f"""CREDIBILITY REPORT REQUEST

=== SESSION METADATA ===
{json.dumps(session_metadata, indent=2)}

=== L1 — BROWSER SENSOR EVENTS ===
{json.dumps(l1_events, indent=2)}

=== L2 — HIDDEN WINDOW SCANNER ===
{json.dumps(l2_events, indent=2)}

=== L3 — NETWORK MONITOR ===
{json.dumps(l3_events, indent=2)}

=== L4 — PROCESS FORENSICS ===
{json.dumps(l4_events, indent=2)}

=== L5 — ML ANOMALY SCORES (IsolationForest) ===
{json.dumps(l5_ml_scores, indent=2)}

=== WEBCAM / GAZE SIGNALS ===
{json.dumps(webcam_signals, indent=2)}

=== ANSWER NATURALNESS SCORES (from Agent C) ===
{json.dumps(answer_naturalness, indent=2)}

Generate the Credibility Report in EXACTLY this JSON schema:
{{
  "session_id": "string",
  "candidate_id": "string",
  "exam_name": "string",
  "credibility_score": 0,
  "verdict": "CLEAR | UNDER_REVIEW | SUSPICIOUS | FLAGGED",
  "final_score_after_deductions": 0.0,
  "deductions_applied": [
    {{"reason": "string", "points_deducted": 0.0}}
  ],
  "risk_breakdown": {{
    "L1_browser_risk": 0,
    "L2_overlay_risk": 0,
    "L3_network_risk": 0,
    "L4_process_risk": 0,
    "L5_ml_anomaly_risk": 0,
    "answer_naturalness_risk": 0
  }},
  "red_flags": ["ranked list of top violations, most severe first"],
  "timeline_of_key_events": [
    {{"time": "T+Xmin", "event": "string", "layer": "LX", "severity": "string"}}
  ],
  "executive_summary": "3–5 sentence human-readable summary for exam board",
  "recommendation": "Proceed | Manual Review | Disqualify",
  "recommended_actions": ["specific next steps for the institution"],
  "generated_at": "2025-03-14T10:23:44Z"
}}
"""

    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514", # Updated to spec (placeholder for future version mapping)
            max_tokens=2048,
            temperature=0,
            system=system_prompt,
            messages=[{"role": "user", "content": user_content}]
        )
        
        raw_text = response.content[0].text
        cleaned_text = clean_json_response(raw_text)
        report = json.loads(cleaned_text)
        
        try:
            from app.db.supabase_client import get_db
            db = get_db()
            session = session_metadata
            db.table('credibility_reports').insert({
                'session_id': session.get('id', session.get('session_id')),
                'student_id': session.get('student_id', session.get('candidate_id')),
                'student_name': session.get('student_name', 'Unknown'),
                'exam_name': session.get('exam_name', 'Unknown'),
                'verdict': report.get('verdict', 'UNDER_REVIEW'),
                'credibility_score': report.get('credibility_score', 0),
                'executive_summary': report.get('executive_summary', ''),
                'policy_violations': report.get('policy_violations', []),
                'comparable_past_cases': report.get('comparable_past_cases', ''),
                'recommendation': report.get('recommendation', ''),
                'confidence': report.get('confidence', 0.0)
            }).execute()
        except Exception as db_err:
            print(f"[Supabase DB Insert Error] {db_err}")

        return report
    except Exception as e:
        print(f"[AGENT-B ERROR] {str(e)}")
        return {"error": str(e), "verdict": "UNDER_REVIEW"}

# ── AGENT-C: Answer Naturalness Scorer (Haiku) ───────────────

async def score_answer_naturalness(
    session_id: str,
    candidate_id: str,
    question_id: str,
    question_text: str,
    student_answer: str,
    time_to_answer_seconds: int
) -> dict:
    """
    id: AGENT-C
    purpose: Score the probability that a submitted exam answer was generated by an LLM.
    """
    system_prompt = (
        "You are an AI-generated text detection engine specialized in academic exam contexts. You receive a "
        "student's exam answer and must assess the probability that it was generated by a Large Language Model "
        "rather than written by a human student under exam conditions. Consider: unnatural fluency, over-structured "
        "formatting, no spelling/grammar errors typical of rushed writing, use of hedging phrases, and content "
        "too complete for time constraints. You MUST return ONLY a valid JSON object — no markdown, no preamble."
    )

    word_count = len(student_answer.split())
    
    user_content = f"""ANSWER NATURALNESS EVALUATION

session_id: {session_id}
candidate_id: {candidate_id}
question_id: {question_id}
question: "{question_text}"
time_to_answer_seconds: {time_to_answer_seconds}
word_count: {word_count}

student_answer: "{student_answer}"

Return EXACTLY this JSON schema:
{{
  "question_id": "string",
  "ai_probability": 0.0,
  "verdict": "Human | Possibly AI | Likely AI | AI Generated",
  "signals_detected": ["list of specific signals"],
  "human_signals": ["any signals suggesting genuine human authorship"],
  "time_plausibility": "Plausible | Suspicious | Implausible",
  "flag_for_review": true
}}
"""

    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=512,
            temperature=0,
            system=system_prompt,
            messages=[{"role": "user", "content": user_content}]
        )
        
        raw_text = response.content[0].text
        cleaned_text = clean_json_response(raw_text)
        return json.loads(cleaned_text)
    except Exception as e:
        print(f"[AGENT-C ERROR] {str(e)}")
        return {"question_id": question_id, "ai_probability": 0.0, "verdict": "Human"}

# ── AGENT-D: Automatic Question Synthesis (Haiku) ────────────

async def generate_exam_questions(
    topic: str,
    difficulty: str,
    question_count: int,
    exam_name: str
) -> List[dict]:
    """
    id: AGENT-D
    purpose: Generate a parsable JSON array of MCQ exam questions.
    """
    system_prompt = (
        "You are an academic exam question generator. You receive a topic, difficulty level, and question count, "
        "and you output a structured JSON array of multiple-choice questions. Each question must have exactly 4 "
        "options (A, B, C, D), one correct answer, and a brief explanation. You MUST return ONLY a valid JSON "
        "array — no markdown, no code fences, no preamble, no explanation outside the JSON."
    )

    user_content = f"""QUESTION GENERATION REQUEST

topic: "{topic}"
difficulty: "{difficulty}"
question_count: {question_count}
exam_name: "{exam_name}"

Return EXACTLY this JSON schema — an array of question objects:
[
  {{
    "question_id": "Q_001",
    "question_text": "string",
    "options": {{
      "A": "string",
      "B": "string",
      "C": "string",
      "D": "string"
    }},
    "correct_answer": "A | B | C | D",
    "explanation": "one sentence explaining why the answer is correct",
    "difficulty": "EASY | MEDIUM | HARD",
    "topic_tag": "string"
  }}
]
"""

    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=2048,
            temperature=0.3,
            system=system_prompt,
            messages=[{"role": "user", "content": user_content}]
        )
        
        raw_text = response.content[0].text
        cleaned_text = clean_json_response(raw_text)
        return json.loads(cleaned_text)
    except Exception as e:
        print(f"[AGENT-D ERROR] {str(e)}")
        return []
