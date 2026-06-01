from django.contrib import admin

from .models import ProposedPerson


@admin.register(ProposedPerson)
class ProposedPersonAdmin(admin.ModelAdmin):
    list_display = ("full_name", "owner", "status", "ai_confidence", "created_at")
    list_filter = ("status",)
    search_fields = ("full_name", "preferred_name")
