FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# curl is used by the backend and nginx health checks.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements-production.txt ./requirements-production.txt
RUN python -m pip install --upgrade pip \
    && python -m pip install -r requirements-production.txt

COPY . .

RUN mkdir -p /app/logs /app/staticfiles /app/media

EXPOSE 8004

# The backend applies database migrations before starting; the celery service
# overrides this CMD with its worker command in docker-compose.yml.
CMD ["sh", "-c", "python manage.py migrate --noinput && python manage.py collectstatic --noinput && exec gunicorn taf_attendance.wsgi:application --bind 0.0.0.0:8004 --workers 3 --timeout 120"]
