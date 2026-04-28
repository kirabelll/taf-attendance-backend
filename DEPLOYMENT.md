# TAF Attendance System - Docker Deployment Guide

## 📋 Overview

This guide covers deploying the TAF Attendance System using Docker and Docker Compose, with specific instructions for Coolify deployment.

## 🚀 Quick Start (Local Development)

### Prerequisites
- Docker Engine 20.10+
- Docker Compose 2.0+
- Git

### Steps

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd taf-attendance-django-project
```

2. **Create environment file**
```bash
cp .env.example .env
```

3. **Edit .env file with your configuration**
```bash
nano .env  # or use your preferred editor
```

Required variables:
- `BIOTIME_URL` - Your ZKBio Time server URL
- `BIOTIME_USERNAME` - ZKBio Time username
- `BIOTIME_PASSWORD` - ZKBio Time password
- `POSTGRES_PASSWORD` - Database password
- `DJANGO_SECRET_KEY` - Django secret key (generate a long random string)

4. **Start the application**
```bash
docker-compose up -d
```

5. **Check status**
```bash
docker-compose ps
docker-compose logs -f
```

6. **Access the application**
- Frontend: http://localhost
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/api/

## 🌐 Coolify Deployment

### Method 1: Using Git Repository (Recommended)

1. **Login to Coolify Dashboard**

2. **Create New Resource**
   - Click "New Resource"
   - Select "Docker Compose"
   - Choose "From Git Repository"

3. **Configure Git Repository**
   - Repository URL: `<your-git-repo-url>`
   - Branch: `main` (or your production branch)
   - Build Pack: Docker Compose

4. **Set Environment Variables**
   
   Go to "Environment Variables" tab and add:

   ```env
   # Database
   POSTGRES_DB=taf_attendance
   POSTGRES_USER=taf_user
   POSTGRES_PASSWORD=<generate-strong-password>
   
   # Django
   DJANGO_SECRET_KEY=<generate-long-random-string>
   DJANGO_DEBUG=False
   DJANGO_ALLOWED_HOSTS=your-domain.com,www.your-domain.com
   
   # ZKBio Time (REQUIRED)
   BIOTIME_URL=http://your-zkbio-server:8002
   BIOTIME_USERNAME=your-username
   BIOTIME_PASSWORD=your-password
   BIOTIME_API_VERSION=v1
   
   # Integration
   INTEGRATION_MODE=biotime
   SYNC_INTERVAL_MINUTES=1
   MAX_RETRIES=3
   BATCH_SIZE=100
   LOG_LEVEL=INFO
   
   # Frontend
   VITE_API_URL=https://your-domain.com
   ```

5. **Configure Docker Compose File**
   - Select `docker-compose.prod.yml` as the compose file
   - Or use `docker-compose.yml` for development

6. **Configure Domain**
   - Go to "Domains" tab
   - Add your domain: `attendance.yourdomain.com`
   - Enable SSL/TLS (Let's Encrypt)

7. **Deploy**
   - Click "Deploy" button
   - Monitor deployment logs
   - Wait for all services to be healthy

### Method 2: Using Docker Registry

1. **Build and push images**
```bash
# Build images
docker build -f Dockerfile.backend -t your-registry/taf-backend:latest .
docker build -f Dockerfile.frontend -t your-registry/taf-frontend:latest .

# Push to registry
docker push your-registry/taf-backend:latest
docker push your-registry/taf-frontend:latest
```

2. **Update docker-compose.prod.yml**
```yaml
services:
  backend:
    image: your-registry/taf-backend:latest
    # Remove build section
  
  frontend:
    image: your-registry/taf-frontend:latest
    # Remove build section
```

3. **Deploy in Coolify using the updated compose file**

## 🔧 Configuration

### Environment Variables

#### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `BIOTIME_URL` | ZKBio Time server URL | `http://172.16.10.250:8002` |
| `BIOTIME_USERNAME` | ZKBio Time username | `admin` |
| `BIOTIME_PASSWORD` | ZKBio Time password | `your-password` |
| `POSTGRES_PASSWORD` | Database password | `strong-password-123` |
| `DJANGO_SECRET_KEY` | Django secret key | `long-random-string` |

#### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_DB` | Database name | `taf_attendance` |
| `POSTGRES_USER` | Database user | `taf_user` |
| `DJANGO_DEBUG` | Debug mode | `False` |
| `DJANGO_ALLOWED_HOSTS` | Allowed hosts | `*` |
| `INTEGRATION_MODE` | Integration mode | `biotime` |
| `SYNC_INTERVAL_MINUTES` | Sync interval | `1` |
| `LOG_LEVEL` | Logging level | `INFO` |

### Generate Django Secret Key

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Or use online generator: https://djecrety.ir/

## 📊 Service Architecture

```
┌─────────────────┐
│   Frontend      │
│   (Nginx)       │
│   Port: 80      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Backend       │
│   (Django)      │
│   Port: 8000    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Database      │
│   (PostgreSQL)  │
│   Port: 5432    │
└─────────────────┘
```

## 🔍 Monitoring & Logs

### View logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

### Check service health
```bash
docker-compose ps
```

### Access container shell
```bash
# Backend
docker-compose exec backend bash

# Database
docker-compose exec db psql -U taf_user -d taf_attendance
```

## 🔄 Updates & Maintenance

### Update application
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

### Backup database
```bash
# Create backup
docker-compose exec db pg_dump -U taf_user taf_attendance > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
docker-compose exec -T db psql -U taf_user taf_attendance < backup_20240101_120000.sql
```

### Clean up
```bash
# Stop and remove containers
docker-compose down

# Remove volumes (WARNING: deletes data)
docker-compose down -v

# Remove images
docker-compose down --rmi all
```

## 🐛 Troubleshooting

### Backend not connecting to ZKBio Time

1. Check network connectivity:
```bash
docker-compose exec backend ping <zkbio-server-ip>
```

2. Verify environment variables:
```bash
docker-compose exec backend env | grep BIOTIME
```

3. Check backend logs:
```bash
docker-compose logs backend | grep -i error
```

### Database connection issues

1. Check database is running:
```bash
docker-compose ps db
```

2. Test database connection:
```bash
docker-compose exec backend python manage.py dbshell
```

3. Check database logs:
```bash
docker-compose logs db
```

### Frontend not loading

1. Check nginx configuration:
```bash
docker-compose exec frontend nginx -t
```

2. Check frontend logs:
```bash
docker-compose logs frontend
```

3. Verify API connection:
```bash
curl http://localhost:8000/api/test-connection/
```

## 🔒 Security Best Practices

1. **Change default passwords**
   - Update `POSTGRES_PASSWORD`
   - Update `DJANGO_SECRET_KEY`
   - Update `BIOTIME_PASSWORD`

2. **Use strong passwords**
   - Minimum 16 characters
   - Mix of letters, numbers, symbols

3. **Restrict access**
   - Set `DJANGO_ALLOWED_HOSTS` to your domain
   - Use firewall rules
   - Enable SSL/TLS

4. **Regular updates**
   - Keep Docker images updated
   - Update dependencies regularly
   - Monitor security advisories

5. **Backup regularly**
   - Automated daily backups
   - Store backups securely
   - Test restore procedures

## 📞 Support

For issues and questions:
- Check logs: `docker-compose logs -f`
- Review environment variables
- Verify network connectivity
- Check ZKBio Time server status

## 📝 License

[Your License Here]
