from django.contrib import admin

from .models import Organization, OrganizationMembership


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ("name", "org_type", "parent", "owner", "archived", "updated_at")
    list_filter = ("org_type", "archived")
    search_fields = ("name",)


@admin.register(OrganizationMembership)
class OrganizationMembershipAdmin(admin.ModelAdmin):
    list_display = ("person", "organization", "role", "started_at", "ended_at")
    list_filter = ("organization",)
    search_fields = ("person__full_name", "organization__name", "role")
