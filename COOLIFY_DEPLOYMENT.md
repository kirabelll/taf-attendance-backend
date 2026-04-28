# Coolify Deployment Guide - TAF Attendance System

## 🚀 Quick Deploy to Coolify

### Step 1: Prepare Your Repository

1. **Push your code to Git**
   ```bash
   git add .
   git commit -m "Ready for Coolify deployment"
   git push origin main
   ```

2. **Ensure these files are in your repository:**
   - ✅ `docker-compose.prod.yml`
   - ✅ `Dockerfile.backend`
   - ✅ `Dockerfile.frontend.simple`
   - ✅ `nginx.conf`
   - ✅ `.env.example`

### Step 2: Create Resource in Coolify

1. **Login to Coolify Dashboard**
   - Navigate to your Coolify instance

2. **Create New Resource**
   - Click "+ New" or "Add Resource"
   - Select "Docker Compose"
   - Choose "Public Repository" or "Private Repository"

3. **Configure Repository**
   - **Repository URL**: `https://github.com/yourusername/your-repo.git`
   - **Branch**: `main`
   - **Docker Compose Location**: `docker-compose.prod.yml`
   - **Build Pack**: Docker Compose

### Step 3: Configure Environment Variables

Click on "Environment Variables" and add the following:

#### Required Variables

```env
# Database Configuration
POSTGRES_DB=taf_attendance
POSTGRES_USER=taf_user
POSTGRES_PASSWORD=YOUR_STRONG_PASSWORD_HERE

# Django Configuration
DJANGO_SECRET_KEY=YOUR_LONG_RANDOM_SECRET_KEY_HERE
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=your-domain.com

# ZKBio Time Configuration (REQUIRED)
BIOTIME_URL=http://your-zkbio-server:8002
BIOTIME_USERNAME=your-username
BIOTIME_PASSWORD=your-password
BIOTIME_API_VERSION=v1

# Integration Settings
INTEGRATION_MODE=biotime
SYNC_INTERVAL_MINUTES=1
MAX_RETRIES=3
BATCH_SIZE=100
LOG_LEVEL=INFO
```

#### Generate Django Secret Key

Use this command to generate a secure secret key:
```bash
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

Or use: https://djecrety.ir/

### Step 4: Configure Domain

1. Go to "Domains" tab
2. Add your domain: `attendance.yourdomain.com`
3. Enable "Generate SSL Certificate" (Let's Encrypt)
4. Update `DJANGO_ALLOWED_HOSTS` to include your domain

### Step 5: Deploy

1. Click "Deploy" button
2. Monitor the build logs
3. Wait for all services to start (this may take 3-5 minutes)

### Step 6: Verify Deployment

1. **Check Frontend**: Visit `https://your-domain.com`
2. **Check Backend API**: Visit `https://your-domain.com/api/test-connection/`
3. **Check Logs**: View logs in Coolify dashboard

## 🔧 Troubleshooting

### Build Fails: "pnpm-lock.yaml not found"

**Solution**: The system now uses npm instead. This is already fixed in `Dockerfile.frontend.simple`.

If you still see this error:
1. Make sure `docker-compose.prod.yml` uses `Dockerfile.frontend.simple`
2. Or delete `pnpm-lock.yaml` references from your Dockerfile

### Build Fails: "Cannot find module"

**Solution**: 
1. Check that all files are committed to Git
2. Verify the build context in docker-compose.prod.yml
3. Check `.dockerignore` isn't excluding necessary files

### Backend Health Check Fails

**Symptoms**: Backend container keeps restarting

**Solutions**:
1. Check environment variables are set correctly
2. Verify database connection:
   ```bash
   # In Coolify terminal
   docker logs <backend-container-id>
   ```
3. Check ZKBio Time server is accessible from Coolify server
4. Increase health check timeout in docker-compose.prod.yml

### Database Connection Error

**Symptoms**: Backend logs show "could not connect to server"

**Solutions**:
1. Verify `POSTGRES_PASSWORD` is set
2. Check database service is running:
   ```bash
   docker ps | grep postgres
   ```
3. Wait 30 seconds for database to initialize on first deploy

### Frontend Shows 502 Bad Gateway

**Symptoms**: Frontend loads but API calls fail

