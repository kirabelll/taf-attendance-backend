# Docker Setup Summary - TAF Attendance System

## 📦 Files Created

### Core Docker Files
1. **`Dockerfile.backend`** - Django backend container
2. **`Dockerfile.frontend.simple`** - React frontend container (Coolify-optimized)
3. **`nginx.conf`** - Nginx configuration for frontend
4. **`docker-compose.yml`** - Development environment
5. **`docker-compose.prod.yml`** - Production environment (for Coolify)

### Configuration Files
6. **`.env.example`** - Environment variables template
7. **`.dockerignore`** - Files to exclude from Docker build
8. **`coolify.yaml`** - Coolify-specific configuration

### Documentation
9. **`DEPLOYMENT.md`** - Complete deployment guide
10. **`COOLIFY_DEPLOYMENT.md`** - Coolify-specific deployment guide
11. **`deploy.sh`** - Automated deployment script

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│           Coolify Platform              │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │     Frontend (Nginx + React)      │ │
│  │     Port: 80/443                  │ │
│  │     - Serves static files         │ │
│  │     - Proxies API to backend      │ │
│  └──────────────┬────────────────────┘ │
│                 │                       │
│  ┌──────────────▼────────────────────┐ │
│  │     Backend (Django + Gunicorn)   │ │
│  │     Port: 8000                    │ │
│  │     - REST API                    │ │
│  │     - ZKBio Time integration      │ │
│  │     - Business logic              │ │
│  └──────────────┬────────────────────┘ │
│                 │                       │
│  ┌──────────────▼────────────────────┐ │
│  │     Database (PostgreSQL)         │ │
│  │     Port: 5432                    │ │
│  │     - Persistent storage          │ │
│  │     - Attendance data             │ │
│  └───────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
         │
         │ External Connection
         ▼
┌─────────────────────┐
│  ZKBio Time Server  │
│  Port: 8002         │
│  - Attendance data  │
│  - Device mgmt      │
└─────────────────────┘
```

## 🚀 Quick Start for Coolify

### 1. Prerequisites
- Coolify instance running
- Git repository with your code
- ZKBio Time server accessible

### 2. Deployment Steps

```bash
# 1. Push code to Git
git add .
git commit -m "Ready for deployment"
git push origin main

# 2. In Coolify Dashboard:
#    - Create new Docker Compose resource
#    - Point to your Git repository
#    - Select docker-compose.prod.yml
#    - Add environment variables (see below)
#    - Deploy!
```

### 3. Required Environment Variables

```env
# Database
POSTGRES_DB=taf_attendance
POSTGRES_USER=taf_user
POSTGRES_PASSWORD=<generate-strong-password>

# Django
DJANGO_SECRET_KEY=<generate-secret-key>
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=your-domain.com

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
```

## 🔑 Key Features

### Backend Container
- ✅ Python 3.11 slim base
- ✅ Django 6.0+ with Gunicorn
- ✅ PostgreSQL support
- ✅ ZKBio Time integration
- ✅ Health checks
- ✅ Non-root user for security
- ✅ Automatic migrations

### Frontend Container
- ✅ Node 20 Alpine for building
- ✅ Nginx Alpine for serving
- ✅ Multi-stage build (optimized size)
- ✅ Gzip compression
- ✅ Security headers
- ✅ React Router support
- ✅ API proxy to backend

### Database Container
- ✅ PostgreSQL 15 Alpine
- ✅ Persistent volumes
- ✅ Health checks
- ✅ Automatic initialization

## 📊 Container Sizes

| Container | Size (approx) |
|-----------|---------------|
| Backend   | ~200 MB       |
| Frontend  | ~50 MB        |
| Database  | ~80 MB        |
| **Total** | **~330 MB**   |

## 🔧 Configuration Options

### Development vs Production

| Feature | Development | Production |
|---------|-------------|------------|
| Debug Mode | Enabled | Disabled |
| Server | Django dev server | Gunicorn |
| Database | SQLite or PostgreSQL | PostgreSQL |
| SSL | Optional | Required |
| Logging | Verbose | Standard |
| Workers | 1 | 3 |

### Resource Limits

```yaml
# Recommended for production
backend:
  memory: 512M
  cpu: 0.5

