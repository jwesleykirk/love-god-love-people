from rest_framework.routers import DefaultRouter

from .views import PersonAssociationViewSet

router = DefaultRouter()
router.register("", PersonAssociationViewSet, basename="person-association")

urlpatterns = router.urls
