#!/usr/bin/env python3
"""
Simple test script to verify backend API endpoints are working
Run this to test the integration before starting the frontend
"""

import requests
import json
from datetime import datetime

API_BASE = "http://localhost:8000/api"

def test_endpoint(endpoint, description):
    """Test a single API endpoint"""
    try:
        print(f"\n🔍 Testing {description}...")
        response = requests.get(f"{API_BASE}{endpoint}", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print(f"✅ {description} - SUCCESS")
                
                # Special check for employees endpoint to verify department structure
                if endpoint == "/employees/" and 'employees' in data:
                    employees = data['employees']
                    if employees:
                        first_employee = employees[0]
                        dept = first_employee.get('department')
                        if isinstance(dept, dict):
                            print(f"   📋 Department is object: {dept}")
                            if 'dept_name' in dept:
                                print(f"   ✅ Department object has dept_name: {dept['dept_name']}")
                            else:
                                print(f"   ⚠️  Department object missing dept_name field")
                        else:
                            print(f"   📋 Department is string: {dept}")
                
                return True
            else:
                print(f"❌ {description} - API returned success=false: {data.get('message', 'Unknown error')}")
                return False
        else:
            print(f"❌ {description} - HTTP {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print(f"❌ {description} - Connection refused (is Django server running?)")
        return False
    except requests.exceptions.Timeout:
        print(f"❌ {description} - Request timeout")
        return False
    except Exception as e:
        print(f"❌ {description} - Error: {str(e)}")
        return False

def main():
    """Run all API tests"""
    print("🚀 Testing TAF Attendance API Integration")
    print("=" * 50)
    
    tests = [
        ("/test-connection/", "Backend Connection"),
        ("/employees/", "Employee List"),
        ("/attendance/realtime/", "Real-time Attendance"),
        ("/attendance/daily-summary/", "Daily Summary"),
        ("/attendance/by-date/", "Attendance by Date"),
        ("/attendance/late/", "Late Employees"),
        ("/attendance/absent/", "Absent Employees"),
        ("/attendance/report/", "Attendance Report"),
    ]
    
    passed = 0
    total = len(tests)
    
    for endpoint, description in tests:
        if test_endpoint(endpoint, description):
            passed += 1
    
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {passed}/{total} endpoints working")
    
    if passed == total:
        print("🎉 All tests passed! Frontend integration should work.")
        print("\n💡 Next steps:")
        print("   1. Start Django server: python manage.py runserver 0.0.0.0:8000")
        print("   2. Start React frontend: cd taf-attendance && npm run dev")
        print("   3. Open http://localhost:8080 in your browser")
    else:
        print("⚠️  Some tests failed. Check your Django server and BioTime connection.")
        print("\n🔧 Troubleshooting:")
        print("   1. Ensure Django server is running on port 8000")
        print("   2. Check your .env file has correct BioTime credentials")
        print("   3. Verify BioTime server is accessible")

if __name__ == "__main__":
    main()