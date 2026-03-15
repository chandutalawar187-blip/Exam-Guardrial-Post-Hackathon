import pandas as pd
from datetime import datetime
import io

def generate_admin_excel_report(session_details: dict, events_l1: list, events_l4: list, answer_scores: list, credibility_report: dict) -> bytes:
    """
    Generates a multi-sheet Excel report matching the 'admin_report' structure in the system prompt.
    """
    
    # --- Sheet 1: All Students Summary (For this single session) ---
    summary_data = {
        "Student Name": [session_details.get("student_name", "Unknown")],
        "Student ID": [session_details.get("student_uid", session_details.get("id"))],
        "Score": [session_details.get("score", 100)],
        "Final Trust Score": [credibility_report.get("credibility_score", "N/A")],
        "Verdict": [credibility_report.get("verdict", "UNKNOWN")],
        "Violations": [len(events_l1) + len(events_l4)],
        "Action Status": ["CLEAN" if credibility_report.get("credibility_score", 100) >= 90 else "FLAGGED"]
    }
    df_summary = pd.DataFrame(summary_data)


    # --- Sheet 2: Detailed Violations ---
    violations_data = []
    
    # Process Layer 1 events (Browser)
    for event in events_l1:
        violations_data.append({
            "Timestamp": event.get("created_at"),
            "Layer": "L1 (Browser)",
            "Violation Type": event.get("event_type"),
            "Severity": event.get("severity"),
            "Score Penalty": event.get("score_delta", 0),
            "Metadata": str(event.get("metadata", {}))
        })
        
    # Process Layer 4 events (Native Forensic)
    for event in events_l4:
        violations_data.append({
            "Timestamp": event.get("created_at"),
            "Layer": "L4 (Native)",
            "Violation Type": event.get("event_type"),
            "Severity": event.get("severity"),
            "Score Penalty": event.get("score_delta", 0),
            "Metadata": str(event.get("metadata", {}))
        })
        
    df_violations = pd.DataFrame(violations_data)


    # --- Sheet 3: AI Detection Logs ---
    ai_logs = []
    for ans in answer_scores:
        ai_logs.append({
            "Question ID": ans.get("question_id"),
            "AI Probability": f"{ans.get('ai_probability', 0) * 100}%",
            "Verdict": ans.get("verdict"),
            "Signals Detected": ", ".join(ans.get("signals_detected", [])),
            "Flagged For Review": "Yes" if ans.get("flag_for_review") else "No"
        })
        
    df_ai_logs = pd.DataFrame(ai_logs)
    
    
    # --- Sheet 4: Exam Statistics / Red Flags ---
    red_flags_data = []
    if "red_flags" in credibility_report:
        for flag in credibility_report["red_flags"]:
            red_flags_data.append({
                "Red Flag ID": flag.get("flag_id"),
                "Description": flag.get("description"),
                "Confidence": flag.get("confidence")
            })
    df_red_flags = pd.DataFrame(red_flags_data)


    # Write to BytesIO Buffer
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df_summary.to_excel(writer, sheet_name='Summary', index=False)
        if not df_violations.empty:
            df_violations.to_excel(writer, sheet_name='Detailed Violations', index=False)
        else:
            pd.DataFrame([{"Message": "No violations detected."}]).to_excel(writer, sheet_name='Detailed Violations', index=False)
            
        if not df_ai_logs.empty:
             df_ai_logs.to_excel(writer, sheet_name='AI Detection Logs', index=False)
        else:
            pd.DataFrame([{"Message": "No AI answer analysis available."}]).to_excel(writer, sheet_name='AI Detection Logs', index=False)

        if not df_red_flags.empty:
            df_red_flags.to_excel(writer, sheet_name='Forensic Red Flags', index=False)

    
    return output.getvalue()
