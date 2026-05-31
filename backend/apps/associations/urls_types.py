from rest_framework.routers import DefaultRouter

from .views import AssociationTypeViewSet

router = DefaultRouter()
router.register("", AssociationTypeViewSet, basename="association-type")

urlpatterns = router.urls
