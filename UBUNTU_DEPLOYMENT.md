# TAF Attendance System - Ubuntu Server Deployment

## 🚀 **Quick Installation**

### **One-Command Installation**
```bash
# Download and run the installation script
curl -fsSL https://raw.githubusercontent.com/your-repo/taf-attendance/main/ubuntu-install.sh | bash
```

### **Manual Installation**
```bash
# Clone the repository
git clone https://github.com/your-repo/taf-attendance.git
cd taf-attendance

# Make deployment script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

---

## 📋 **System Requirements**

### **Minimum Requirements**
- **OS:** Ubuntu 20.04 LTS or newer
- **RAM:** 2GB minimum, 4GB recommended
- **Storage:** 20GB minimum, 50GB recommended
- **CPU:** 2 cores minimum
- **Network:** Internet connection for installation

### **Supported Ubuntu Versions**
- Ubuntu 22.04 LTS (Recommended)
- Ubuntu 20.04 LTS
- Ubuntu 18.04 LTS (with manual updates)

---

## 🔧 **What Gets Installed**

### **System Services**
- **PostgreSQL 15** - Primary database
- **Redis** - Caching and session storage
- **Nginx** - Web server and reverse proxy
- **Supervisor** - Process management
- **Certbot** - SSL certificate management

### **Application Components**
- **Django Backend** - REST API server
- **React Frontend** - Web interface
- **Celery Worker** - Background task processing
- **Gunicorn** - WSGI HTTP server

### **Auto-Start Configuration**
All services are configured to start automatically on boot:
- ✅ PostgreSQL
- ✅ Redis
- ✅ TAF Attendance Django App
- ✅ TAF Attendance Celery Worker
- ✅ Nginx

---

## 🌐 **Access Your Application**

After successful deployment:

- **Web Application:** `http://YOUR_SERVER_IP`
- **Django Admin:** `http://YOUR_SERVER_IP/admin`
- **API Endpoints:** `http://YOUR_SERVER_IP/api`
- **Health Check:** `http://YOUR_SERVER_IP/health`

---

## 🛠️ **Management Commands**

### **Service Management**
```bash
# Start all services
taf-attendance-start

# Stop all services
taf-attendance-stop

# Check service status
taf-attendance-status

# Update application
taf-attendance-update
```

### **Manual Service Control**
```bash
# Individual service control
sudo systemctl start taf-attendance
sudo systemctl stop taf-attendance
sudo systemctl restart taf-attendance
sudo systemctl status taf-attendance

# Celery worker control
sudo systemctl start taf-attendance-celery
sudo systemctl stop taf-attendance-celery
sudo systemctl restart taf-attendance-celery
```

### **Database Management**
```bash
# Access PostgreSQL
sudo -u postgres psql taf_attendance

# Create Django superuser
sudo -u taf-attendance /opt/taf-attendance/venv/bin/python /opt/taf-attendance/manage.py createsuperuser

# Run migrations
sudo -u taf-attendance /opt/taf-attendance/venv/bin/python /opt/taf-attendance/manage.py migrate
```

---

## 🔒 **Security & SSL Setup**

### **Enable HTTPS with Let's Encrypt**
```bash
# Install SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is already configured
sudo certbot renew --dry-run
```

### **Firewall Configuration**
```bash
# Check firewall status
sudo ufw status

# Allow additional ports if needed
sudo ufw allow 8080  # For development
sudo ufw allow from YOUR_OFFICE_IP to any port 22  # Restrict SSH
```

### **Security Hardening**
```bash
# Change default passwords
sudo -u postgres psql -c "ALTER USER taf_user PASSWORD 'your_new_secure_password';"

# Update environment file
sudo nano /opt/taf-attendance/.env
```

---

## 📊 **Monitoring & Logs**

### **Log Locations**
```bash
# Application logs
tail -f /var/log/taf-attendance/django.log

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# System service logs
sudo journalctl -u taf-attendance -f
sudo journalctl -u taf-attendance-celery -f
```

### **System Monitoring**
```bash
# Check system resources
htop
df -h
free -h

# Check database connections
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity WHERE datname='taf_attendance';"

# Check Redis status
redis-cli info
```

---

## 💾 **Backup & Recovery**

### **Automated Backups**
- **Daily backups** run at 2:00 AM automatically
- **Database backups** stored in `/var/backups/taf-attendance/`
- **Application backups** include all files and configurations
- **Retention:** 7 days (configurable)

### **Manual Backup**
```bash
# Run manual backup
sudo /usr/local/bin/taf-attendance-backup.sh

# List available backups
ls -la /var/backups/taf-attendance/
```

