# Quick Reference - TAF Attendance Docker Deployment

## 🚀 Deploy to Coolify in 5 Minutes

### Step 1: Push to Git
```bash
git add .
git commit -m "Deploy to Coolify"
git push origin main
```

### Step 2: Create Resource in Coolify
- New Resource → Docker Compose
- Repository: Your Git URL
- Branch: `main`
- Compose File: `docker-compose.prod.yml`

### Step 3: Add Environment Variables
```env
POSTGRES_PASSWORD=<strong-password>
DJANGO_SECRET_KEY=<secret-key>
DJANGO_ALLOWED_HOSTS=your-domain.com
BIOTIME_URL=http://zkbio-server:8002
BIOTIME_USERNAME=admin
BIOTIME_PASSWORD=<password>
```

### Step 4: Deploy
Click "Deploy" and wait 5 minutes ✅

---

## 🔑 Generate Secrets

### Django Secret Key
```bash
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

### Strong Password
```bash
openssl rand -base64 32
```

---

## 📋 Required Environment Variables

| Variable | Example | Required |
|----------|---------|----------|
| `POSTGRES_PASSWORD` | `mySecurePass123` | ✅ Yes |
| `DJANGO_SECRET_KEY` | `long-random-string` | ✅ Yes |
| `DJANGO_ALLOWED_HOSTS` | `attendance.com` | ✅ Yes |
| `BIOTIME_URL` | `http://172.16.10.250:8002` | ✅ Yes |
| `BIOTIME_USERNAME` | `admin` | ✅ Yes |
| `BIOTIME_PASSWORD` | `password123` | ✅ Yes |

---

## 🐛 Quick Troubleshooting

### Build Fails
```bash
# Check logs in Coolify
# Verify all files are committed to Git
git status
git add .
git commit -m "Fix"
git push
```

### Backend Won't Start
```bash
# Check environment variables are set
# Verify database is running
# Check logs for errors
```

### Can't Connect to ZKBio
```bash
# Verify BIOTIME_URL is correct
# Check network connectivity
# Test from backend container:
docker exec <backend> curl -v $BIOTIME_URL
```

---

## 📊 Useful Commands

### View Logs
```bash
# In Coolify: Logs tab → Select service

# Or via SSH:
docker logs <container-name> -f
```

### Check Status
```bash
docker ps
```

### Restart Service
```bash
docker restart <container-name>
```

### Database Access
```bash
docker exec -it <db-container> psql -U taf_user -d taf_attendance
```

---

## 🔄 Update Deployment

```bash
# 1. Make changes
# 2. Commit and push
git add .
git commit -m "Update"
git push

# 3. Redeploy in Coolify
# Click "Redeploy" button
```

---

## 📁 Important Files

| File | Purpose |
|------|---------|
| `docker-compose.prod.yml` | Production configuration |
| `Dockerfile.backend` | Backend container |
| `Dockerfile.frontend.simple` | Frontend container |
| `nginx.conf` | Web server config |
| `.env` | Environment variables |

---

## 🎯 Access Points

After deployment:

- **Frontend**: `https://your-domain.com`
- **API**: `https://your-domain.com/api/`
- **Health Check**: `https://your-domain.com/api/test-connection/`

---

## ✅ Post-Deployment Checklist

- [ ] Frontend loads correctly
- [ ] API responds at `/api/test-connection/`
- [ ] Can login to system
- [ ] Attendance data syncs from ZKBio
- [ ] Reports generate correctly
- [ ] CSV export works
- [ ] SSL certificate active

---

## 📞 Need Help?

1. **Check logs** - Most issues show in logs
2. **Verify environment variables** - Missing vars cause failures
3. **Test connectivity** - Ensure ZKBio server is reachable
4. **Review documentation**:
   - [COOLIFY_DEPLOYMENT.md](./COOLIFY_DEPLOYMENT.md) - Detailed Coolify guide
   - [DEPLOYMENT.md](./DEPLOYMENT.md) - Complete deployment guide
   - [DOCKER_SETUP_SUMMARY.md](./DOCKER_SETUP_SUMMARY.md) - Architecture overview

---

## 🔒 Security Reminders

- ✅ Change all default passwords
- ✅ Use strong DJANGO_SECRET_KEY
- ✅ Set DJANGO_DEBUG=False
- ✅ Configure proper ALLOWED_HOSTS
- ✅ Enable SSL/TLS
- ✅ Regular backups

---

**That's it! Your TAF Attendance System should now be running on Coolify! 🎉**
