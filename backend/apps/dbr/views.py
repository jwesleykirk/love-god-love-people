from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ReadingDay
from .serializers import ReadingDaySerializer


class TodayReadingView(APIView):
    def get(self, request):
        today = timezone.localdate()
        reading = (
            ReadingDay.objects.filter(pub_date__date=today).first()
            or ReadingDay.objects.order_by("-pub_date").first()
        )
        if not reading:
            return Response({"detail": "No reading available."}, status=404)
        return Response(ReadingDaySerializer(reading).data)
