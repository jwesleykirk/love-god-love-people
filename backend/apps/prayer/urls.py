from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import PrayerSessionViewSet, PrayerTopicViewSet, SessionAmenView, SessionTopicActionView

router = DefaultRouter()
router.register("topics", PrayerTopicViewSet, basename="prayer-topic")
router.register("sessions", PrayerSessionViewSet, basename="prayer-session")

urlpatterns = [
    path("", include(router.urls)),
    path(
        "sessions/<int:session_id>/topics/<int:topic_id>/action/",
        SessionTopicActionView.as_view(),
        name="session-topic-action",
    ),
    path(
        "sessions/<int:session_id>/amen/",
        SessionAmenView.as_view(),
        name="session-amen",
    ),
]
