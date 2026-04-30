#!/bin/bash

# TAF Attendance System - Ubuntu Server Deployment Script
# This script deploys the application with auto-start on boot

set -e

echo "================================================"
echo "TAF Attendance System - Ubuntu Server Deployment"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="taf-attendance"
PROJECT_DIR="/opt/taf-attendance"
SERVICE_USER="taf-attendance"
NGINX_AVAILABLE="/etc/nginx/sites-available"
NGINX_ENABLED="/etc/nginx/sites-enabled"

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo -e "${RED}This script should not be run as root for security reasons${NC}"
   echo "Please run as a regular user with sudo privileges"
   exit 1
fi

# Check if user has sudo privileges
if ! sudo -n true 2>/dev/null; then
    echo -e "${RED}This script requires sudo privileges${NC}"
    echo "Please ensure your user is in the sudo group"
    exit 1
fi

echo -e "${GREEN}✓ Running with proper user privileges${NC}"

# Update system packages
echo "Updating system packages..."
sudo apt update && sudo apt upgrade -y
echo -e "${GREEN}✓ System packages updated${NC}"
echo ""

# Install required system packages
echo "Installing system dependencies..."
sudo apt install -y \
    python3 \
    python3-pip \
    python3-venv \
    nodejs \
    npm \
    nginx \
    postgresql \
    postgresql-contrib \
    redis-server \
    git \
    curl \
    wget \
    unzip \
    supervisor \
    certbot \
    python3-certbot-nginx

echo -e "${GREEN}✓ System dependencies installed${NC}"
echo ""

# Install Bun (faster than npm)
echo "Installing Bun..."
if ! command -v bun &> /dev/null; then
    curl -fsSL https://bun.sh/install | bash
    export PATH="$HOME/.bun/bin:$PATH"
    echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.bashrc
    echo -e "${GREEN}✓ Bun installed${NC}"
else
    echo -e "${GREEN}✓ Bun already installed${NC}"
fi
echo ""

# Create service user
echo "Creating service user..."
if ! id "$SERVICE_USER" &>/dev/null; then
    sudo useradd --system --shell /bin/bash --home-dir $PROJECT_DIR --create-home $SERVICE_USER
    echo -e "${GREEN}✓ Service user '$SERVICE_USER' created${NC}"
else
    echo -e "${GREEN}✓ Service user '$SERVICE_USER' already exists${NC}"
fi
echo ""

# Setup PostgreSQL
echo "Setting up PostgreSQL..."
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql -c "CREATE DATABASE taf_attendance;" 2>/dev/null || echo "Database already exists"
sudo -u postgres psql -c "CREATE USER taf_user WITH PASSWORD 'taf_password_2024';" 2>/dev/null || echo "User already exists"
sudo -u postgres psql -c "ALTER ROLE taf_user SET client_encoding TO 'utf8';"
sudo -u postgres psql -c "ALTER ROLE taf_user SET default_transaction_isolation TO 'read committed';"
sudo -u postgres psql -c "ALTER ROLE taf_user SET timezone TO 'UTC';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE taf_attendance TO taf_user;"

echo -e "${GREEN}✓ PostgreSQL configured${NC}"
echo ""

# Setup Redis
echo "Setting up Redis..."
sudo systemctl start redis-server
sudo systemctl enable redis-server
echo -e "${GREEN}✓ Redis configured${NC}"
echo ""

# Deploy application
echo "Deploying application..."

# Create project directory
sudo mkdir -p $PROJECT_DIR
sudo chown $SERVICE_USER:$SERVICE_USER $PROJECT_DIR

# Copy application files
echo "Copying application files..."
sudo cp -r . $PROJECT_DIR/
sudo chown -R $SERVICE_USER:$SERVICE_USER $PROJECT_DIR

# Switch to project directory
cd $PROJECT_DIR

# Create production environment file
echo "Creating production environment..."
sudo -u $SERVICE_USER tee $PROJECT_DIR/.env > /dev/null <<EOF
# Production Environment Configuration
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1,$(hostname -I | awk '{print $1}')

# Database Configuration
DATABASE_URL=postgresql://taf_user:taf_password_2024@localhost:5432/taf_attendance

# Redis Configuration
REDIS_URL=redis://localhost:6379/0

