#!/usr/bin/env python3
"""
Test Device API Integration
Tests all device management endpoints
"""

import requests
import json
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000/api"

def test_endpoint(name, url, method="GET", data=None):
    """Test an API endpoint"""
    try:
        if method == "GET":
            response = requests.get(url, timeout=10)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=10)
        elif method == "PATCH":
            response = requests.patch(url, json=data, timeout=10)
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                print(f"✅ {name} - SUCCESS")
                return True, result
            else:
                print(f"❌ {name} - API Error: {result.get('message', 'Unknown error')}")
                return False, result
        else:
            print(f"❌ {name} - HTTP {response.status_code}")
            return False, None
    except requests.exceptions.ConnectionError:
        print(f"❌ {name} - Connection failed (server not running?)")
        return False, None
    except Exception as e:
        print(f"❌ {name} - Error: {str(e)}")
        return False, None

def main():
    print("🚀 Testing Device API Integration")
    print("=" * 50)
    
    tests = []
    
    # Test device endpoints
    print("\n🔍 Testing Device Management...")
    
    # Get all devices
    success, data = test_endpoint("Get Devices", f"{BASE_URL}/devices/")
    tests.append(success)
    if success and data:
        devices = data.get('devices', [])
        stats = data.get('stats', {})
        print(f"   📱 Found {len(devices)} devices")
        print(f"   📊 Stats: {stats.get('online_devices', 0)} online, {stats.get('offline_devices', 0)} offline")
        
        # Test with first device if available
        if devices:
            device_id = devices[0]['id']
            print(f"   🎯 Testing with device: {device_id}")
            
            # Test device stats
            success, _ = test_endpoint("Get Device Stats", f"{BASE_URL}/devices/stats/")
            tests.append(success)
            
            # Test device sync
            success, _ = test_endpoint("Sync Device", f"{BASE_URL}/devices/{device_id}/sync/", "POST")
            tests.append(success)
            
            # Test device status update
            success, _ = test_endpoint("Update Device Status", f"{BASE_URL}/devices/{device_id}/status/", "PATCH", {"status": "Online"})
            tests.append(success)
            
            # Test device logs
            success, _ = test_endpoint("Get Device Logs", f"{BASE_URL}/devices/{device_id}/logs/")
            tests.append(success)
            
            # Test device connection
            success, _ = test_endpoint("Test Device Connection", f"{BASE_URL}/devices/{device_id}/test/", "POST")
            tests.append(success)
    
    # Summary
    print("\n" + "=" * 50)
    passed = sum(tests)
    total = len(tests)
    print(f"📊 Test Results: {passed}/{total} endpoints working")
    
    if passed == total:
        print("🎉 All device API tests passed!")
        print("\n💡 Device Status page should now work with backend!")
        print("   1. Start Django server: python manage.py runserver 0.0.0.0:8000")
        print("   2. Start React frontend: cd taf-attendance && npm run dev")
        print("   3. Navigate to Device Status page")
    else:
        print("⚠️  Some tests failed. Check Django server and endpoints.")
    
    return passed == total

if __name__ == "__main__":
    main()