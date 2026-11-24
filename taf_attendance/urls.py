"""
URL configuration for taf_attendance project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from attendance_api import auth_views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/register/', auth_views.register, name='auth_register'),
    path('api/auth/login/', auth_views.login, name='auth_login'),
    path('api/auth/me/', auth_views.current_user, name='auth_me'),
    path('api/auth/permissions/', auth_views.get_my_permissions, name='auth_permissions'),
    path('api/auth/roles/', auth_views.get_roles, name='auth_roles'),
    path('api/users/', auth_views.list_users, name='user_list'),
    path('api/users/create/', auth_views.create_user, name='user_create'),
    path('api/users/<int:user_id>/', auth_views.manage_user, name='user_manage'),
    path('api/', include('attendance_api.urls')),
]
