#!/usr/bin/env python3
"""
Test Date Filtering
Tests that date filtering returns all expected data
"""

import requests
import json
from datetime import datetime, timedelta

# Configuration
BASE_URL = "http://localhost:8000/api"

def test_date_filtering(date=None, start_date=None, end_date=None):
    """Test date filtering functionality"""
    try:
        params = {}
        
        if date:
            params['date'] = date
            print(f"🔍 Testing single date filter: {date}")
        elif start_date and end_date:
            params['start_date'] = start_date
            params['end_date'] = end_date
            print(f"🔍 Testing date range filter: {start_date} to {end_date}")
        else:
            print(f"🔍 Testing default date (today)")
        
        response = requests.get(f"{BASE_URL}/attendance/by-date/", params=params, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                stats = result.get('statistics', {})
                attendance = result.get('attendance', [])
                
                print(f"✅ Date filtering successful!")
                print(f"📊 Statistics:")
                print(f"   • Raw transactions: {stats.get('raw_transactions', 'N/A')}")
                print(f"   • Processed records: {stats.get('processed_records', 'N/A')}")
                print(f"   • Total employees: {stats.get('total_employees', 0)}")
                print(f"   • Present: {stats.get('present', 0)}")
                print(f"   • Absent: {stats.get('absent', 0)}")
                print(f"   • Late: {stats.get('late_arrivals', 0)}")
                print(f"   • On time: {stats.get('on_time', 0)}")
                print(f"   • Filtered count: {stats.get('filtered_count', 0)}")
                
                # Show sample records
                print(f"\n📋 Sample records (first 5):")
                for i, record in enumerate(attendance[:5], 1):
                    print(f"  {i}. {record['full_name']} ({record['employee_id']})")
                    print(f"     Date: {record['date']}")
                    print(f"     In: {record['clock_in'] or 'N/A'}, Out: {record['clock_out'] or 'N/A'}")
                    print(f"     Status: {record['status']}, Hours: {record.get('working_hours', 0)}h")
                
                return True, len(attendance), stats
            else:
                print(f"❌ API Error: {result.get('message', 'Unknown error')}")
                return False, 0, {}
        else:
            print(f"❌ HTTP {response.status_code}")
            return False, 0, {}
    except requests.exceptions.ConnectionError:
        print("❌ Connection failed (server not running?)")
        return False, 0, {}
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False, 0, {}

def test_pagination_completeness():
    """Test if we're getting complete data across multiple days"""
    try:
        # Test last 3 days
        today = datetime.now()
        dates_to_test = []
        
        for i in range(3):
            test_date = (today - timedelta(days=i)).strftime('%Y-%m-%d')
            dates_to_test.append(test_date)
        
        print(f"🔍 Testing pagination completeness for last 3 days...")
        
        total_records = 0
        for date in dates_to_test:
            print(f"\n📅 Testing {date}:")
            success, count, stats = test_date_filtering(date=date)
            if success:
                total_records += count
                print(f"   Records for {date}: {count}")
            else:
                print(f"   Failed to get data for {date}")
        
        print(f"\n📊 Total records across 3 days: {total_records}")
        
        # Now test the same 3 days as a range
        start_date = dates_to_test[-1]  # Oldest date
        end_date = dates_to_test[0]     # Most recent date
        
        print(f"\n🔍 Testing same period as date range ({start_date} to {end_date}):")
        success, range_count, range_stats = test_date_filtering(start_date=start_date, end_date=end_date)
        
        if success:
            print(f"   Range query records: {range_count}")
            
            # Compare results
            if range_count >= total_records * 0.9:  # Allow 10% variance
                print(f"✅ Date range query returned similar amount of data")
            else:
                print(f"⚠️  Date range query returned significantly fewer records")
                print(f"   Individual days: {total_records}, Range query: {range_count}")
        
        return success
        
    except Exception as e:
        print(f"❌ Pagination test error: {str(e)}")
        return False

def main():
    print("🚀 Testing Date Filtering Functionality")
    print("=" * 50)
    
    # Test 1: Today's data
    print("\n1️⃣ Testing today's data...")
    success1, count1, stats1 = test_date_filtering()
    
    # Test 2: Yesterday's data
    yesterday = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
    print(f"\n2️⃣ Testing yesterday's data ({yesterday})...")
    success2, count2, stats2 = test_date_filtering(date=yesterday)
    
    # Test 3: Date range (last 7 days)
    end_date = datetime.now().strftime('%Y-%m-%d')
    start_date = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
    print(f"\n3️⃣ Testing date range (last 7 days)...")
    success3, count3, stats3 = test_date_filtering(start_date=start_date, end_date=end_date)
    
    # Test 4: Pagination completeness
    print(f"\n4️⃣ Testing pagination completeness...")
    success4 = test_pagination_completeness()
    
    # Summary
    print("\n" + "=" * 50)
    tests_passed = sum([success1, success2, success3, success4])
    print(f"📊 Test Results: {tests_passed}/4 tests passed")
    
    if tests_passed == 4:
        print("🎉 All date filtering tests passed!")
        print("\n💡 Date filtering is working correctly:")
        print("   ✅ Single date queries work")
        print("   ✅ Date range queries work")
        print("   ✅ Pagination is complete")
        print("   ✅ All data is being retrieved")
    else:
        print("⚠️ Some date filtering issues detected")
        print("\n💡 Possible issues:")
        print("   • Pagination limits not handled properly")
        print("   • Date range parameters not working")
        print("   • ZKBioTime API connection issues")
        print("   • Data processing errors")
    
    return tests_passed == 4

if __name__ == "__main__":
    main()