# TAF Attendance Backend - Coolify Quick Start

## 🚀 **1-Minute Deployment**

### **Step 1: Repository Setup**
```bash
# Ensure these files are in your repository:
✅ Dockerfile
✅ docker-compose.yml  
✅ coolify.yaml
✅ requirements.txt
✅ taf_attendance/settings_production.py
```

### **Step 2: Deploy to Coolify**

1. **Create New Application in Coolify**
   - Type: `Docker Compose`
   - Repository: `https://github.com/your-username/taf-attendance.git`
   - Branch: `main`

2. **Set Environment Variables:**
   ```bash
   SECRET_KEY=your-secret-key-here
   ALLOWED_HOSTS=your-domain.com,localhost
   POSTGRES_PASSWORD=secure-db-password
   REDIS_PASSWORD=secure-redis-password
   BIOTIME_URL=http://172.16.10.250:8002
   BIOTIME_USERNAME=your-username
   BIOTIME_PASSWORD=your-password
   ```

3. **Configure Ports:**
   - **Application Port:** `8000`
   - **Public Port:** `80` (or `443` for HTTPS)

4. **Deploy!**

### **Step 3: Access Your API**
- **Health Check:** `https://your-domain.com/api/test-connection/`
- **Admin Panel:** `https://your-domain.com/admin/`
- **API Docs:** `https://your-domain.com/api/`

---

## 🔧 **Port Configuration**

### **Default Ports:**
- **Django Backend:** `8000` (internal)
- **PostgreSQL:** `5432` (internal)
- **Redis:** `6379` (internal)
- **Nginx:** `80` (public)

### **Custom Port Setup:**
If you need different ports, set these environment variables:
```bash
BACKEND_PORT=8001    # Change Django port
NGINX_PORT=8080      # Change public port
POSTGRES_PORT=5433   # Change database port
REDIS_PORT=6380      # Change Redis port
```

### **Port Mapping in Coolify:**
1. **Go to Application Settings**
2. **Port Configuration:**
   - **Container Port:** `8000` (or your BACKEND_PORT)
   - **Public Port:** `80` or `443`
3. **Save and Redeploy**

---

## 🌐 **Service Architecture**

```
Internet → Coolify Proxy → Nginx (80) → Django (8000)
                                    ↓
                              PostgreSQL (5432)
                                    ↓
                                Redis (6379)
                                    ↓
                              Celery Worker
```

---

## ✅ **Quick Verification**

After deployment, test these endpoints:

```bash
# Health check
curl https://your-domain.com/api/test-connection/

# Get employees
curl https://your-domain.com/api/employees/

# Real-time attendance
curl https://your-domain.com/api/attendance/realtime/

# Admin panel (in browser)
https://your-domain.com/admin/
```

---

## 🔒 **Security Checklist**

- [ ] Strong `SECRET_KEY` generated
- [ ] Secure database passwords
- [ ] `ALLOWED_HOSTS` configured correctly
- [ ] HTTPS enabled in Coolify
- [ ] BioTime credentials secured

---

## 🎉 **Done!**

Your TAF Attendance Backend is now running on Coolify with:
- ✅ Auto-scaling
- ✅ Health monitoring  
- ✅ SSL certificates
- ✅ Database persistence
- ✅ Redis caching
- ✅ Background tasks

**Ready to connect your frontend!** 🚀