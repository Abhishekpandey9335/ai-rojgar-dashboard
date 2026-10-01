import random

from django.core.management.base import BaseCommand
from django.utils import timezone

from api.models import Candidate, Domain, Evaluation, Rating, Setting, Skill
from api.services import skills_for, submit_evaluation

DOMAINS = {
    "Software Engineer (Full-Stack)": ["Programming Fundamentals", "Data Structures & Algorithms", "HTML/CSS", "JavaScript", "React.js", "Backend Development", "REST APIs", "SQL/NoSQL", "Authentication", "System Design", "Testing", "Git"],
    "Backend Engineer": ["Programming Fundamentals", "Node.js / Java / Python", "REST API Development", "Database Design", "SQL", "Authentication & Authorization", "API Security", "Caching", "Error Handling", "Testing", "Git"],
    "Frontend Engineer": ["HTML", "CSS", "JavaScript", "React.js", "TypeScript", "Responsive Design", "State Management", "API Integration", "Frontend Performance", "Testing", "Git"],
    "AI/ML Engineer": ["Python", "Statistics", "Probability", "Machine Learning", "Deep Learning", "Feature Engineering", "Model Evaluation", "Data Preprocessing", "NLP", "Computer Vision", "Model Deployment", "MLOps"],
    "Data Engineer": ["Python", "SQL", "Data Modeling", "ETL/ELT", "Data Warehousing", "Apache Spark", "Airflow", "Data Pipelines", "Cloud Platforms", "Data Quality", "Database Optimization"],
    "DevOps / Site-Reliability Engineer": ["Linux", "Networking", "Git", "Docker", "Kubernetes", "CI/CD", "AWS/Azure/GCP", "Infrastructure as Code", "Monitoring", "Logging", "Security", "Incident Management"],
    "Product Engineer / Technical Lead (Early Career)": ["Programming", "System Design", "Architecture", "Product Thinking", "API Design", "Database Design", "Technical Decision Making", "Code Quality", "Problem Solving", "Communication", "Technical Documentation"],
    "Research Engineer (ML-focused)": ["Python", "Mathematics", "Probability", "Statistics", "Machine Learning", "Deep Learning", "Research Methodology", "Paper Understanding", "Experiment Design", "Model Evaluation", "Scientific Communication"],
    "ML Engineer": ["Python", "Statistics", "Machine Learning", "Deep Learning", "Feature Engineering", "Model Evaluation", "Scikit-learn", "PyTorch/TensorFlow", "Model Deployment", "MLOps", "Experiment Tracking"],
    "GenAI Developer": ["Python", "LLM Fundamentals", "Prompt Engineering", "RAG", "Vector Databases", "Embeddings", "LLM APIs", "Fine-tuning", "AI Agents", "Evaluation", "AI Application Deployment"],
    "System Design Engineer": ["System Architecture", "Scalability", "Load Balancing", "Caching", "Database Design", "Distributed Systems", "Microservices", "Message Queues", "API Design", "Reliability", "Security"],
    "Full Stack + AI/ML Engineer": ["Python", "JavaScript", "React.js", "Backend Development", "REST APIs", "SQL/NoSQL", "Machine Learning", "Deep Learning", "LLMs", "RAG", "AI APIs", "Deployment", "Cloud", "System Design"],
}
SOFT = ["Communication Skills", "Confidence & Clarity of Thought", "Attitude & Cultural Fit", "Teamwork & Collaboration", "Learning Ability & Adaptability", "Ownership & Accountability", "Time Management & Work Ethic", "Professionalism & Integrity"]
DEMO = [("Aman Verma", "Frontend Developer", "Frontend Engineer", True, "Hire"),
        ("Priya Singh", "GenAI Engineer", "GenAI Developer", True, "Strong Hire"),
        ("Rohit Kumar", "Backend Developer", "Backend Engineer", True, "On Hold"),
        ("Neha Gupta", "Data Engineer", "Data Engineer", False, "")]


class Command(BaseCommand):
    help = "Load domains, skills, weights and demo candidates"

    def handle(self, *args, **opts):
        Evaluation.objects.all().delete(); Candidate.objects.all().delete(); Skill.objects.all().delete(); Domain.objects.all().delete()
        for name, skills in DOMAINS.items():
            d = Domain.objects.create(name=name)
            Skill.objects.bulk_create([Skill(domain=d, name=s) for s in skills])
        Skill.objects.bulk_create([Skill(domain=None, name=s, category="SOFT") for s in SOFT])
        Setting.get()
        random.seed(7)
        for name, role, dom, done, rec in DEMO:
            c = Candidate.objects.create(name=name, email=f"{name.split()[0].lower()}@example.com", applied_role=role,
                                         domain=Domain.objects.get(name=dom), interview_date=timezone.now().date(), experience_level="0-2 years")
            if done:  # demo evaluation so charts are not empty
                e = Evaluation.objects.create(candidate=c, interviewer="Demo Interviewer", recommendation=rec)
                hard, soft = skills_for(c)
                for s in hard + soft:
                    Rating.objects.create(evaluation=e, skill=s, score=random.randint(5, 9))
                submit_evaluation(e)
        self.stdout.write(self.style.SUCCESS("Seed done"))
