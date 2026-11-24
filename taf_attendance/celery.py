import os

from celery import Celery


os.environ.setdefault("DJANGO_SETTINGS_MODULE", "taf_attendance.settings_production")

app = Celery("taf_attendance")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
