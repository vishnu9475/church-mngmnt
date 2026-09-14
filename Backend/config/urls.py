from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView, TokenBlacklistView
from church_management.views import password_reset_confirm, password_reset_request

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/logout/', TokenBlacklistView.as_view(), name='token_blacklist'),
    path('api/auth/password-reset/', password_reset_request, name='password-reset-request'),
    path('api/auth/password-reset/confirm/', password_reset_confirm, name='password-reset-confirm'),
    path('api/', include('church_management.urls')),
]