**Solutions**:
1. Check backend is running: `docker ps`
2. Verify nginx.conf proxy settings
3. Check backend logs for errors
4. Ensure backend service name is `backend` in docker-compose

### Cannot Connect to ZKBio Time

**Symptoms**: Backend starts but can't fetch attendance data

**Solutions**:
1. Verify `BIOTIME_URL` is correct and accessible
2. Check network connectivity from Coolify server:
   ```bash
   # In backend container
   curl -v http://your-zkbio-server:8002
   ```
3. Verify ZKBio Time credentials
4. Check firewall rules allow connection

## 📊 Monitoring

### View Logs

In Coolify dashboard:
1. Go to your resource
2. Click "Logs" tab
3. Select service (backend, frontend, db)
4. View real-time logs

### Check Service Status

```bash
# In Coolify terminal
docker ps

# Check specific service
docker logs <container-name>
```

### Database Access

```bash
# Connect to database
docker exec -it <db-container-id> psql -U taf_user -d taf_attendance

# Run queries
SELECT COUNT(*) FROM django_migrations;
```

## 🔄 Updates

### Deploy New Version

1. **Push changes to Git**
   ```bash
   git add .
   git commit -m "Update feature"
   git push origin main
   ```

2. **Redeploy in Coolify**
   - Click "Redeploy" button
   - Or enable "Auto Deploy" for automatic deployments

### Rollback

1. Go to "Deployments" tab
2. Find previous successful deployment
3. Click "Redeploy" on that version

## 🔒 Security Checklist

- [ ] Changed `POSTGRES_PASSWORD` from default
- [ ] Generated strong `DJANGO_SECRET_KEY`
- [ ] Set `DJANGO_DEBUG=False`
- [ ] Configured `DJANGO_ALLOWED_HOSTS` with your domain
- [ ] Enabled SSL/TLS certificate
- [ ] Updated `BIOTIME_PASSWORD` from default
- [ ] Restricted database port (not exposed publicly)
- [ ] Regular backups configured

## 📦 Resource Requirements

### Minimum Requirements
- **CPU**: 2 cores
- **RAM**: 2 GB
- **Storage**: 10 GB

### Recommended for Production
- **CPU**: 4 cores
- **RAM**: 4 GB
- **Storage**: 20 GB

## 🆘 Common Issues & Solutions

### Issue: "Port already in use"

**Solution**: Change the port in Coolify settings or docker-compose.prod.yml

### Issue: "Out of memory"

**Solution**: 
1. Increase server RAM
2. Add swap space
3. Reduce worker count in backend

### Issue: "Build timeout"

**Solution**:
1. Increase build timeout in Coolify settings
2. Use pre-built images instead of building
3. Optimize Dockerfile (remove unnecessary dependencies)

### Issue: "SSL certificate not working"

**Solution**:
1. Verify domain DNS points to Coolify server
2. Wait 5-10 minutes for certificate generation
3. Check Coolify logs for certificate errors
4. Ensure port 80 and 443 are open

## 📞 Support

### Logs to Check
1. **Build logs**: In Coolify deployment history
2. **Runtime logs**: In Coolify logs tab
3. **Backend logs**: `docker logs <backend-container>`
4. **Frontend logs**: `docker logs <frontend-container>`
5. **Database logs**: `docker logs <db-container>`

### Useful Commands

```bash
# Check all containers
docker ps -a

# View container logs
docker logs -f <container-name>

# Execute command in container
docker exec -it <container-name> bash

# Check disk space
df -h

# Check memory usage
free -h

# Restart specific service
docker restart <container-name>
```

## 🎯 Next Steps

After successful deployment:

1. **Test all features**
   - Login functionality
   - Attendance data sync
   - Report generation
   - CSV export

2. **Configure backups**
   - Database backups
   - Volume backups
   - Configuration backups

3. **Set up monitoring**
   - Uptime monitoring
   - Error tracking
   - Performance monitoring

4. **Document your setup**
   - Server details
   - Domain configuration
   - Backup procedures
   - Recovery procedures

## 📝 Notes

- First deployment takes 5-10 minutes
- Database initialization happens on first start
- SSL certificate generation may take a few minutes
- Health checks may fail initially while services start

---

**Need Help?** Check the main [DEPLOYMENT.md](./DEPLOYMENT.md) for more detailed information.
