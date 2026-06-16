from django.urls import path

from .views import TodayReadingView

urlpatterns = [
    path("today/", TodayReadingView.as_view(), name="dbr-today"),
]
