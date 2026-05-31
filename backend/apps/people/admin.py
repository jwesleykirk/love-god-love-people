from django.contrib import admin

from .models import Person


@admin.register(Person)
class PersonAdmin(admin.ModelAdmin):
    list_display = ("full_name", "relationship_category", "owner", "archived", "updated_at")
    list_filter = ("relationship_category", "archived")
    search_fields = ("full_name", "preferred_name")
