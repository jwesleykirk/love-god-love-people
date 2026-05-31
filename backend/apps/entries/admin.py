from django.contrib import admin

from .models import JournalEntry, OrganizationJournalEntry, PersonJournalEntry


@admin.register(JournalEntry)
class JournalEntryAdmin(admin.ModelAdmin):
    list_display = ("id", "owner", "extraction_status", "created_at")
    list_filter = ("extraction_status",)
    search_fields = ("content_markdown",)


admin.site.register(PersonJournalEntry)
admin.site.register(OrganizationJournalEntry)
