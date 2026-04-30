#!/bin/bash

# TAF Attendance System - Root-Friendly Ubuntu Server Deployment
# This script can be run as root and will handle user creation automatically

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
DEPLOY_USER="deploy"
NGINX_AVAILABLE="/etc/nginx/sites-available"
NGINX_ENABLED="/etc/nginx/sites-enabled"

echo -e "${GREEN}✓ Starting deployment as root${NC}"
echo ""

# Update system packages
echo "Updating system packages..."
apt update && apt upgrade -y
echo -e "${GREEN}✓ System packages updated${NC}"
echo ""

# Install required system packages
echo "Installing system dependencies..."
apt install -y \
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
    python3-certbot-nginx \
    htop \
    ufw \
    fail2ban

echo -e "${GREEN}✓ System dependencies installed${NC}"
echo ""

# Create deployment user if running as root
if [[ $EUID -eq 0 ]]; then
    if ! id "$DEPLOY_USER" &>/dev/null; then
        echo "Creating deployment user '$DEPLOY_USER'..."
        useradd -m -s /bin/bash $DEPLOY_USER
        usermod -aG sudo $DEPLOY_USER
        echo "$DEPLOY_USER ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/$DEPLOY_USER
        echo -e "${GREEN}✓ Deployment user '$DEPLOY_USER' created${NC}"
    else
        echo -e "${GREEN}✓ Deployment user '$DEPLOY_USER' already exists${NC}"
    fi
fi

# Install Bun for all users
echo "Installing Bun..."
if ! command -v bun &> /dev/null; then
    # Install Bun globally
    curl -fsSL https://bun.sh/install | bash -s -- --global
    
    # Also install for deploy user
    if [[ $EUID -eq 0 ]] && id "$DEPLOY_USER" &>/dev/null; then
        sudo -u $DEPLOY_USER bash -c 'curl -fsSL https://bun.sh/install | bash'
        echo 'export PATH="$HOME/.bun/bin:$PATH"' >> /home/$DEPLOY_USER/.bashrc
    fi
    
    # Add to system PATH
    echo 'export PATH="/root/.bun/bin:$PATH"' >> /etc/environment
    export PATH="/root/.bun/bin:$PATH"
    
    echo -e "${GREEN}✓ Bun installed${NC}"
else
    echo -e "${GREEN}✓ Bun already installed${NC}"
fi
echo ""

# Create service user
echo "Creating service user..."
if ! id "$SERVICE_USER" &>/dev/null; then
    useradd --system --shell /bin/bash --home-dir $PROJECT_DIR --create-home $SERVICE_USER
    echo -e "${GREEN}✓ Service user '$SERVICE_USER' created${NC}"
else
    echo -e "${GREEN}✓ Service user '$SERVICE_USER' already exists${NC}"
fi
echo ""

# Setup PostgreSQL
echo "Setting up PostgreSQL..."
systemctl start postgresql
systemctl enable postgresql

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
systemctl start redis-server
systemctl enable redis-server
echo -e "${GREEN}✓ Redis configured${NC}"
echo ""

# Deploy application
echo "Deploying application..."

# Create project directory
mkdir -p $PROJECT_DIR
chown $SERVICE_USER:$SERVICE_USER $PROJECT_DIR

# Copy application files (assuming script is run from project directory)
if [ -f "manage.py" ]; then
    echo "Copying application files from current directory..."
    cp -r . $PROJECT_DIR/
    chown -R $SERVICE_USER:$SERVICE_USER $PROJECT_DIR
else
    echo "manage.py not found in current directory."
    echo "Please ensure you're running this script from the TAF Attendance project directory."
    echo "Or manually copy your project files to $PROJECT_DIR"
    read -p "Press Enter to continue (assuming files are already in place)..."
fi

# Switch to project directory
cd $PROJECT_DIR

# Create production environment file
echo "Creating production environment..."
tee $PROJECT_DIR/.env > /dev/null <<EOF
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

chown $SERVICE_USER:$SERVICE_USER $PROJECT_DIR/.env
echo -e "${GREEN}✓ Environment file created${NC}"
echo ""

# Setup Python virtual environment
echo "Setting up Python environment..."
sudo -u $SERVICE_USER python3 -m venv $PROJECT_DIR/venv
sudo -u $SERVICE_USER $PROJECT_DIR/venv/bin/pip install --upgrade pip

# Install Python dependencies
if [ -f "$PROJECT_DIR/requirements.txt" ]; then
    sudo -u $SERVICE_USER $PROJECT_DIR/venv/bin/pip install -r $PROJECT_DIR/requirements.txt
fi

# Install additional production packages
sudo -u $SERVICE_USER $PROJECT_DIR/venv/bin/pip install gunicorn psycopg2-binary redis celery django-redis

echo -e "${GREEN}✓ Python environment configured${NC}"
echo ""

# Setup frontend
echo "Setting up frontend..."
if [ -d "$PROJECT_DIR/taf-attendance" ]; then
    cd $PROJECT_DIR/taf-attendance
    
    # Make sure bun is available for service user
    if command -v bun &> /dev/null; then
        sudo -u $SERVICE_USER bun install
        sudo -u $SERVICE_USER bun run build
        echo -e "${GREEN}✓ Frontend built with Bun${NC}"
    elif command -v npm &> /dev/null; then
        sudo -u $SERVICE_USER npm install
        sudo -u $SERVICE_USER npm run build
        echo -e "${GREEN}✓ Frontend built with npm${NC}"
    else
        echo -e "${YELLOW}⚠️  Neither Bun nor npm found, skipping frontend build${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Frontend directory not found, skipping frontend build${NC}"
