#!/usr/bin/env python3
"""Test script for Attendance API"""
import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000/api"

def print_response(title, response):
    """Print formatted API response"""
    print(f"\n{'='*80}")
    print(f"{title}")
    print(f"{'='*80}")
    print(f"Status Code: {response.status_code}")
    print(f"Response:")
    print(json.dumps(response.json(), indent=2))

def test_connection():
    """Test BioTime connection"""
    response = requests.get(f"{BASE_URL}/test-connection/")
    print_response("TEST CONNECTION", response)
    return response.status_code == 200

def test_get_employees():
    """Test get employees endpoint"""
    response = requests.get(f"{BASE_URL}/employees/")
    print_response("GET EMPLOYEES", response)

def test_realtime_attendance():
    """Test real-time attendance endpoint"""
    response = requests.get(f"{BASE_URL}/attendance/realtime/")
    print_response("REAL-TIME ATTENDANCE (Last 24 hours)", response)

def test_attendance_by_date():
    """Test attendance by date endpoint"""
    today = datetime.now().strftime('%Y-%m-%d')
    response = requests.get(f"{BASE_URL}/attendance/by-date/?date={today}")
    print_response(f"ATTENDANCE BY DATE ({today})", response)

def test_attendance_report():
    """Test attendance report endpoint"""
    today = datetime.now().strftime('%Y-%m-%d')
    response = requests.get(f"{BASE_URL}/attendance/report/?date={today}")
    print_response(f"ATTENDANCE REPORT ({today})", response)

def test_refresh_cache():
    """Test refresh employee cache endpoint"""
    response = requests.post(f"{BASE_URL}/employees/refresh-cache/")
    print_response("REFRESH EMPLOYEE CACHE", response)

def test_late_employees():
    """Test late employees endpoint"""
    today = datetime.now().strftime('%Y-%m-%d')
    response = requests.get(f"{BASE_URL}/attendance/late/?date={today}")
    print_response(f"LATE EMPLOYEES ({today})", response)

def test_absent_employees():
    """Test absent employees endpoint"""
    today = datetime.now().strftime('%Y-%m-%d')
    response = requests.get(f"{BASE_URL}/attendance/absent/?date={today}")
    print_response(f"ABSENT EMPLOYEES ({today})", response)

def test_daily_summary():
    """Test daily attendance summary endpoint"""
    today = datetime.now().strftime('%Y-%m-%d')
    response = requests.get(f"{BASE_URL}/attendance/daily-summary/?date={today}")
    print_response(f"DAILY ATTENDANCE SUMMARY ({today})", response)

def test_search_attendance():
    """Test search employee attendance endpoint"""
    response = requests.get(f"{BASE_URL}/attendance/search/?q=john")
    print_response("SEARCH ATTENDANCE (query: john)", response)

def test_filtered_attendance():
    """Test filtered attendance endpoints"""
    today = datetime.now().strftime('%Y-%m-%d')
    
    # Test status filters
    print_response("FILTERED ATTENDANCE - LATE ONLY", 
                  requests.get(f"{BASE_URL}/attendance/by-date/?date={today}&status=late"))
    
    print_response("FILTERED ATTENDANCE - ABSENT ONLY", 
                  requests.get(f"{BASE_URL}/attendance/by-date/?date={today}&status=absent"))
    
    print_response("FILTERED ATTENDANCE - PRESENT ONLY", 
                  requests.get(f"{BASE_URL}/attendance/by-date/?date={today}&status=present"))
    
    # Test name filter
    print_response("FILTERED ATTENDANCE - NAME FILTER", 
                  requests.get(f"{BASE_URL}/attendance/by-date/?date={today}&employee_name=john"))

def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("ATTENDANCE API TEST SUITE")
    print("="*80)
    
    # Test connection first
    if not test_connection():
        print("\n❌ Connection test failed. Please check your BioTime configuration.")
        return
    
    print("\n✅ Connection successful! Running other tests...\n")
    
    # Run basic tests
    test_get_employees()
    test_realtime_attendance()
    test_attendance_by_date()
    test_attendance_report()
    test_refresh_cache()
    
    print("\n" + "="*80)
    print("TESTING FILTERING ENDPOINTS")
    print("="*80)
    
    # Run filtering tests
    test_late_employees()
    test_absent_employees()
    test_daily_summary()
    test_search_attendance()
    test_filtered_attendance()
    
    print("\n" + "="*80)
    print("TEST SUITE COMPLETED")
    print("="*80 + "\n")

if __name__ == "__main__":
    try:
        main()
    except requests.exceptions.ConnectionError:
        print("\n❌ Error: Could not connect to the API server.")
        print("Please make sure the Django server is running:")
        print("  python manage.py runserver\n")
    except Exception as e:
        print(f"\n❌ Error: {str(e)}\n")
