"""Django admin configuration for Agent models."""

from django.contrib import admin

from .models import Agent, AgentAPIKey, AgentLicense, AgentOwnership, AgentReputation


class AgentAPIKeyInline(admin.TabularInline):
    model = AgentAPIKey
    extra = 0
    readonly_fields = ["prefix", "key_hash", "created_at", "last_used_at"]


class AgentOwnershipInline(admin.StackedInline):
    model = AgentOwnership
    extra = 0


class AgentReputationInline(admin.StackedInline):
    model = AgentReputation
    extra = 0


@admin.register(Agent)
class AgentAdmin(admin.ModelAdmin):
    list_display = ["name", "display_name", "agent_type", "status", "is_online", "updated_at"]
    list_filter = ["agent_type", "status"]
    search_fields = ["name", "display_name"]
    inlines = [AgentAPIKeyInline, AgentOwnershipInline, AgentReputationInline]
    readonly_fields = ["id", "created_at", "updated_at", "last_heartbeat"]


@admin.register(AgentLicense)
class AgentLicenseAdmin(admin.ModelAdmin):
    list_display = ["agent", "license_type", "licensee_name", "is_active", "created_at"]
    list_filter = ["license_type", "is_active"]
