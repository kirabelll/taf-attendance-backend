# TAF Attendance Backend - Coolify Deployment Guide

## 🚀 **Quick Deployment to Coolify**

### **Prerequisites**
- Coolify instance running
- Git repository with your TAF Attendance code
- Domain name (optional but recommended)

---

## 📋 **Step-by-Step Deployment**

### **Step 1: Prepare Your Repository**

1. **Ensure all files are in your repository:**
   ```
   ├── Dockerfile
   ├── docker-compose.yml
   ├── coolify.yaml
   ├── requirements-production.txt
   ├── nginx.conf
   ├── taf_attendance/
   │   ├── settings_production.py
   │   └── ...
   └── .env.coolify (reference only)
   ```

2. **Commit and push to your Git repository:**
   ```bash
   git add .
   git commit -m "Add Coolify deployment configuration"
   git push origin main
   ```

### **Step 2: Create Application in Coolify**

1. **Login to your Coolify dashboard**
2. **Click "New Resource" → "Application"**
3. **Select "Public Repository" or connect your Git provider**
4. **Enter your repository URL:**
   ```
   https://github.com/your-username/taf-attendance.git
   ```
5. **Select branch:** `main` (or your default branch)
6. **Choose deployment type:** `Docker Compose`

### **Step 3: Configure Environment Variables**

In Coolify, add these environment variables:

#### **Required Variables:**
```bash
# Django Configuration
DEBUG=False
SECRET_KEY=your-super-secret-key-here-change-this-in-production
DJANGO_SETTINGS_MODULE=taf_attendance.settings_production
ALLOWED_HOSTS=localhost,127.0.0.1,your-domain.com

# Database Configuration
POSTGRES_DB=taf_attendance
POSTGRES_USER=taf_user
POSTGRES_PASSWORD=your-secure-database-password-here

# Redis Configuration
REDIS_PASSWORD=your-secure-redis-password-here

# BioTime Configuration
BIOTIME_URL=http://172.16.10.250:8002
BIOTIME_USERNAME=your_biotime_username
BIOTIME_PASSWORD=your_biotime_password
```

#### **Optional Variables:**
```bash
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your_email@gmail.com
EMAIL_HOST_PASSWORD=your_app_password

# Security (Enable for HTTPS)
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True

# Port Configuration (if needed)
BACKEND_PORT=8000
NGINX_PORT=80
```

### **Step 4: Configure Ports**

1. **In Coolify application settings:**
   - **Application Port:** `8000` (Django backend)
   - **Public Port:** `80` or `443` (with SSL)

2. **If using custom ports:**
   - Set `BACKEND_PORT` environment variable
   - Update port mapping in Coolify

### **Step 5: Configure Domain (Optional)**

1. **In Coolify application settings:**
   - **Add your domain:** `api.your-domain.com`
   - **Enable SSL:** Coolify will handle Let's Encrypt automatically

2. **Update ALLOWED_HOSTS:**
   ```bash
   ALLOWED_HOSTS=localhost,127.0.0.1,api.your-domain.com,your-domain.com
   ```

### **Step 6: Deploy**

1. **Click "Deploy" in Coolify**
2. **Monitor the deployment logs**
3. **Wait for all services to be healthy**

---

## 🔧 **Service Configuration**

### **Services Included:**
- **backend** - Django application (Port 8000)
- **db** - PostgreSQL database (Port 5432)
- **redis** - Redis cache (Port 6379)
- **celery** - Background task worker
- **nginx** - Reverse proxy (Port 80) - Optional

### **Health Checks:**
- **Backend:** `GET /api/test-connection/`
- **Database:** PostgreSQL connection check
- **Redis:** Redis ping command

### **Volumes:**
- **postgres_data** - Database persistence
- **redis_data** - Redis persistence
- **static_files** - Django static files
- **media_files** - User uploaded files

---

## 🌐 **Access Your Application**

After successful deployment:

### **API Endpoints:**
- **Health Check:** `https://your-domain.com/api/test-connection/`
- **Admin Panel:** `https://your-domain.com/admin/`
- **API Root:** `https://your-domain.com/api/`

### **Specific Endpoints:**
- **Employees:** `GET /api/employees/`
- **Real-time Attendance:** `GET /api/attendance/realtime/`
- **Daily Summary:** `GET /api/attendance/daily-summary/`
- **Reports:** `GET /api/attendance/report/`

