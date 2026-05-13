# TAF Attendance System - Installation Guide

## 🚀 **Quick Installation Options**

### **Option 1: Root Installation (Easiest)**
If you have root access and want the simplest installation:

```bash
# Upload files to your Ubuntu server
scp -r . root@your-server:/root/taf-attendance

# SSH as root
ssh root@your-server

# Navigate to project directory
cd /root/taf-attendance

# Run root-friendly deployment
chmod +x deploy-root.sh
./deploy-root.sh
```

### **Option 2: User-Based Installation (Recommended)**
For better security with a dedicated deployment user:

```bash
# Step 1: Setup deployment user (as root)
sudo chmod +x setup-user.sh
sudo ./setup-user.sh

# Step 2: Switch to deployment user
su - deploy

# Step 3: Copy your project files to the deploy user's home
# (or upload directly to /home/deploy/)

# Step 4: Run deployment
chmod +x deploy.sh
./deploy.sh
```

### **Option 3: Direct User Installation**
If you already have a non-root user with sudo privileges:

```bash
# Ensure your user has sudo privileges
sudo usermod -aG sudo $USER

# Log out and log back in, then run:
chmod +x deploy.sh
./deploy.sh
```

---

## 📋 **Prerequisites**

### **System Requirements**
- **OS:** Ubuntu 20.04 LTS or newer
- **RAM:** 2GB minimum, 4GB recommended
- **Storage:** 20GB minimum
- **Network:** Internet connection for package installation

### **User Requirements**
- Root access OR
- Non-root user with sudo privileges

---

## 🔧 **Installation Methods Explained**

### **Method 1: Root Installation (`deploy-root.sh`)**

**Pros:**
- ✅ Simplest to run
- ✅ Handles all user creation automatically
- ✅ No permission issues

**Cons:**
- ⚠️ Runs as root (less secure)
- ⚠️ Creates users automatically

**When to use:** Quick testing, development servers, when you have full control

```bash
# As root user
./deploy-root.sh
```

### **Method 2: User Setup + Deployment (`setup-user.sh` + `deploy.sh`)**

**Pros:**
- ✅ More secure (runs as non-root user)
- ✅ Follows security best practices
- ✅ Controlled user creation

**Cons:**
- ⚠️ Two-step process
- ⚠️ Requires initial root access

**When to use:** Production servers, security-conscious environments

```bash
# Step 1 (as root)
sudo ./setup-user.sh

# Step 2 (as deploy user)
su - deploy
./deploy.sh
```

### **Method 3: Direct User Deployment (`deploy.sh`)**

**Pros:**
- ✅ Most secure
- ✅ Uses existing user account
- ✅ No additional user creation

**Cons:**
- ⚠️ Requires pre-configured sudo user
- ⚠️ May need manual user setup

**When to use:** When you already have a properly configured user account

```bash
# As non-root user with sudo
./deploy.sh
```

---

## 🛠️ **Troubleshooting Installation Issues**

### **"This script should not be run as root"**

**Problem:** You're running `deploy.sh` as root user.

**Solutions:**

1. **Use the root-friendly script:**
   ```bash
   ./deploy-root.sh
   ```

2. **Create a deployment user:**
   ```bash
   sudo ./setup-user.sh
   su - deploy
   ./deploy.sh
   ```

3. **Use an existing non-root user:**
   ```bash
   # Switch to non-root user
   su - your-username
   ./deploy.sh
   ```

### **"User does not have sudo privileges"**

**Problem:** Your user account doesn't have sudo access.

**Solution:**
```bash
# As root, add user to sudo group
sudo usermod -aG sudo your-username

# Log out and log back in
exit
ssh your-username@your-server

# Test sudo access
sudo whoami
```

### **"Permission denied" errors**

**Problem:** Script files don't have execute permissions.

**Solution:**
```bash
# Make scripts executable
chmod +x *.sh

# Or individually
chmod +x deploy.sh
chmod +x deploy-root.sh
chmod +x setup-user.sh
```

### **"Package installation failed"**

