import csv
import json
from datetime import timedelta
from functools import wraps

from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.core.mail import EmailMultiAlternatives
from django.core.validators import validate_email
from django.db.models import Avg
from django.http import HttpResponse, JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from .emails import admin_email, candidate_email
from .models import Candidate, Domain, EmailLog, Evaluation, Rating, Setting, Skill
from .services import insights, mean, skills_for, submit_evaluation

RECS = ["Best", "Better", "Good", "Average", "Poor", "Very Poor"]


class ApiError(Exception):
    def __init__(self, msg, status=400):
        self.msg, self.status = msg, status


def api(methods):
    def deco(fn):
        @csrf_exempt
        @wraps(fn)
        def wrapper(request, *a, **k):
            if request.method not in methods:
                return JsonResponse({"success": False, "message": "Method not allowed"}, status=405)
            try:
                data = fn(request, *a, **k)
                return data if isinstance(data, HttpResponse) else JsonResponse({"success": True, "data": data})
            except ApiError as e:
                return JsonResponse({"success": False, "message": e.msg}, status=e.status)
            except ObjectDoesNotExist:
                return JsonResponse({"success": False, "message": "Not found"}, status=404)
            except ValueError as e:
                return JsonResponse({"success": False, "message": str(e)}, status=400)
        return wrapper
    return deco


def body(request):
    try:
        return json.loads(request.body or "{}")
    except json.JSONDecodeError:
        raise ApiError("Invalid JSON")


def cand_out(c):
    ev = c.evaluations.order_by("-created_at").first()
    return {"id": c.id, "name": c.name, "email": c.email, "phone": c.phone, "applied_role": c.applied_role,
            "domain": c.domain.name, "domain_id": c.domain_id, "interview_date": str(c.interview_date),
            "interview_round": c.interview_round, "experience_level": c.experience_level, "status": c.status,
            "evaluation_id": ev.id if ev else None, "overall": ev.overall_score if ev else None,
            "recommendation": ev.recommendation if ev else "", "eval_status": ev.status if ev else None}


def eval_out(e):
    hard, soft = skills_for(e.candidate)
    locked = e.status == "SUBMITTED"
    s = Setting.get()
    return {"id": e.id, "candidate": cand_out(e.candidate), "interviewer": e.interviewer, "status": e.status,
            "recommendation": e.recommendation, "final_remarks": e.final_remarks, "share_remarks": e.share_remarks,
            "hard_score": e.hard_score, "soft_score": e.soft_score, "overall_score": e.overall_score,
            "weights": {"hard": e.hard_weight if locked else s.hard_weight, "soft": e.soft_weight if locked else s.soft_weight},
            "hard_skills": [{"id": k.id, "name": k.name} for k in hard],
            "soft_skills": [{"id": k.id, "name": k.name} for k in soft],
            "ratings": {str(r.skill_id): {"score": r.score, "comment": r.comment, "tips": json.loads(r.tips or "[]")} for r in e.ratings.all()},
            "insights": insights(e) if locked else None,
            "email": {"candidate": e.candidate_email_sent_at, "admin": e.admin_email_sent_at}}


@api(["GET"])
def dashboard(request):
    subs = Evaluation.objects.filter(status="SUBMITTED")
    agg = subs.aggregate(h=Avg("hard_score"), s=Avg("soft_score"), o=Avg("overall_score"))
    r1 = lambda x: round(x, 1) if x is not None else None
    domains = []
    for d in Domain.objects.all():
        a = subs.filter(candidate__domain=d).aggregate(a=Avg("overall_score"))["a"]
        if a is not None:
            domains.append({"name": d.name, "avg": r1(a)})
    total = Candidate.objects.count()
    week_ago = timezone.now().date() - timedelta(days=7)
    return {"totals": {"candidates": total, "completed": subs.count(), "pending": max(total - subs.count(), 0),
                       "interviews_week": Candidate.objects.filter(interview_date__gte=week_ago).count(), "avg_overall": r1(agg["o"])},
            "recs": {r: subs.filter(recommendation=r).count() for r in RECS},
            "avg": {"hard": r1(agg["h"]), "soft": r1(agg["s"])}, "domains": domains,
            "trend": [{"name": e.candidate.name.split()[0], "score": e.overall_score}
                      for e in subs.select_related("candidate").order_by("-submitted_at")[:8][::-1]]}


