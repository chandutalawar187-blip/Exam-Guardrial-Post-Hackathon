# services/network_monitor.py

import psutil
import socket

AI_API_DOMAINS = [
    'api.openai.com',
    'api.anthropic.com',
    'generativelanguage.googleapis.com',
    'api.groq.com',
    'api.cohere.ai',
    'api.mistral.ai',
    'api.perplexity.ai',
]


def resolve_to_domains(ip: str) -> str:
    try:
        return socket.gethostbyaddr(ip)[0]
    except Exception:
        return ip


def scan_ai_connections() -> list:
    """
    Scan all active TCP connections for outbound calls to known AI APIs.
    This catches students using ChatGPT, Claude, Gemini etc. directly.
    """
    findings = []

    try:
        for conn in psutil.net_connections(kind='tcp'):
            if conn.raddr and conn.status == 'ESTABLISHED':
                hostname = resolve_to_domains(conn.raddr.ip)
                matched = next(
                    (d for d in AI_API_DOMAINS if d in hostname), None
                )
                if matched:
                    try:
                        proc = psutil.Process(conn.pid)
                        findings.append({
                            'event_type': 'AI_API_CALL',
                            'severity': 'CRITICAL',
                            'score_delta': -35,
                            'metadata': {
                                'remote_ip': conn.raddr.ip,
                                'domain': matched,
                                'process': proc.name(),
                                'pid': conn.pid
                            }
                        })
                    except psutil.NoSuchProcess:
                        pass
    except psutil.AccessDenied:
        pass

    return findings