**Problem:** System packages can't be installed.

**Solution:**
```bash
# Update package lists
sudo apt update

# Fix broken packages
sudo apt --fix-broken install

# Try installation again
sudo apt install python3 python3-pip nginx postgresql
```

---

## 📁 **File Upload Methods**

### **Method 1: SCP (Secure Copy)**
```bash
# Upload entire project directory
scp -r /path/to/taf-attendance user@server:/home/user/

# Upload specific files
scp deploy-root.sh user@server:/home/user/
```

### **Method 2: Git Clone**
```bash
# On the server
git clone https://github.com/your-repo/taf-attendance.git
cd taf-attendance
```

### **Method 3: SFTP**
```bash
# Using SFTP client
sftp user@server
put -r /local/path/taf-attendance /remote/path/
```

### **Method 4: Rsync**
```bash
# Sync files with rsync
rsync -avz /local/taf-attendance/ user@server:/home/user/taf-attendance/
```

---

## 🔐 **Security Considerations**

### **For Production Servers:**

1. **Use Method 2 (User Setup + Deployment):**
   ```bash
   sudo ./setup-user.sh
   su - deploy
   ./deploy.sh
   ```

2. **Disable root SSH access after setup:**
   ```bash
   # Edit SSH config
   sudo nano /etc/ssh/sshd_config
   
   # Set: PermitRootLogin no
   sudo systemctl restart ssh
   ```

3. **Use SSH keys instead of passwords:**
   ```bash
   # During setup-user.sh, provide your public key
   # Or manually add it later
   ```

### **For Development/Testing:**

1. **Method 1 (Root Installation) is acceptable:**
   ```bash
   ./deploy-root.sh
   ```

---

## ✅ **Installation Success Checklist**

After running any installation method, verify:

- [ ] **Services are running:**
  ```bash
  taf-attendance-status
  ```

- [ ] **Web application is accessible:**
  ```bash
  curl http://localhost/health
  ```

- [ ] **Database is working:**
  ```bash
  sudo -u postgres psql -c "SELECT version();"
  ```

- [ ] **All ports are open:**
  ```bash
  sudo netstat -tlnp | grep -E ':(80|443|5432|6379|8001)'
  ```

- [ ] **Services auto-start on boot:**
  ```bash
  sudo systemctl is-enabled taf-attendance
  sudo systemctl is-enabled nginx
  ```

---

## 🎯 **Quick Decision Guide**

**Choose your installation method:**

| Scenario | Recommended Method | Command |
|----------|-------------------|---------|
| **Testing/Development** | Root Installation | `./deploy-root.sh` |
| **Production Server** | User Setup + Deploy | `sudo ./setup-user.sh` then `su - deploy && ./deploy.sh` |
| **Existing User Account** | Direct Deployment | `./deploy.sh` |
| **Security-First Environment** | User Setup + Deploy | `sudo ./setup-user.sh` then `su - deploy && ./deploy.sh` |
| **Quick Demo** | Root Installation | `./deploy-root.sh` |

---

## 📞 **Getting Help**

If you encounter issues:

1. **Check the logs:**
   ```bash
   sudo journalctl -u taf-attendance -f
   ```

2. **Verify system status:**
   ```bash
   taf-attendance-status
   ```

3. **Check file permissions:**
   ```bash
   ls -la /opt/taf-attendance/
   ```

4. **Test individual components:**
   ```bash
   # Test database
   sudo -u postgres psql taf_attendance -c "SELECT 1;"
   
   # Test Django
   sudo -u taf-attendance /opt/taf-attendance/venv/bin/python /opt/taf-attendance/manage.py check
   
   # Test Nginx
   sudo nginx -t
   ```

---

## 🎉 **Success!**

Once installation is complete, your TAF Attendance System will be:

- ✅ **Running at:** `http://YOUR_SERVER_IP`
- ✅ **Auto-starting on boot**
- ✅ **Production-ready**
- ✅ **Fully configured**

**Next steps:** Update your BioTime credentials and create an admin user!