@api(["GET"])
def domains(request):
    return [{"id": d.id, "name": d.name, "skills": [{"id": s.id, "name": s.name} for s in d.skills.filter(active=True)]}
            for d in Domain.objects.all()]


@api(["GET", "PUT"])
def settings_view(request):
    s = Setting.get()
    if request.method == "PUT":
        b = body(request)
        h, so = int(b.get("hard", 0)), int(b.get("soft", 0))
        if h + so != 100 or h < 0 or so < 0:
            raise ApiError("Weights must total 100")
        s.hard_weight, s.soft_weight = h, so
        s.save()
    return {"hard": s.hard_weight, "soft": s.soft_weight}


@api(["POST"])
def skill_add(request):
    b = body(request)
    if not str(b.get("name", "")).strip():
        raise ApiError("Skill name required")
    s = Skill.objects.create(domain_id=b["domain_id"], name=b["name"].strip(), category="HARD")
    return {"id": s.id}


@api(["DELETE"])
def skill_del(request, pk):
    Skill.objects.filter(pk=pk).update(active=False)  # soft delete keeps old ratings
    return None


@api(["GET", "POST"])
def candidates(request):
    if request.method == "POST":
        b = body(request)
        for f in ("name", "email", "applied_role", "domain_id", "interview_date"):
            if not str(b.get(f, "")).strip():
                raise ApiError(f"{f.replace('_', ' ').title()} is required")
        try:
            validate_email(b["email"])
        except ValidationError:
            raise ApiError("Invalid candidate email")
        keys = ["name", "email", "phone", "applied_role", "domain_id", "interview_date", "interview_round",
                "experience_level", "resume_url", "linkedin_url", "github_url", "status"]
        return cand_out(Candidate.objects.create(**{k: b[k] for k in keys if b.get(k)}))
    return [cand_out(c) for c in Candidate.objects.select_related("domain").order_by("-created_at")]


@api(["POST"])
def evaluations(request):
    b = body(request)
    who = str(b.get("interviewer", "")).strip()
    if not who:
        raise ApiError("Interviewer name required")
    e, _ = Evaluation.objects.get_or_create(candidate_id=b["candidate_id"], interviewer=who)
    return {"id": e.id}


@api(["GET", "PUT"])
def evaluation(request, pk):
    e = Evaluation.objects.select_related("candidate__domain").get(pk=pk)
    if request.method == "PUT":
        if e.status == "SUBMITTED":
            raise ApiError("Evaluation is locked", 423)
        b = body(request)
        hard, soft = skills_for(e.candidate)
        allowed = {s.id for s in hard + soft}
        for r in b.get("ratings", []):
            sc = r.get("score")
            if r.get("skill_id") not in allowed or not isinstance(sc, int) or not 1 <= sc <= 10:
                raise ApiError("Invalid rating")
            tl = r.get("tips") if isinstance(r.get("tips"), list) else []
            tl = [str(t)[:200] for t in tl][:8] if sc <= 6 else []
            Rating.objects.update_or_create(evaluation=e, skill_id=r["skill_id"],
                                            defaults={"score": sc, "comment": str(r.get("comment", ""))[:1000], "tips": json.dumps(tl)})
        rec = b.get("recommendation", "")
        e.recommendation = rec if rec in RECS else ""
        e.final_remarks = str(b.get("final_remarks", ""))[:3000]
        e.share_remarks = bool(b.get("share_remarks"))
        e.save()
        if e.candidate.status != "Evaluated":
            e.candidate.status = "Evaluation Pending"
            e.candidate.save()
    return eval_out(e)


@api(["POST"])
def submit(request, pk):
    e = Evaluation.objects.select_related("candidate__domain").get(pk=pk)
    if e.status == "SUBMITTED":
        raise ApiError("Already submitted", 409)
    submit_evaluation(e)
    return eval_out(e)