---

## 🔒 **Security Configuration**

### **For Production Deployment:**

1. **Generate a strong SECRET_KEY:**
   ```python
   python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
   ```

2. **Use strong database passwords:**
   ```bash
   POSTGRES_PASSWORD=$(openssl rand -base64 32)
   REDIS_PASSWORD=$(openssl rand -base64 32)
   ```

3. **Enable HTTPS (Coolify handles this automatically):**
   ```bash
   SECURE_SSL_REDIRECT=True
   SESSION_COOKIE_SECURE=True
   CSRF_COOKIE_SECURE=True
   ```

4. **Restrict ALLOWED_HOSTS:**
   ```bash
   ALLOWED_HOSTS=api.your-domain.com,your-domain.com
   ```

---

## 📊 **Monitoring & Logs**

### **View Logs in Coolify:**
1. **Go to your application in Coolify**
2. **Click "Logs" tab**
3. **Select service:** backend, db, redis, celery

### **Health Monitoring:**
- **Coolify automatically monitors service health**
- **Check "Metrics" tab for performance data**
- **Set up alerts in Coolify settings**

### **Database Access:**
```bash
# Connect to PostgreSQL (from Coolify terminal)
psql postgresql://taf_user:password@db:5432/taf_attendance
```

---

## 🔄 **Updates & Maintenance**

### **Deploy Updates:**
1. **Push changes to your Git repository**
2. **Coolify will auto-deploy** (if enabled)
3. **Or manually trigger deployment in Coolify**

### **Database Migrations:**
```bash
# Run from Coolify terminal or during deployment
python manage.py migrate
```

### **Create Superuser:**
```bash
# Run from Coolify terminal
python manage.py createsuperuser
```

### **Collect Static Files:**
```bash
# Usually handled automatically during build
python manage.py collectstatic --noinput
```

---

## 🐳 **Docker Compose Services**

### **Backend Service:**
- **Image:** Built from Dockerfile
- **Port:** 8000
- **Health Check:** `/api/test-connection/`
- **Dependencies:** db, redis

### **Database Service:**
- **Image:** postgres:15-alpine
- **Port:** 5432 (internal)
- **Volume:** postgres_data
- **Health Check:** pg_isready

### **Redis Service:**
- **Image:** redis:7-alpine
- **Port:** 6379 (internal)
- **Volume:** redis_data
- **Health Check:** redis-cli ping

### **Celery Service:**
- **Image:** Same as backend
- **Command:** celery worker
- **Dependencies:** db, redis

---

## 🛠️ **Troubleshooting**

### **Common Issues:**

#### **Backend Not Starting:**
```bash
# Check logs in Coolify
# Verify environment variables
# Check database connection
```

#### **Database Connection Failed:**
```bash
# Verify POSTGRES_* environment variables
# Check if database service is healthy
# Ensure DATABASE_URL is correct
```

#### **Redis Connection Failed:**
```bash
# Verify REDIS_PASSWORD
# Check if Redis service is healthy
# Ensure REDIS_URL is correct
```

#### **Static Files Not Loading:**
```bash
# Run collectstatic manually
python manage.py collectstatic --noinput

# Check nginx configuration
# Verify static file volumes
```

### **Debug Commands:**
```bash
# Check Django configuration
python manage.py check

# Test database connection
python manage.py dbshell

# View Django settings
python manage.py diffsettings
```

---

## ✅ **Deployment Checklist**

- [ ] Repository contains all required files
- [ ] Environment variables configured in Coolify
- [ ] Domain name configured (optional)
- [ ] SSL certificate enabled
- [ ] Database password is secure
- [ ] SECRET_KEY is unique and secure
- [ ] ALLOWED_HOSTS is properly configured
- [ ] Health checks are passing
- [ ] API endpoints are accessible
- [ ] Admin panel is accessible
- [ ] BioTime connection is working

---

## 🎉 **Success!**

Your TAF Attendance Backend is now deployed on Coolify with:

- ✅ **Auto-scaling** capabilities
- ✅ **Health monitoring**
- ✅ **Automatic SSL** certificates
- ✅ **Database persistence**
- ✅ **Redis caching**
- ✅ **Background task processing**
- ✅ **Production-ready** configuration

**API Base URL:** `https://your-domain.com/api/`