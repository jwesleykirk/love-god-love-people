from rest_framework.routers import DefaultRouter

from .views import JournalEntryViewSet

router = DefaultRouter()
router.register("", JournalEntryViewSet, basename="entry")

urlpatterns = router.urls