@api(["POST"])
def unlock(request, pk):  # no auth in this build: protect before production
    e = Evaluation.objects.get(pk=pk)
    if e.status != "SUBMITTED":
        raise ApiError("Evaluation is not locked")
    e.status = "UNLOCKED"
    e.save()
    return None


@api(["POST"])
def send_email(request, pk):
    e = Evaluation.objects.select_related("candidate__domain").get(pk=pk)
    if e.status != "SUBMITTED":
        raise ApiError("Submit the evaluation first")
    force = request.GET.get("resend") == "true"
    if e.candidate_email_sent_at and e.admin_email_sent_at and not force:
        raise ApiError("Email already sent", 409)
    if not settings.EMAIL_HOST_USER or not settings.EMAIL_HOST_PASSWORD:
        raise ApiError("Email not configured. Open backend/.env, fill EMAIL_HOST_USER and EMAIL_HOST_PASSWORD "
                       "(Gmail App Password), save, then restart the backend (run.bat).")
    out, failed = {}, False
    jobs = [("CANDIDATE", e.candidate.email, candidate_email(e), "candidate_email_sent_at"),
            ("ADMIN", settings.ADMIN_EMAIL, admin_email(e), "admin_email_sent_at")]
    for kind, to, (subject, html, text), field in jobs:
        if getattr(e, field) and not force:
            out[kind] = "already sent"
            continue
        try:
            m = EmailMultiAlternatives(subject, text, settings.EMAIL_HOST_USER, [to])
            m.attach_alternative(html, "text/html")
            m.send()
            setattr(e, field, timezone.now())
            e.save()
            EmailLog.objects.create(evaluation=e, recipient=to, email_type=kind, status="SENT")
            out[kind] = "sent"
        except Exception as ex:  # smtplib errors (bad password etc.)
            failed = True
            EmailLog.objects.create(evaluation=e, recipient=to, email_type=kind, status="FAILED", error=str(ex))
            out[kind] = f"failed: {ex}"
    if failed:
        raise ApiError(" | ".join(f"{k}: {v}" for k, v in out.items()), 502)
    return out


@api(["GET"])
def compare(request):
    ids = [int(i) for i in request.GET.get("ids", "").split(",") if i.isdigit()]
    res = []
    for c in Candidate.objects.filter(pk__in=ids).select_related("domain"):
        evs = list(c.evaluations.filter(status="SUBMITTED"))
        soft = {}
        for ev in evs:
            for r in ev.ratings.select_related("skill").filter(skill__category="SOFT"):
                soft.setdefault(r.skill.name, []).append(r.score)
        avg = lambda f: round(mean([getattr(x, f) for x in evs]), 1) if evs else None
        res.append({"id": c.id, "name": c.name, "domain": c.domain.name, "round": c.interview_round, "rounds_done": len(evs),
                    "hard": avg("hard_score"), "soft": avg("soft_score"), "overall": avg("overall_score"),
                    "recommendation": ", ".join(sorted({x.recommendation for x in evs})) or "-",
                    "soft_skills": {k: round(mean(v), 1) for k, v in soft.items()}})
    return res  # intentionally no "winner": internal comparison only


@api(["GET"])
def export_csv(request):  # opens directly in Excel
    resp = HttpResponse(content_type="text/csv")
    resp["Content-Disposition"] = 'attachment; filename="ai-rojgar-evaluations.csv"'
    w = csv.writer(resp)
    w.writerow(["Candidate", "Email", "Role", "Domain", "Round", "Interviewer", "Hard", "Soft", "Overall", "Recommendation", "Remarks", "Submitted"])
    for e in Evaluation.objects.filter(status="SUBMITTED").select_related("candidate__domain"):
        c = e.candidate
        w.writerow([c.name, c.email, c.applied_role, c.domain.name, c.interview_round, e.interviewer, e.hard_score,
                    e.soft_score, e.overall_score, e.recommendation, e.final_remarks, e.submitted_at])
    return resp
