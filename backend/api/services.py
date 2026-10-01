from django.utils import timezone
from .models import Evaluation, Setting, Skill


def mean(a):
    return sum(a) / len(a) if a else 0


def skills_for(c):
    hard = list(Skill.objects.filter(domain=c.domain, category="HARD", active=True).order_by("id"))
    soft = list(Skill.objects.filter(domain=None, category="SOFT", active=True).order_by("id"))
    return hard, soft


def submit_evaluation(e):
    """Validate completeness, compute weighted scores, lock. Recommendation is NEVER auto-picked."""
    hard, soft = skills_for(e.candidate)
    got = {r.skill_id: r.score for r in e.ratings.all()}
    missing = [s.name for s in hard + soft if s.id not in got]
    if missing:
        raise ValueError("Rate all skills first. Missing: " + ", ".join(missing))
    if not e.recommendation:
        raise ValueError("Select a recommendation (decision must be made by the interviewer)")
    w = Setting.get()
    hs, ss = mean([got[s.id] for s in hard]), mean([got[s.id] for s in soft])
    e.hard_score, e.soft_score = round(hs, 1), round(ss, 1)
    e.overall_score = round((hs * w.hard_weight + ss * w.soft_weight) / 100, 1)
    e.hard_weight, e.soft_weight = w.hard_weight, w.soft_weight
    e.status, e.submitted_at = "SUBMITTED", timezone.now()
    e.save()
    e.candidate.status = "Evaluated"
    e.candidate.save()


def insights(e):
    """Automation/analytics: peer percentile in same domain + strengths / improvement areas."""
    rs = list(e.ratings.select_related("skill").order_by("-score", "skill_id"))
    peers = list(Evaluation.objects.filter(status="SUBMITTED", candidate__domain=e.candidate.domain)
                 .exclude(pk=e.pk).values_list("overall_score", flat=True))
    pct = None
    if peers and e.overall_score is not None:
        pct = round(100 * sum(1 for p in peers if p < e.overall_score) / len(peers))
    return {"percentile": pct, "peers": len(peers),
            "strengths": [r.skill.name for r in rs[:3] if r.score >= 7],
            "improve": [r.skill.name for r in rs[::-1][:3] if r.score <= 6]}