fi
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
mkdir -p /var/log/taf-attendance
chown $SERVICE_USER:$SERVICE_USER /var/log/taf-attendance

# Run Django setup
export DJANGO_SETTINGS_MODULE=taf_attendance.settings_production
sudo -u $SERVICE_USER $PROJECT_DIR/venv/bin/python manage.py migrate
sudo -u $SERVICE_USER $PROJECT_DIR/venv/bin/python manage.py collectstatic --noinput

echo -e "${GREEN}✓ Django configured${NC}"
echo ""

# Create systemd service for Django
echo "Creating systemd services..."
tee /etc/systemd/system/taf-attendance.service > /dev/null <<EOF
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

# Create systemd service for Celery
tee /etc/systemd/system/taf-attendance-celery.service > /dev/null <<EOF
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
systemctl daemon-reload
systemctl enable taf-attendance
systemctl enable taf-attendance-celery
systemctl start taf-attendance
systemctl start taf-attendance-celery

echo -e "${GREEN}✓ Systemd services created and started${NC}"
echo ""

# Configure Nginx
echo "Configuring Nginx..."
tee $NGINX_AVAILABLE/taf-attendance > /dev/null <<EOF
server {
    listen 80;
    server_name _;
    
    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy same-origin;
    
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
ln -sf $NGINX_AVAILABLE/taf-attendance $NGINX_ENABLED/
rm -f $NGINX_ENABLED/default

# Test and reload Nginx
nginx -t
systemctl enable nginx
systemctl restart nginx

echo -e "${GREEN}✓ Nginx configured and started${NC}"
echo ""

# Setup firewall
echo "Configuring firewall..."
ufw --force enable
ufw allow ssh
ufw allow 'Nginx Full'
ufw allow 80
ufw allow 443

echo -e "${GREEN}✓ Firewall configured${NC}"
echo ""

# Create management scripts
echo "Creating management scripts..."

# Start script
tee /usr/local/bin/taf-attendance-start > /dev/null <<EOF
#!/bin/bash
systemctl start postgresql redis-server taf-attendance taf-attendance-celery nginx
echo "TAF Attendance services started"
EOF

# Stop script
tee /usr/local/bin/taf-attendance-stop > /dev/null <<EOF
#!/bin/bash
systemctl stop taf-attendance taf-attendance-celery nginx
echo "TAF Attendance services stopped"
EOF

# Status script
tee /usr/local/bin/taf-attendance-status > /dev/null <<EOF
#!/bin/bash
echo "=== TAF Attendance System Status ==="
echo ""
systemctl status postgresql --no-pager -l
systemctl status redis-server --no-pager -l
systemctl status taf-attendance --no-pager -l
systemctl status taf-attendance-celery --no-pager -l
systemctl status nginx --no-pager -l
EOF

# Make scripts executable
chmod +x /usr/local/bin/taf-attendance-*

echo -e "${GREEN}✓ Management scripts created${NC}"
echo ""

# Final service status check
echo "Checking service status..."
sleep 5

if systemctl is-active --quiet taf-attendance; then
    echo -e "${GREEN}✓ Django service is running${NC}"
else
    echo -e "${RED}✗ Django service failed to start${NC}"
    systemctl status taf-attendance --no-pager -l
fi

if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✓ Nginx service is running${NC}"
else
    echo -e "${RED}✗ Nginx service failed to start${NC}"
    systemctl status nginx --no-pager -l
fi

echo ""
echo "================================================"
echo -e "${GREEN}✓ Ubuntu Server Deployment Completed!${NC}"
echo "================================================"
echo ""
echo -e "${BLUE}🌐 Access your application:${NC}"
SERVER_IP=$(hostname -I | awk '{print $1}')
echo "  Frontend: http://$SERVER_IP"
echo "  Backend API: http://$SERVER_IP/api"
echo "  Django Admin: http://$SERVER_IP/admin"
echo "  Health Check: http://$SERVER_IP/health"
echo ""
echo -e "${BLUE}🔧 Management Commands:${NC}"
echo "  Start services: taf-attendance-start"
echo "  Stop services: taf-attendance-stop"
echo "  Check status: taf-attendance-status"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Update BioTime credentials in: $PROJECT_DIR/.env"
echo "2. Create Django superuser:"
echo "   sudo -u $SERVICE_USER $PROJECT_DIR/venv/bin/python $PROJECT_DIR/manage.py createsuperuser"
echo "3. Setup SSL certificate: certbot --nginx"
echo ""
echo -e "${YELLOW}⚠ Important Files:${NC}"
echo "  Environment: $PROJECT_DIR/.env"
echo "  Logs: /var/log/taf-attendance/"
echo "  Nginx config: $NGINX_AVAILABLE/taf-attendance"
echo ""
echo -e "${GREEN}🎉 Your TAF Attendance System is now running and will auto-start on boot!${NC}"