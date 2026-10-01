from django.urls import path
from . import views as v

urlpatterns = [
    path("dashboard", v.dashboard),
    path("domains", v.domains),
    path("settings", v.settings_view),
    path("skills", v.skill_add),
    path("skills/<int:pk>", v.skill_del),
    path("candidates", v.candidates),
    path("evaluations", v.evaluations),
    path("evaluations/<int:pk>", v.evaluation),
    path("evaluations/<int:pk>/submit", v.submit),
    path("evaluations/<int:pk>/unlock", v.unlock),
    path("evaluations/<int:pk>/send-result-email", v.send_email),
    path("compare", v.compare),
    path("export.csv", v.export_csv),
]
