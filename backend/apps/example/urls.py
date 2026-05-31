from django.urls import path

from . import views

app_name = "example"

urlpatterns = [
    path("", views.notes, name="notes"),
]
