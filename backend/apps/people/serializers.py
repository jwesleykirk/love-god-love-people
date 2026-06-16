from rest_framework import serializers

from .models import Child, Person


class ChildSerializer(serializers.ModelSerializer):
    age_display = serializers.SerializerMethodField()

    class Meta:
        model = Child
        fields = ["id", "name", "birthdate", "birth_year", "age_display"]
        read_only_fields = ["id"]

    def get_age_display(self, obj: Child) -> str | None:
        from apps.people.utils import child_age_display

        return child_age_display(obj)


class PersonSerializer(serializers.ModelSerializer):
    children = ChildSerializer(many=True, required=False)

    class Meta:
        model = Person
        fields = [
            "id",
            "name",
            "life_stage",
            "career",
            "school",
            "major",
            "partner_name",
            "notes",
            "children",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def create(self, validated_data):
        children_data = validated_data.pop("children", [])
        person = Person.objects.create(**validated_data)
        for child_data in children_data:
            Child.objects.create(person=person, **child_data)
        return person

    def update(self, instance, validated_data):
        children_data = validated_data.pop("children", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if children_data is not None:
            instance.children.all().delete()
            for child_data in children_data:
                Child.objects.create(person=instance, **child_data)
        return instance


class PersonListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Person
        fields = ["id", "name", "life_stage", "partner_name"]
