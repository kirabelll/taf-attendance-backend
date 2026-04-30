#!/bin/bash

# TAF Attendance System - Quick Ubuntu Installation
# Run this script on a fresh Ubuntu server

set -e

echo "================================================"
echo "TAF Attendance - Quick Ubuntu Installation"
echo "================================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check Ubuntu version
if ! grep -q "Ubuntu" /etc/os-release; then
    echo -e "${RED}This script is designed for Ubuntu servers${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Ubuntu detected${NC}"

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo -e "${RED}Please run this script as a regular user with sudo privileges${NC}"
   exit 1
fi

# Update system
echo "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Download and run main deployment script
echo "Downloading deployment script..."
wget -O deploy.sh https://raw.githubusercontent.com/your-repo/taf-attendance/main/deploy.sh
chmod +x deploy.sh

echo "Starting deployment..."
./deploy.sh

echo ""
echo -e "${GREEN}🎉 Installation completed!${NC}"
echo ""
echo "Your TAF Attendance System is now running at:"
echo "  http://$(hostname -I | awk '{print $1}')"
echo ""