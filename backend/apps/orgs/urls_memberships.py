from rest_framework.routers import DefaultRouter

from .views import OrganizationMembershipViewSet

router = DefaultRouter()
router.register("", OrganizationMembershipViewSet, basename="membership")

urlpatterns = router.urls
