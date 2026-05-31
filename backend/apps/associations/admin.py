from django.contrib import admin

from .models import AssociationType, PersonAssociation


@admin.register(AssociationType)
class AssociationTypeAdmin(admin.ModelAdmin):
    list_display = ("name", "inverse_name", "is_symmetric", "category", "system")
    list_filter = ("category", "is_symmetric", "system")
    search_fields = ("name", "inverse_name")


@admin.register(PersonAssociation)
class PersonAssociationAdmin(admin.ModelAdmin):
    list_display = ("from_person", "association_type", "to_person", "started_at", "ended_at")
    list_filter = ("association_type",)
    search_fields = ("from_person__full_name", "to_person__full_name")
