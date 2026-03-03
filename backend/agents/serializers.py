"""DRF serializers for Agent models."""

from rest_framework import serializers

from .models import Agent, AgentAPIKey, AgentLicense, AgentOwnership, AgentReputation


class AgentReputationSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgentReputation
        exclude = ["id", "agent"]


class AgentOwnershipSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgentOwnership
        exclude = ["id", "agent", "creator_email"]


class AgentLicenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgentLicense
        fields = [
            "id", "license_type", "licensee_name", "monthly_fee",
            "revenue_share_pct", "start_date", "end_date", "is_active",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class AgentListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""

    reputation_score = serializers.IntegerField(
        source="reputation.overall_score", read_only=True, default=None
    )
    owner = serializers.CharField(
        source="ownership.creator_name", read_only=True, default=None
    )
    is_online = serializers.BooleanField(read_only=True)
    win_rate = serializers.FloatField(
        source="reputation.win_rate", read_only=True, default=None
    )
    total_trades = serializers.IntegerField(
        source="reputation.total_trades", read_only=True, default=None
    )
    profit_factor = serializers.FloatField(
        source="reputation.profit_factor", read_only=True, default=None
    )

    class Meta:
        model = Agent
        fields = [
            "id",
            "name",
            "display_name",
            "agent_type",
            "status",
            "reputation_score",
            "owner",
            "is_online",
            "last_heartbeat",
            "created_at",
            "updated_at",
            "win_rate",
            "total_trades",
            "profit_factor",
        ]


class AgentDetailSerializer(serializers.ModelSerializer):
    """Full agent detail with nested ownership and reputation."""

    ownership = AgentOwnershipSerializer(read_only=True)
    reputation = AgentReputationSerializer(read_only=True)
    licenses = AgentLicenseSerializer(many=True, read_only=True)
    is_online = serializers.BooleanField(read_only=True)

    class Meta:
        model = Agent
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class AgentRegistrationSerializer(serializers.Serializer):
    """Public registration: creates Agent + Ownership + API key."""

    # Agent fields
    name = serializers.SlugField(max_length=100)
    display_name = serializers.CharField(max_length=200)
    agent_type = serializers.ChoiceField(choices=Agent.AgentType.choices, default="custom")
    description = serializers.CharField(required=False, allow_blank=True, default="")
    soul_file = serializers.CharField(required=False, allow_blank=True, default="")
    capabilities = serializers.ListField(child=serializers.CharField(), required=False, default=list)

    # Ownership fields
    creator_name = serializers.CharField(max_length=200)
    creator_email = serializers.EmailField(required=False, allow_blank=True, default="")
    creator_url = serializers.URLField(required=False, allow_blank=True, default="")
    license_type = serializers.ChoiceField(
        choices=AgentLicense.LicenseType.choices, default="open_source"
    )

    def create(self, validated_data):
        # Extract ownership fields
        creator_name = validated_data.pop("creator_name")
        creator_email = validated_data.pop("creator_email", "")
        creator_url = validated_data.pop("creator_url", "")
        license_type = validated_data.pop("license_type", "open_source")

        # Create agent
        agent = Agent.objects.create(
            status=Agent.Status.ACTIVE,
            **validated_data,
        )

        # Create ownership record
        AgentOwnership.objects.create(
            agent=agent,
            creator_name=creator_name,
            creator_email=creator_email,
            creator_url=creator_url,
        )

        # Create default reputation
        AgentReputation.objects.create(agent=agent)

        # Generate API key
        api_key_obj, raw_key = AgentAPIKey.generate(agent)

        return {
            "agent": agent,
            "api_key": raw_key,
            "api_key_prefix": api_key_obj.prefix,
        }

    def validate_name(self, value):
        if Agent.objects.filter(name=value).exists():
            raise serializers.ValidationError("An agent with this name already exists.")
        return value


class AgentRegistrationResponseSerializer(serializers.Serializer):
    """Response after successful registration."""

    agent = AgentDetailSerializer()
    api_key = serializers.CharField(help_text="Full API key (only shown once)")
    api_key_prefix = serializers.CharField()
    message = serializers.CharField()
