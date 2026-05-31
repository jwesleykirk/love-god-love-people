from django.urls import path

from .views import PendingValuesView

urlpatterns = [
    path("pending-values/", PendingValuesView.as_view(), name="review-pending-values"),
]
