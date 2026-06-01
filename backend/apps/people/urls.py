from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import PersonViewSet

router = DefaultRouter()
router.register("", PersonViewSet, basename="person")

urlpatterns = [
    # Photo endpoints must come before the router so /<id>/photo/ doesn't get
    # swallowed as an unknown ViewSet action.
    path("", include("apps.photos.urls")),
] + router.urls
