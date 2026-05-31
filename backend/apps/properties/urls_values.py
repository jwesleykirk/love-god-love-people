from rest_framework.routers import DefaultRouter

from .views import PersonPropertyViewSet

router = DefaultRouter()
router.register("", PersonPropertyViewSet, basename="property-value")

urlpatterns = router.urls
