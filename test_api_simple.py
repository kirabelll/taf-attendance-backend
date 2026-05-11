#!/usr/bin/env python3
"""Simple API test script"""
import requests
import json

def test_api_endpoints():
    """Test basic API endpoints"""
    base_url = "http://127.0.0.1:8004"
    
    endpoints = [
        "/api/test-connection/",
        "/api/employees/",
        "/api/attendance/by-date/",
        "/api/attendance/daily-summary/"
    ]
    
    print("Testing API endpoints...")
    print("=" * 50)
    
    for endpoint in endpoints:
        url = f"{base_url}{endpoint}"
        try:
            print(f"\nTesting: {url}")
            response = requests.get(url, timeout=10)
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"Success: {data.get('success', 'N/A')}")
                if 'message' in data:
                    print(f"Message: {data['message']}")
            else:
                print(f"Error: {response.text[:200]}")
                
        except requests.exceptions.ConnectionError:
            print("Error: Connection refused - Django server not running?")
        except requests.exceptions.Timeout:
            print("Error: Request timeout")
        except Exception as e:
            print(f"Error: {str(e)}")
    
    print("\n" + "=" * 50)
    print("Test completed!")

if __name__ == "__main__":
    test_api_endpoints()