### **Restore from Backup**
```bash
# Stop services
taf-attendance-stop

# Restore database
sudo -u postgres psql -d taf_attendance < /var/backups/taf-attendance/database_YYYYMMDD_HHMMSS.sql

# Restore application files
cd /opt
sudo tar -xzf /var/backups/taf-attendance/application_YYYYMMDD_HHMMSS.tar.gz

# Start services
taf-attendance-start
```

---

## 🔄 **Updates & Maintenance**

### **Application Updates**
```bash
# Update application (if using git)
taf-attendance-update

# Manual update process
cd /opt/taf-attendance
sudo -u taf-attendance git pull
sudo -u taf-attendance /opt/taf-attendance/venv/bin/pip install -r requirements.txt
sudo systemctl restart taf-attendance taf-attendance-celery
```

### **System Updates**
```bash
# Update Ubuntu packages
sudo apt update && sudo apt upgrade -y

# Update Python packages
sudo -u taf-attendance /opt/taf-attendance/venv/bin/pip install --upgrade pip
sudo -u taf-attendance /opt/taf-attendance/venv/bin/pip install -r /opt/taf-attendance/requirements.txt --upgrade
```

---

## 🐳 **Docker Alternative**

If you prefer Docker deployment:

```bash
# Use Docker Compose
docker-compose -f docker-compose.ubuntu.yml up -d

# Check status
docker-compose -f docker-compose.ubuntu.yml ps

# View logs
docker-compose -f docker-compose.ubuntu.yml logs -f
```

---

## 🔧 **Troubleshooting**

### **Common Issues**

#### **Service Won't Start**
```bash
# Check service status
sudo systemctl status taf-attendance

# Check logs
sudo journalctl -u taf-attendance -n 50

# Check configuration
sudo -u taf-attendance /opt/taf-attendance/venv/bin/python /opt/taf-attendance/manage.py check
```

#### **Database Connection Issues**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test database connection
sudo -u postgres psql -c "SELECT version();"

# Check database exists
sudo -u postgres psql -l | grep taf_attendance
```

#### **Frontend Not Loading**
```bash
# Check Nginx status
sudo systemctl status nginx

# Test Nginx configuration
sudo nginx -t

# Check frontend build
ls -la /opt/taf-attendance/taf-attendance/dist/
```

#### **Performance Issues**
```bash
# Check system resources
htop
iostat -x 1

# Check database performance
sudo -u postgres psql taf_attendance -c "SELECT * FROM pg_stat_activity;"

# Optimize database
sudo -u postgres psql taf_attendance -c "VACUUM ANALYZE;"
```

### **Reset Application**
```bash
# Complete reset (DANGER: This will delete all data!)
taf-attendance-stop
sudo -u postgres dropdb taf_attendance
sudo -u postgres createdb taf_attendance
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE taf_attendance TO taf_user;"
sudo -u taf-attendance /opt/taf-attendance/venv/bin/python /opt/taf-attendance/manage.py migrate
taf-attendance-start
```

---

## 📞 **Support & Configuration**

### **Important Files**
- **Environment:** `/opt/taf-attendance/.env`
- **Django Settings:** `/opt/taf-attendance/taf_attendance/settings_production.py`
- **Nginx Config:** `/etc/nginx/sites-available/taf-attendance`
- **Systemd Services:** `/etc/systemd/system/taf-attendance*.service`

### **Default Credentials**
- **Database User:** `taf_user`
- **Database Password:** `taf_password_2024` (Change this!)
- **Database Name:** `taf_attendance`

### **Ports Used**
- **80** - HTTP (Nginx)
- **443** - HTTPS (Nginx with SSL)
- **8001** - Django (Internal)
- **5432** - PostgreSQL (Internal)
- **6379** - Redis (Internal)

---

## ✅ **Post-Installation Checklist**

- [ ] Application accessible via web browser
- [ ] Django admin panel working
- [ ] API endpoints responding
- [ ] BioTime connection configured
- [ ] SSL certificate installed (production)
- [ ] Firewall configured
- [ ] Backups tested
- [ ] Monitoring set up
- [ ] Documentation reviewed
- [ ] Team trained on management commands

---

## 🎉 **Success!**

Your TAF Attendance System is now running on Ubuntu Server with:
- ✅ **Auto-start on boot**
- ✅ **Production-ready configuration**
- ✅ **Automated backups**
- ✅ **Security hardening**
- ✅ **Monitoring and logging**
- ✅ **Easy management commands**

**Access your application at:** `http://YOUR_SERVER_IP`