import django_filters
from core.permissions import ViewClassPermission, all_permissions
from django.utils.decorators import method_decorator
from django_filters.rest_framework import DjangoFilterBackend
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from projects import models as project_models
from rest_framework import generics
from rest_framework.exceptions import NotFound
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Webhook, WebhookAction
from .serializers import WebhookSerializer, WebhookSerializerForUpdate


class WebhookFilterSet(django_filters.FilterSet):
    project = django_filters.ModelChoiceFilter(
        field_name='project', queryset=project_models.Project.objects.all(), null_label='isnull'
    )


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Webhooks'],
        x_fern_sdk_group_name='webhooks',
        x_fern_sdk_method_name='list',
        x_fern_audiences=['public'],
        operation_summary='List all webhooks',
        operation_description='List all webhooks set up for your organization.',
        manual_parameters=[
            openapi.Parameter(
                name='project',
                type=openapi.TYPE_STRING,
                in_=openapi.IN_QUERY,
                description='Project ID',
            ),
        ],
    ),
)
@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Webhooks'],
        x_fern_sdk_group_name='webhooks',
        x_fern_sdk_method_name='create',
        x_fern_audiences=['public'],
        operation_summary='Create a webhook',
        operation_description='Create a webhook for your organization.',
    ),
)
class WebhookListAPI(generics.ListCreateAPIView):
    queryset = Webhook.objects.all()
    serializer_class = WebhookSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_class = WebhookFilterSet
    permission_required = ViewClassPermission(
        GET=all_permissions.webhooks_view,
        POST=all_permissions.webhooks_change,
    )

    def get_queryset(self):
        return Webhook.objects.filter(organization=self.request.user.active_organization)

    def perform_create(self, serializer):
        project = serializer.validated_data.get('project')
        if project is None or project.organization_id != self.request.user.active_organization.id:
            raise NotFound('Project not found.')
        serializer.save(organization=self.request.user.active_organization)


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Webhooks'],
        x_fern_sdk_group_name='webhooks',
        x_fern_sdk_method_name='get',
        x_fern_audiences=['public'],
        operation_summary='Get webhook info',
    ),
)
@method_decorator(
    name='put',
    decorator=swagger_auto_schema(
        x_fern_audiences=['internal'],
        tags=['Webhooks'],
        operation_summary='Save webhook info',
        query_serializer=WebhookSerializerForUpdate,
    ),
)
@method_decorator(
    name='patch',
    decorator=swagger_auto_schema(
        tags=['Webhooks'],
        x_fern_sdk_group_name='webhooks',
        x_fern_sdk_method_name='update',
        x_fern_audiences=['public'],
        operation_summary='Update webhook info',
        query_serializer=WebhookSerializerForUpdate,
    ),
)
@method_decorator(
    name='delete',
    decorator=swagger_auto_schema(
        tags=['Webhooks'],
        x_fern_sdk_group_name='webhooks',
        x_fern_sdk_method_name='delete',
        x_fern_audiences=['public'],
        operation_summary='Delete webhook info',
    ),
)
class WebhookAPI(generics.RetrieveUpdateDestroyAPIView):
    queryset = Webhook.objects.all()
    serializer_class = WebhookSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return WebhookSerializerForUpdate
        return super().get_serializer_class()

    def get_queryset(self):
        return Webhook.objects.filter(organization=self.request.user.active_organization)


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Webhooks'],
        x_fern_sdk_group_name='webhooks',
        x_fern_sdk_method_name='info',
        x_fern_audiences=['public'],
        operation_summary='Get all webhook actions',
        operation_description='Get descriptions of all available webhook actions to set up webhooks.',
        responses={'200': 'Object with description data.'},
        manual_parameters=[
            openapi.Parameter(
                'organization-only',
                openapi.IN_QUERY,
                description='organization-only or not',
                type=openapi.TYPE_BOOLEAN,
            )
        ],
    ),
)
class WebhookInfoAPI(APIView):
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        result = {
            key: {
                'name': value['name'],
                'description': value['description'],
                'key': value['key'],
                'organization-only': value.get('organization-only', False),
            }
            for key, value in WebhookAction.ACTIONS.items()
        }
        organization_only = request.query_params.get('organization-only')
        if organization_only is not None:
            organization_only = organization_only == 'true'
            result = {
                key: value
                for key, value in result.items()
                if value.get('organization-only', False) == organization_only
            }
        return Response(data=result)