# BioTime Configuration (Update these with your actual values)
BIOTIME_URL=http://172.16.10.250:8002
BIOTIME_USERNAME=your_username
BIOTIME_PASSWORD=your_password

# Security
SECRET_KEY=$(python3 -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())')

# Email Configuration (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your_email@gmail.com
EMAIL_HOST_PASSWORD=your_app_password
EOF

echo -e "${GREEN}✓ Environment file created${NC}"
echo ""

# Validate required environment variables
echo "Validating environment configuration..."
source $PROJECT_DIR/.env

echo -e "${YELLOW}⚠ IMPORTANT: Please update the following in $PROJECT_DIR/.env:${NC}"
echo "  - BIOTIME_URL: Your ZKBio Time server URL"
echo "  - BIOTIME_USERNAME: Your BioTime username"
echo "  - BIOTIME_PASSWORD: Your BioTime password"
echo ""
read -p "Press Enter after you've updated the configuration..."

# Setup Python virtual environment
echo "Setting up Python environment..."
sudo -u $SERVICE_USER python3 -m venv $PROJECT_DIR/venv
sudo -u $SERVICE_USER $PROJECT_DIR/venv/bin/pip install --upgrade pip
sudo -u $SERVICE_USER $PROJECT_DIR/venv/bin/pip install -r $PROJECT_DIR/requirements.txt
sudo -u $SERVICE_USER $PROJECT_DIR/venv/bin/pip install gunicorn psycopg2-binary redis celery

echo -e "${GREEN}✓ Python environment configured${NC}"
echo ""

# Setup frontend
echo "Setting up frontend..."
cd $PROJECT_DIR/taf-attendance
sudo -u $SERVICE_USER bun install
sudo -u $SERVICE_USER bun run build

echo -e "${GREEN}✓ Frontend built${NC}"
echo ""

# Setup Django
echo "Setting up Django..."
cd $PROJECT_DIR

# Create production settings
sudo -u $SERVICE_USER tee $PROJECT_DIR/taf_attendance/settings_production.py > /dev/null <<'EOF'
from .settings import *
import os
from pathlib import Path

# Production settings
DEBUG = False
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', 'localhost').split(',')

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'taf_attendance',
        'USER': 'taf_user',
        'PASSWORD': 'taf_password_2024',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}

# Redis Cache
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}

# Static files
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Security settings
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_REFERRER_POLICY = 'same-origin'

# Session security
SESSION_COOKIE_SECURE = False  # Set to True when using HTTPS
CSRF_COOKIE_SECURE = False    # Set to True when using HTTPS
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': '/var/log/taf-attendance/django.log',
            'formatter': 'verbose',
        },
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
}
EOF

# Create log directory
sudo mkdir -p /var/log/taf-attendance
sudo chown $SERVICE_USER:$SERVICE_USER /var/log/taf-attendance

# Run Django setup
export DJANGO_SETTINGS_MODULE=taf_attendance.settings_production
sudo -u $SERVICE_USER $PROJECT_DIR/venv/bin/python manage.py migrate
sudo -u $SERVICE_USER $PROJECT_DIR/venv/bin/python manage.py collectstatic --noinput

echo -e "${GREEN}✓ Django configured${NC}"
echo ""

# Create systemd service for Django
echo "Creating systemd service..."
sudo tee /etc/systemd/system/taf-attendance.service > /dev/null <<EOF
[Unit]
Description=TAF Attendance Django Application
After=network.target postgresql.service redis.service
Wants=postgresql.service redis.service

[Service]
Type=exec
User=$SERVICE_USER
Group=$SERVICE_USER
WorkingDirectory=$PROJECT_DIR
Environment=DJANGO_SETTINGS_MODULE=taf_attendance.settings_production
ExecStart=$PROJECT_DIR/venv/bin/gunicorn --workers 3 --bind 127.0.0.1:8001 taf_attendance.wsgi:application
ExecReload=/bin/kill -s HUP \$MAINPID
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=taf-attendance

[Install]
WantedBy=multi-user.target
EOF

# Create systemd service for Celery (background tasks)
sudo tee /etc/systemd/system/taf-attendance-celery.service > /dev/null <<EOF
[Unit]
Description=TAF Attendance Celery Worker
After=network.target redis.service
Wants=redis.service

