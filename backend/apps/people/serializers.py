from rest_framework import serializers

from .models import Person


class PersonSerializer(serializers.ModelSerializer):
    photo_url = serializers.SerializerMethodField()
    photo_thumbnail_url = serializers.SerializerMethodField()

    class Meta:
        model = Person
        fields = [
            "id",
            "full_name",
            "preferred_name",
            "relationship_category",
            "life_stage",
            "birthday",
            "deceased_at",
            "notes_markdown",
            "archived",
            "photo_url",
            "photo_thumbnail_url",
            "photo_updated_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "photo_url",
            "photo_thumbnail_url",
            "photo_updated_at",
        ]

    def _photo_endpoint(self, obj, *, thumb: bool) -> str:
        # Append photo_updated_at as a cache-buster so a replace propagates.
        ts = int(obj.photo_updated_at.timestamp()) if obj.photo_updated_at else 0
        suffix = "?thumb=1&v=" if thumb else "?v="
        return f"/api/people/{obj.id}/photo/{suffix}{ts}"

    def get_photo_url(self, obj):
        if not obj.photo_path:
            return None
        return self._photo_endpoint(obj, thumb=False)

    def get_photo_thumbnail_url(self, obj):
        if not obj.photo_thumbnail_path:
            return None
        return self._photo_endpoint(obj, thumb=True)
