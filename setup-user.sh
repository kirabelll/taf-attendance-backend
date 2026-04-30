#!/bin/bash

# TAF Attendance - User Setup Script
# Run this first if you need to create a deployment user

set -e

echo "================================================"
echo "TAF Attendance - User Setup"
echo "================================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}This user setup script must be run as root${NC}"
   echo "Usage: sudo ./setup-user.sh"
   exit 1
fi

echo -e "${GREEN}✓ Running as root${NC}"

# Create deployment user
DEPLOY_USER="deploy"

if id "$DEPLOY_USER" &>/dev/null; then
    echo -e "${YELLOW}⚠️  User '$DEPLOY_USER' already exists${NC}"
else
    echo "Creating deployment user '$DEPLOY_USER'..."
    useradd -m -s /bin/bash $DEPLOY_USER
    echo -e "${GREEN}✓ User '$DEPLOY_USER' created${NC}"
fi

# Add to sudo group
usermod -aG sudo $DEPLOY_USER
echo -e "${GREEN}✓ Added '$DEPLOY_USER' to sudo group${NC}"

# Allow passwordless sudo for deployment
echo "$DEPLOY_USER ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/$DEPLOY_USER
echo -e "${GREEN}✓ Configured passwordless sudo${NC}"

# Set up SSH key (optional)
echo ""
echo "Do you want to set up SSH key authentication for the deploy user? (y/n)"
read -r setup_ssh

if [[ $setup_ssh =~ ^[Yy]$ ]]; then
    # Create .ssh directory
    mkdir -p /home/$DEPLOY_USER/.ssh
    chmod 700 /home/$DEPLOY_USER/.ssh
    
    echo ""
    echo "Please paste your public SSH key (or press Enter to skip):"
    read -r ssh_key
    
    if [[ -n "$ssh_key" ]]; then
        echo "$ssh_key" > /home/$DEPLOY_USER/.ssh/authorized_keys
        chmod 600 /home/$DEPLOY_USER/.ssh/authorized_keys
        chown -R $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/.ssh
        echo -e "${GREEN}✓ SSH key configured${NC}"
    else
        echo -e "${YELLOW}⚠️  SSH key setup skipped${NC}"
    fi
fi

# Copy deployment script to deploy user's home
if [ -f "deploy.sh" ]; then
    cp deploy.sh /home/$DEPLOY_USER/
    chown $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/deploy.sh
    chmod +x /home/$DEPLOY_USER/deploy.sh
    echo -e "${GREEN}✓ Deployment script copied to /home/$DEPLOY_USER/${NC}"
fi

if [ -f "deploy-root.sh" ]; then
    cp deploy-root.sh /home/$DEPLOY_USER/
    chown $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/deploy-root.sh
    chmod +x /home/$DEPLOY_USER/deploy-root.sh
    echo -e "${GREEN}✓ Root deployment script copied to /home/$DEPLOY_USER/${NC}"
fi

echo ""
echo "================================================"
echo -e "${GREEN}✓ User Setup Complete!${NC}"
echo "================================================"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo ""
echo "1. Switch to the deploy user:"
echo "   su - $DEPLOY_USER"
echo ""
echo "2. Run the deployment script:"
echo "   ./deploy.sh"
echo ""
echo "Or if you prefer to continue as root:"
echo "   ./deploy-root.sh"
echo ""
echo -e "${GREEN}The '$DEPLOY_USER' user is now ready for deployment!${NC}"