[Service]
Type=exec
User=$SERVICE_USER
Group=$SERVICE_USER
WorkingDirectory=$PROJECT_DIR
Environment=DJANGO_SETTINGS_MODULE=taf_attendance.settings_production
ExecStart=$PROJECT_DIR/venv/bin/celery -A taf_attendance worker --loglevel=info
ExecReload=/bin/kill -s HUP \$MAINPID
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=taf-attendance-celery

[Install]
WantedBy=multi-user.target
EOF

# Enable and start services
sudo systemctl daemon-reload
sudo systemctl enable taf-attendance
sudo systemctl enable taf-attendance-celery
sudo systemctl start taf-attendance
sudo systemctl start taf-attendance-celery

echo -e "${GREEN}✓ Systemd services created and started${NC}"
echo ""

# Configure Nginx
echo "Configuring Nginx..."
sudo tee $NGINX_AVAILABLE/taf-attendance > /dev/null <<EOF
server {
    listen 80;
    server_name _;
    
    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy same-origin;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Static files
    location /static/ {
        alias $PROJECT_DIR/staticfiles/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Media files
    location /media/ {
        alias $PROJECT_DIR/media/;
        expires 1y;
        add_header Cache-Control "public";
    }
    
    # Django API
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_redirect off;
        
        # CORS headers
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Accept, Authorization, Content-Type, X-CSRFToken" always;
        
        # Handle preflight requests
        if (\$request_method = OPTIONS) {
            return 204;
        }
    }
    
    # Django admin
    location /admin/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_redirect off;
    }
    
    # React frontend
    location / {
        root $PROJECT_DIR/taf-attendance/dist;
        try_files \$uri \$uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

# Enable Nginx site
sudo ln -sf $NGINX_AVAILABLE/taf-attendance $NGINX_ENABLED/
sudo rm -f $NGINX_ENABLED/default

# Test and reload Nginx
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx

echo -e "${GREEN}✓ Nginx configured and started${NC}"
echo ""

# Setup firewall
echo "Configuring firewall..."
sudo ufw --force enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 80
sudo ufw allow 443

echo -e "${GREEN}✓ Firewall configured${NC}"
echo ""

# Create backup script
echo "Creating backup script..."
sudo tee /usr/local/bin/taf-attendance-backup.sh > /dev/null <<EOF
#!/bin/bash
# TAF Attendance Backup Script

BACKUP_DIR="/var/backups/taf-attendance"
DATE=\$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p \$BACKUP_DIR

# Backup database
sudo -u postgres pg_dump taf_attendance > \$BACKUP_DIR/database_\$DATE.sql

# Backup application files
tar -czf \$BACKUP_DIR/application_\$DATE.tar.gz -C $PROJECT_DIR .

# Keep only last 7 days of backups
find \$BACKUP_DIR -name "*.sql" -mtime +7 -delete
find \$BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: \$DATE"
EOF

sudo chmod +x /usr/local/bin/taf-attendance-backup.sh

# Setup daily backup cron job
echo "0 2 * * * /usr/local/bin/taf-attendance-backup.sh" | sudo crontab -

echo -e "${GREEN}✓ Backup system configured${NC}"
echo ""

# Create management scripts
echo "Creating management scripts..."

# Start script
sudo tee /usr/local/bin/taf-attendance-start > /dev/null <<EOF
#!/bin/bash
sudo systemctl start postgresql redis-server taf-attendance taf-attendance-celery nginx
echo "TAF Attendance services started"
EOF

# Stop script
sudo tee /usr/local/bin/taf-attendance-stop > /dev/null <<EOF
#!/bin/bash
sudo systemctl stop taf-attendance taf-attendance-celery nginx
echo "TAF Attendance services stopped"
EOF

# Status script
sudo tee /usr/local/bin/taf-attendance-status > /dev/null <<EOF
#!/bin/bash
echo "=== TAF Attendance System Status ==="
echo ""
echo "Services:"
sudo systemctl status postgresql --no-pager -l
sudo systemctl status redis-server --no-pager -l
sudo systemctl status taf-attendance --no-pager -l
sudo systemctl status taf-attendance-celery --no-pager -l
sudo systemctl status nginx --no-pager -l
echo ""
echo "Ports:"
sudo netstat -tlnp | grep -E ':(80|443|5432|6379|8001)'
EOF

# Update script
sudo tee /usr/local/bin/taf-attendance-update > /dev/null <<EOF
#!/bin/bash
echo "Updating TAF Attendance System..."

# Stop services
sudo systemctl stop taf-attendance taf-attendance-celery

# Backup current version
sudo -u $SERVICE_USER cp -r $PROJECT_DIR $PROJECT_DIR.backup.\$(date +%Y%m%d_%H%M%S)

# Update code (assuming git repository)
cd $PROJECT_DIR
sudo -u $SERVICE_USER git pull

# Update Python dependencies
sudo -u $SERVICE_USER $PROJECT_DIR/venv/bin/pip install -r requirements.txt

# Update frontend
cd $PROJECT_DIR/taf-attendance
sudo -u $SERVICE_USER bun install
sudo -u $SERVICE_USER bun run build

# Run Django migrations
cd $PROJECT_DIR
export DJANGO_SETTINGS_MODULE=taf_attendance.settings_production
sudo -u $SERVICE_USER $PROJECT_DIR/venv/bin/python manage.py migrate
sudo -u $SERVICE_USER $PROJECT_DIR/venv/bin/python manage.py collectstatic --noinput

# Restart services
sudo systemctl start taf-attendance taf-attendance-celery
sudo systemctl reload nginx

echo "Update completed successfully"
EOF

# Make scripts executable
sudo chmod +x /usr/local/bin/taf-attendance-*

echo -e "${GREEN}✓ Management scripts created${NC}"
echo ""

# Final service status check
echo "Checking service status..."
sleep 5

if sudo systemctl is-active --quiet taf-attendance; then
    echo -e "${GREEN}✓ Django service is running${NC}"
else
    echo -e "${RED}✗ Django service failed to start${NC}"
    sudo systemctl status taf-attendance --no-pager -l
fi

if sudo systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✓ Nginx service is running${NC}"
else
    echo -e "${RED}✗ Nginx service failed to start${NC}"
    sudo systemctl status nginx --no-pager -l
fi

echo ""
echo "================================================"
echo -e "${GREEN}✓ Ubuntu Server Deployment Completed!${NC}"
echo "================================================"
echo ""
echo -e "${BLUE}🌐 Access your application:${NC}"
echo "  Frontend: http://$(hostname -I | awk '{print $1}')"
echo "  Backend API: http://$(hostname -I | awk '{print $1}')/api"
echo "  Django Admin: http://$(hostname -I | awk '{print $1}')/admin"
echo "  Health Check: http://$(hostname -I | awk '{print $1}')/health"
echo ""
echo -e "${BLUE}🔧 Management Commands:${NC}"
echo "  Start services: taf-attendance-start"
echo "  Stop services: taf-attendance-stop"
echo "  Check status: taf-attendance-status"
echo "  Update system: taf-attendance-update"
echo "  Manual backup: /usr/local/bin/taf-attendance-backup.sh"
echo ""
echo -e "${BLUE}📋 Service Information:${NC}"
echo "  Services auto-start on boot: ✓ Enabled"
echo "  Daily backups: ✓ Configured (2:00 AM)"
echo "  Firewall: ✓ Configured"
echo "  SSL/HTTPS: Run 'sudo certbot --nginx' to enable"
echo ""
echo -e "${BLUE}📁 Important Paths:${NC}"
echo "  Application: $PROJECT_DIR"
echo "  Logs: /var/log/taf-attendance/"
echo "  Backups: /var/backups/taf-attendance/"
echo "  Nginx config: $NGINX_AVAILABLE/taf-attendance"
echo ""
echo -e "${YELLOW}⚠ Next Steps:${NC}"
echo "1. Update BioTime credentials in: $PROJECT_DIR/.env"
echo "2. Create Django superuser: sudo -u $SERVICE_USER $PROJECT_DIR/venv/bin/python $PROJECT_DIR/manage.py createsuperuser"
echo "3. Setup SSL certificate: sudo certbot --nginx"
echo "4. Test the application thoroughly"
echo ""
echo -e "${GREEN}🎉 Your TAF Attendance System is now running and will auto-start on boot!${NC}"
