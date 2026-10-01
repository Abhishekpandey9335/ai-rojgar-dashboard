from django.urls import include, path
from django.http import HttpResponse


def health(request):
    return HttpResponse('ok')


urlpatterns = [
    path('health/', health),path("api/", include("api.urls"))]
