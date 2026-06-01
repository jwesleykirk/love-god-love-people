from rest_framework.routers import DefaultRouter

from .views import ProposedPersonViewSet

router = DefaultRouter()
router.register("", ProposedPersonViewSet, basename="proposed-person")

urlpatterns = router.urls
