"""Photo endpoints. Mounted under /api/people/<pk>/photo via the people app's URLs."""

from django.urls import path

from .views import person_photo

urlpatterns = [
    path("<int:pk>/photo/", person_photo, name="person-photo"),
    # Allow the trailing-slash-less form too — fetch() defaults are forgiving.
    path("<int:pk>/photo", person_photo),
]
