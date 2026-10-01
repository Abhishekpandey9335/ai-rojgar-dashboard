from django.db import models


class Domain(models.Model):
    name = models.CharField(max_length=120, unique=True)


class Skill(models.Model):  # domain=None -> soft skill shared by all interviews
    domain = models.ForeignKey(Domain, null=True, blank=True, on_delete=models.CASCADE, related_name="skills")
    name = models.CharField(max_length=120)
    category = models.CharField(max_length=10, default="HARD")
    active = models.BooleanField(default=True)


class Candidate(models.Model):
    name = models.CharField(max_length=120)
    email = models.EmailField()
    phone = models.CharField(max_length=30, blank=True)
    applied_role = models.CharField(max_length=120)
    domain = models.ForeignKey(Domain, on_delete=models.PROTECT)
    interview_date = models.DateField()
    interview_round = models.CharField(max_length=40, default="Round 1")
    experience_level = models.CharField(max_length=60, blank=True)
    resume_url = models.CharField(max_length=300, blank=True)
    linkedin_url = models.CharField(max_length=300, blank=True)
    github_url = models.CharField(max_length=300, blank=True)
    status = models.CharField(max_length=30, default="Scheduled")
    created_at = models.DateTimeField(auto_now_add=True)


class Evaluation(models.Model):
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name="evaluations")
    interviewer = models.CharField(max_length=120)
    hard_score = models.FloatField(null=True, blank=True)
    soft_score = models.FloatField(null=True, blank=True)
    overall_score = models.FloatField(null=True, blank=True)
    hard_weight = models.IntegerField(null=True, blank=True)
    soft_weight = models.IntegerField(null=True, blank=True)
    recommendation = models.CharField(max_length=20, blank=True)
    final_remarks = models.TextField(blank=True)
    share_remarks = models.BooleanField(default=False)
    status = models.CharField(max_length=12, default="DRAFT")  # DRAFT | SUBMITTED | UNLOCKED
    submitted_at = models.DateTimeField(null=True, blank=True)
    candidate_email_sent_at = models.DateTimeField(null=True, blank=True)
    admin_email_sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class Rating(models.Model):
    evaluation = models.ForeignKey(Evaluation, on_delete=models.CASCADE, related_name="ratings")
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE)
    score = models.IntegerField()
    comment = models.TextField(blank=True)  # internal only
    tips = models.TextField(blank=True, default='[]')  # JSON list of improvement tips

    class Meta:
        unique_together = ("evaluation", "skill")


class EmailLog(models.Model):
    evaluation = models.ForeignKey(Evaluation, on_delete=models.CASCADE)
    recipient = models.CharField(max_length=200)
    email_type = models.CharField(max_length=12)
    status = models.CharField(max_length=10)
    error = models.TextField(blank=True)
    sent_at = models.DateTimeField(auto_now_add=True)


class Setting(models.Model):
    hard_weight = models.IntegerField(default=70)
    soft_weight = models.IntegerField(default=30)

    @classmethod
    def get(cls):
        return cls.objects.get_or_create(pk=1)[0]
