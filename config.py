"""Configuration loader from .env file"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / '.env')

class Config:
    """Configuration class for attendance service"""
    
    # BioTime Configuration
    BIOTIME_URL = os.getenv('BIOTIME_URL', 'http://172.16.10.250:8002')
    BIOTIME_USERNAME = os.getenv('BIOTIME_USERNAME', 'Kirubel')
    BIOTIME_PASSWORD = os.getenv('BIOTIME_PASSWORD', '12345678K')
    BIOTIME_API_VERSION = os.getenv('BIOTIME_API_VERSION', 'v1')
    
    # Sync Settings
    SYNC_INTERVAL_MINUTES = int(os.getenv('SYNC_INTERVAL_MINUTES', '1'))
    MAX_RETRIES = int(os.getenv('MAX_RETRIES', '3'))
    BATCH_SIZE = int(os.getenv('BATCH_SIZE', '100'))
    
    # Attendance Settings
    WORK_START_HOUR = 8
    WORK_START_MINUTE = 0
    LATE_THRESHOLD_HOUR = 8
    LATE_THRESHOLD_MINUTE = 30
    WORK_END_HOUR = 17
    WORK_END_MINUTE = 0
