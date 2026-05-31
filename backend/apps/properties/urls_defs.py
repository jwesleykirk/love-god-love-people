from rest_framework.routers import DefaultRouter

from .views import PropertyDefViewSet

router = DefaultRouter()
router.register("", PropertyDefViewSet, basename="property-def")

urlpatterns = router.urls
