from django.contrib import admin

from .models import PersonProperty, PropertyDef


@admin.register(PropertyDef)
class PropertyDefAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "data_type_hint", "status", "usage_count", "first_proposed_at")
    list_filter = ("status", "data_type_hint")
    search_fields = ("name", "description")


@admin.register(PersonProperty)
class PersonPropertyAdmin(admin.ModelAdmin):
    list_display = ("person", "property_def", "value_text", "status", "ai_confidence", "created_at")
    list_filter = ("status",)
    search_fields = ("value_text",)
