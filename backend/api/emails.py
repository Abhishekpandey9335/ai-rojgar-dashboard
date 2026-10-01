import json
from html import escape as esc


def band(n):
    return "Very Poor" if n <= 2 else "Below Average" if n <= 4 else "Average" if n <= 6 else "Good" if n <= 8 else "Excellent"


def _layout(body):
    return ('<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">'
            '<div style="background:linear-gradient(90deg,#4338ca,#8b5cf6);color:#fff;padding:18px;font-size:20px"><b>Ai Rojgar</b></div>'
            f'<div style="padding:22px;color:#1e1b4b;font-size:14px;line-height:1.55">{body}</div></div>')


def _rows(rs, comments):
    out = ""
    for r in rs:
        c = f'<br><i style="color:#6b7280">{esc(r.comment)}</i>' if comments and r.comment else ""
        tl = json.loads(r.tips or "[]")
        if tl:
            c += ('<div style="margin:4px 0 6px;padding:8px 10px;background:#f5f3ff;border-radius:8px;font-size:13px"><b>How to improve:</b>'
                  '<ul style="margin:4px 0 0 18px;padding:0">' + "".join(f"<li>{esc(t)}</li>" for t in tl) + "</ul></div>")
        out += (f'<tr style="border-top:1px solid #eee"><td style="padding:6px 0">{esc(r.skill.name)}{c}</td>'
                f'<td style="text-align:right;white-space:nowrap">{r.score}/10 ({band(r.score)})</td></tr>')
    return f'<table style="width:100%;border-collapse:collapse">{out}</table>'


def _split(e):
    rs = list(e.ratings.select_related("skill").order_by("skill_id"))
    return [r for r in rs if r.skill.category == "HARD"], [r for r in rs if r.skill.category == "SOFT"]


def candidate_email(e):  # candidate-safe: no internal comments
    hard, soft = _split(e)
    c = e.candidate
    remarks = f"<h3>Final Remarks</h3><p>{esc(e.final_remarks)}</p>" if e.share_remarks and e.final_remarks else ""
    html = _layout(f"""<p>Dear {esc(c.name)},</p>
<p>Thank you for participating in the interview process at Ai Rojgar. Here is your interview evaluation summary:</p>
<p><b>Applied Role:</b> {esc(c.applied_role)}<br><b>Interview Domain:</b> {esc(c.domain.name)}<br><b>Interview Date:</b> {c.interview_date}</p>
<p><b>Hard Skills Score:</b> {e.hard_score}/10<br><b>Soft Skills Score:</b> {e.soft_score}/10<br>
<b>Overall Score:</b> {e.overall_score}/10 ({band(e.overall_score)})<br><b>Recommendation:</b> {esc(e.recommendation)}</p>
<h3>Hard Skill Evaluation</h3>{_rows(hard, False)}<h3>Soft Skill Evaluation</h3>{_rows(soft, False)}{remarks}
<p>Thank you,<br>Ai Rojgar<br>airojgar.in</p>""")
    text = f"Dear {c.name}, your overall interview score is {e.overall_score}/10. Recommendation: {e.recommendation}."
    return "Ai Rojgar - Interview Evaluation Result", html, text


def admin_email(e):  # detailed, includes internal comments
    hard, soft = _split(e)
    c = e.candidate
    html = _layout(f"""<h2 style="margin-top:0">Interview Evaluation #{e.id}</h2>
<p><b>Candidate:</b> {esc(c.name)} ({esc(c.email)}, {esc(c.phone or '-')})<br><b>Applied Role:</b> {esc(c.applied_role)}<br>
<b>Domain:</b> {esc(c.domain.name)}<br><b>Round:</b> {esc(c.interview_round)} | <b>Date:</b> {c.interview_date}<br>
<b>Interviewer:</b> {esc(e.interviewer)}<br><b>Submitted:</b> {e.submitted_at}</p>
<p><b>Hard:</b> {e.hard_score}/10 ({e.hard_weight}%) | <b>Soft:</b> {e.soft_score}/10 ({e.soft_weight}%) | <b>Overall:</b> {e.overall_score}/10<br>
<b>Recommendation:</b> {esc(e.recommendation)}</p>
<h3>Hard Skills</h3>{_rows(hard, True)}<h3>Soft Skills</h3>{_rows(soft, True)}
<h3>Final Remarks</h3><p>{esc(e.final_remarks or '-')}</p>""")
    return f"Interview Evaluation - {c.name} - {c.applied_role}", html, f"{c.name}: {e.overall_score}/10, {e.recommendation}"