frontend:
  memory: 256M
  cpu: 0.25

db:
  memory: 512M
  cpu: 0.5
```

## 🔒 Security Features

1. **Non-root containers** - Backend runs as non-root user
2. **Security headers** - X-Frame-Options, X-Content-Type-Options, etc.
3. **Environment isolation** - Secrets in environment variables
4. **Network isolation** - Internal Docker network
5. **Health checks** - Automatic container restart on failure
6. **SSL/TLS** - Automatic via Coolify/Let's Encrypt

## 📈 Monitoring

### Health Checks

```yaml
Backend:
  - Endpoint: /api/test-connection/
  - Interval: 30s
  - Timeout: 10s
  - Retries: 3

Frontend:
  - Endpoint: /
  - Interval: 30s
  - Timeout: 3s
  - Retries: 3

Database:
  - Command: pg_isready
  - Interval: 10s
  - Timeout: 5s
  - Retries: 5
```

### Logs

```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db

# Last 100 lines
docker-compose logs --tail=100
```

## 🔄 Maintenance

### Backup Database

```bash
# Create backup
docker exec <db-container> pg_dump -U taf_user taf_attendance > backup.sql

# Restore backup
docker exec -i <db-container> psql -U taf_user taf_attendance < backup.sql
```

### Update Application

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build
```

### Clean Up

```bash
# Remove stopped containers
docker-compose down

# Remove volumes (WARNING: deletes data)
docker-compose down -v

# Remove images
docker-compose down --rmi all
```

## 🐛 Troubleshooting

### Common Issues

1. **Build fails: "pnpm-lock.yaml not found"**
   - ✅ Fixed: Using npm instead in Dockerfile.frontend.simple

2. **Backend can't connect to database**
   - Check POSTGRES_PASSWORD is set
   - Wait 30s for database initialization
   - Check database logs

3. **Frontend shows 502 error**
   - Verify backend is running
   - Check nginx.conf proxy settings
   - Review backend logs

4. **Can't connect to ZKBio Time**
   - Verify BIOTIME_URL is accessible
   - Check firewall rules
   - Test connection from backend container

### Debug Commands

```bash
# Check container status
docker ps -a

# View logs
docker logs <container-name>

# Execute command in container
docker exec -it <container-name> bash

# Test network connectivity
docker exec <backend-container> ping <zkbio-server>

# Check environment variables
docker exec <backend-container> env
```

## 📚 Documentation

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Complete deployment guide
- **[COOLIFY_DEPLOYMENT.md](./COOLIFY_DEPLOYMENT.md)** - Coolify-specific guide
- **[.env.example](./.env.example)** - Environment variables reference

## ✅ Deployment Checklist

Before deploying to production:

- [ ] Update all passwords in .env
- [ ] Generate strong DJANGO_SECRET_KEY
- [ ] Set DJANGO_DEBUG=False
- [ ] Configure DJANGO_ALLOWED_HOSTS
- [ ] Verify ZKBio Time connection
- [ ] Test database connection
- [ ] Configure domain and SSL
- [ ] Set up backups
- [ ] Test all features
- [ ] Monitor logs for errors

## 🎯 Next Steps

1. **Deploy to Coolify** - Follow COOLIFY_DEPLOYMENT.md
2. **Configure domain** - Set up DNS and SSL
3. **Test integration** - Verify ZKBio Time connection
4. **Set up backups** - Automate database backups
5. **Monitor** - Set up uptime monitoring

## 📞 Support

For issues:
1. Check logs: `docker-compose logs -f`
2. Review environment variables
3. Verify network connectivity
4. Check documentation
5. Review error messages

---

**Ready to deploy?** Start with [COOLIFY_DEPLOYMENT.md](./COOLIFY_DEPLOYMENT.md)
