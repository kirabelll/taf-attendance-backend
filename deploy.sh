#!/bin/bash

# TAF Attendance System - Deployment Script
# This script helps you deploy the application quickly

set -e

echo "================================================"
echo "TAF Attendance System - Deployment Script"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    echo "Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed${NC}"
    echo "Please install Docker Compose first: https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}✓ Docker and Docker Compose are installed${NC}"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠ .env file not found${NC}"
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo -e "${GREEN}✓ .env file created${NC}"
    echo ""
    echo -e "${YELLOW}⚠ IMPORTANT: Please edit .env file with your configuration before continuing${NC}"
    echo ""
    read -p "Press Enter after you've configured .env file..."
fi

# Validate required environment variables
echo "Validating environment variables..."
source .env

REQUIRED_VARS=("BIOTIME_URL" "BIOTIME_USERNAME" "BIOTIME_PASSWORD" "POSTGRES_PASSWORD" "DJANGO_SECRET_KEY")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo -e "${RED}Error: Missing required environment variables:${NC}"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    echo ""
    echo "Please update your .env file with these variables"
    exit 1
fi

echo -e "${GREEN}✓ All required environment variables are set${NC}"
echo ""

# Ask for deployment type
echo "Select deployment type:"
echo "1) Development (docker-compose.yml)"
echo "2) Production (docker-compose.prod.yml)"
read -p "Enter choice [1-2]: " choice

case $choice in
    1)
        COMPOSE_FILE="docker-compose.yml"
        echo "Deploying in DEVELOPMENT mode..."
        ;;
    2)
        COMPOSE_FILE="docker-compose.prod.yml"
        echo "Deploying in PRODUCTION mode..."
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""

# Pull latest images
echo "Pulling latest images..."
docker-compose -f $COMPOSE_FILE pull

# Build images
echo ""
echo "Building images..."
docker-compose -f $COMPOSE_FILE build

# Start services
echo ""
echo "Starting services..."
docker-compose -f $COMPOSE_FILE up -d

# Wait for services to be healthy
echo ""
echo "Waiting for services to be healthy..."
sleep 10

# Check service status
echo ""
echo "Service Status:"
docker-compose -f $COMPOSE_FILE ps

# Show logs
echo ""
echo "Recent logs:"
docker-compose -f $COMPOSE_FILE logs --tail=20

echo ""
echo "================================================"
echo -e "${GREEN}✓ Deployment completed successfully!${NC}"
echo "================================================"
echo ""
echo "Access your application:"
echo "  Frontend: http://localhost"
echo "  Backend API: http://localhost:8000"
echo "  API Test: http://localhost:8000/api/test-connection/"
echo ""
echo "Useful commands:"
echo "  View logs: docker-compose -f $COMPOSE_FILE logs -f"
echo "  Stop services: docker-compose -f $COMPOSE_FILE down"
echo "  Restart services: docker-compose -f $COMPOSE_FILE restart"
echo ""
