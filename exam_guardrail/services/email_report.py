# exam_guardrail/services/email_report.py
"""
Email report service — sends threat summary to admin.
Uses SMTP (Gmail, Outlook, etc.) or falls back to logging.
Environment variables:
    SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
"""

import smtplib
import os
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

log = logging.getLogger('email_report')

SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))
SMTP_USER = os.environ.get('SMTP_USER', '')
SMTP_PASS = os.environ.get('SMTP_PASS', '')
SMTP_FROM = os.environ.get('SMTP_FROM', SMTP_USER)


def send_report_email(to_email: str, session_id: str, student_name: str,
                      exam_name: str, findings: list, stats: dict) -> bool:
    """
    Send a threat summary email to the admin.
    Returns True on success, False on failure.
    """
    if not to_email:
        log.warning('No admin email provided, skipping email report')
        return False

    subject = f'[ExamGuardrail] Threat Report — {student_name} ({exam_name})'

    # Build HTML body
    threat_count = len(findings)
    blocked_count = sum(1 for f in findings if 'BLOCKED' in (f.get('event_type') or ''))
    critical_count = sum(1 for f in findings if (f.get('severity') or '').upper() in ('CRITICAL', 'HIGH'))

    rows = ''
    for f in findings[:50]:  # Cap at 50 for email readability
        sev = (f.get('severity') or 'MEDIUM').upper()
        sev_color = '#EF4444' if sev in ('CRITICAL', 'HIGH') else '#F59E0B' if sev == 'MEDIUM' else '#3B82F6'
        etype = f.get('event_type', 'UNKNOWN')
        meta = f.get('metadata') or {}
        reason = meta.get('reason', meta.get('process', ''))
        ts = f.get('created_at', '')
        rows += f'''<tr>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;">
                <span style="color:{sev_color};font-weight:bold;font-size:11px;">{sev}</span>
            </td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-family:monospace;font-size:12px;">{etype}</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#6b7280;">{reason}</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-size:11px;color:#9ca3af;">{ts}</td>
        </tr>'''

    html = f'''
    <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
        <div style="background:#001D39;padding:24px 32px;">
            <h1 style="color:#ffffff;margin:0;font-size:20px;">🛡️ ExamGuardrail Threat Report</h1>
            <p style="color:#7BBDE8;margin:4px 0 0;font-size:13px;">Generated {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}</p>
        </div>

        <div style="padding:24px 32px;">
            <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
                <tr>
                    <td style="padding:8px 0;color:#6b7280;font-size:13px;">Student</td>
                    <td style="padding:8px 0;font-weight:bold;">{student_name}</td>
                </tr>
                <tr>
                    <td style="padding:8px 0;color:#6b7280;font-size:13px;">Exam</td>
                    <td style="padding:8px 0;font-weight:bold;">{exam_name}</td>
                </tr>
                <tr>
                    <td style="padding:8px 0;color:#6b7280;font-size:13px;">Session Code</td>
                    <td style="padding:8px 0;font-family:monospace;font-weight:bold;">{session_id}</td>
                </tr>
            </table>

            <div style="display:flex;gap:12px;margin-bottom:24px;">
                <div style="flex:1;background:#FEF2F2;border-radius:8px;padding:16px;text-align:center;">
                    <div style="font-size:28px;font-weight:900;color:#EF4444;">{threat_count}</div>
                    <div style="font-size:11px;color:#991B1B;font-weight:bold;">TOTAL THREATS</div>
                </div>
                <div style="flex:1;background:#FFF7ED;border-radius:8px;padding:16px;text-align:center;">
                    <div style="font-size:28px;font-weight:900;color:#F59E0B;">{critical_count}</div>
                    <div style="font-size:11px;color:#92400E;font-weight:bold;">CRITICAL/HIGH</div>
                </div>
                <div style="flex:1;background:#EFF6FF;border-radius:8px;padding:16px;text-align:center;">
                    <div style="font-size:28px;font-weight:900;color:#3B82F6;">{blocked_count}</div>
                    <div style="font-size:11px;color:#1E40AF;font-weight:bold;">BLOCKED</div>
                </div>
            </div>

            {'<h3 style="margin:0 0 8px;font-size:14px;color:#001D39;">Threat Details</h3>' if findings else ''}
            {'<table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="background:#f3f4f6;"><th style="padding:8px;text-align:left;font-size:11px;color:#6b7280;">SEV</th><th style="padding:8px;text-align:left;font-size:11px;color:#6b7280;">EVENT</th><th style="padding:8px;text-align:left;font-size:11px;color:#6b7280;">DETAIL</th><th style="padding:8px;text-align:left;font-size:11px;color:#6b7280;">TIME</th></tr></thead><tbody>' + rows + '</tbody></table>' if findings else '<p style="color:#9ca3af;font-style:italic;">No threats detected during this session.</p>'}
        </div>

        <div style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:11px;color:#9ca3af;">
                This report was generated automatically by ExamGuardrail Desktop Agent.
                View full details at <a href="https://exam-guardrial-post-hackathon.vercel.app/admin/reports" style="color:#3B82F6;">Admin Dashboard</a>.
            </p>
        </div>
    </div>
    '''

    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = SMTP_FROM or 'ExamGuardrail <noreply@examguardrail.app>'
    msg['To'] = to_email
    msg.attach(MIMEText(html, 'html'))

    if not SMTP_USER or not SMTP_PASS:
        log.info(f'SMTP not configured — email report logged instead:\n  To: {to_email}\n  Subject: {subject}\n  Threats: {threat_count}')
        return False

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_FROM, [to_email], msg.as_string())
        log.info(f'Threat report emailed to {to_email} ({threat_count} findings)')
        return True
    except Exception as e:
        log.error(f'Email send failed: {e}')
        return False
