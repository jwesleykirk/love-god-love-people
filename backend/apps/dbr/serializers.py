from rest_framework import serializers

from .models import ReadingDay


class ReadingDaySerializer(serializers.ModelSerializer):
    class Meta:
        model = ReadingDay
        fields = [
            "guid",
            "title",
            "pub_date",
            "passage_reference",
            "commentary",
            "ot_reference",
            "nt_reference",
            "audio_cached_path",
        ]
