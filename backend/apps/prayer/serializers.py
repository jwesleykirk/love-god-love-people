from rest_framework import serializers

from apps.groups.models import Group
from apps.groups.serializers import GroupListSerializer
from apps.people.models import Person
from apps.people.serializers import PersonListSerializer

from .models import PrayerLog, PrayerSession, PrayerTopic


class PrayerTopicSerializer(serializers.ModelSerializer):
    person = PersonListSerializer(read_only=True)
    group = GroupListSerializer(read_only=True)
    person_id = serializers.PrimaryKeyRelatedField(
        queryset=Person.objects.none(),
        source="person",
        allow_null=True,
        required=False,
    )
    group_id = serializers.PrimaryKeyRelatedField(
        queryset=Group.objects.none(),
        source="group",
        allow_null=True,
        required=False,
    )

    class Meta:
        model = PrayerTopic
        fields = [
            "id",
            "person",
            "group",
            "person_id",
            "group_id",
            "topic_text",
            "narration_text",
            "narration_generated",
            "audio_file",
            "target_frequency",
            "next_scheduled_date",
            "last_prayed_at",
            "answered_date",
            "answer_note",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "narration_generated",
            "audio_file",
            "next_scheduled_date",
            "last_prayed_at",
            "created_at",
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            self.fields["person_id"].queryset = Person.objects.filter(owner=request.user)
            self.fields["group_id"].queryset = Group.objects.filter(owner=request.user)

    def validate(self, attrs):
        person = attrs.get("person", getattr(self.instance, "person", None))
        group = attrs.get("group", getattr(self.instance, "group", None))
        if person and group:
            raise serializers.ValidationError("Attach to either a person or a group, not both.")
        return attrs

    def create(self, validated_data):
        validated_data["narration_generated"] = False
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if "topic_text" in validated_data and validated_data["topic_text"] != instance.topic_text:
            validated_data["narration_generated"] = False
        return super().update(instance, validated_data)


class PrayerLogSerializer(serializers.ModelSerializer):
    topic_narration = serializers.CharField(source="prayer_topic.narration_text", read_only=True)
    topic_id = serializers.IntegerField(source="prayer_topic_id", read_only=True)

    class Meta:
        model = PrayerLog
        fields = [
            "id",
            "topic_id",
            "topic_narration",
            "prayed_on",
            "answered",
            "answer_note",
        ]


class PrayerSessionSerializer(serializers.ModelSerializer):
    logs = PrayerLogSerializer(many=True, read_only=True)
    audio_url = serializers.SerializerMethodField()

    class Meta:
        model = PrayerSession
        fields = [
            "id",
            "session_date",
            "completed_at",
            "audio_file",
            "audio_url",
            "playlist",
            "build_status",
            "build_log",
            "logs",
        ]

    def get_audio_url(self, obj: PrayerSession) -> str | None:
        if obj.build_status != "ready":
            return None
        if obj.audio_file:
            return f"/api/guide/sessions/{obj.id}/audio/"
        return None


class PrayerSessionListSerializer(serializers.ModelSerializer):
    topic_count = serializers.SerializerMethodField()
    answered_count = serializers.SerializerMethodField()

    class Meta:
        model = PrayerSession
        fields = [
            "id",
            "session_date",
            "completed_at",
            "build_status",
            "topic_count",
            "answered_count",
        ]

    def get_topic_count(self, obj: PrayerSession) -> int:
        return obj.logs.count()

    def get_answered_count(self, obj: PrayerSession) -> int:
        return obj.logs.filter(answered=True).count()
