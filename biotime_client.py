"""BioTime API Client"""
import requests
from datetime import datetime, timedelta
from config import Config

class BioTimeClient:
    """Client for ZKBio Time 9.0 API"""
    
    def __init__(self):
        self.base_url = Config.BIOTIME_URL.rstrip('/')
        self.username = Config.BIOTIME_USERNAME
        self.password = Config.BIOTIME_PASSWORD
        self.token = None
        self.session = requests.Session()
    
    def authenticate(self):
        """Authenticate with BioTime API"""
        try:
            url = f"{self.base_url}/jwt-api-token-auth/"
            response = self.session.post(url, json={
                'username': self.username,
                'password': self.password
            })
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get('token')
                self.session.headers.update({
                    'Authorization': f'JWT {self.token}',
                    'Content-Type': 'application/json'
                })
                return True
            return False
        except Exception as e:
            print(f"Authentication error: {str(e)}")
            return False
    
    def get_employees(self, page_size=1000):
        """Get all employees from BioTime"""
        if not self.token:
            self.authenticate()
        
        try:
            url = f"{self.base_url}/personnel/api/employees/"
            response = self.session.get(url, params={'page_size': page_size})
            
            if response.status_code == 200:
                data = response.json()
                return data.get('data', [])
            return []
        except Exception as e:
            print(f"Error fetching employees: {str(e)}")
            return []
    
    def get_real_time_transactions(self, start_time=None):
        """Get attendance transactions from BioTime"""
        if not self.token:
            self.authenticate()
        
        try:
            if start_time is None:
                start_time = datetime.now() - timedelta(hours=24)
            
            url = f"{self.base_url}/iclock/api/transactions/"
            params = {
                'start_time': start_time.strftime('%Y-%m-%d %H:%M:%S'),
                'page_size': Config.BATCH_SIZE
            }
            
            response = self.session.get(url, params=params)
            
            if response.status_code == 200:
                data = response.json()
                transactions = data.get('data', [])
                
                # Parse transactions
                records = []
                for trans in transactions:
                    records.append({
                        'employee_id': trans.get('emp_code', ''),
                        'employee_name': trans.get('emp_name', ''),
                        'timestamp': datetime.strptime(trans.get('punch_time', ''), '%Y-%m-%d %H:%M:%S'),
                        'punch_type': trans.get('punch_state', 'Unknown'),
                        'device_id': trans.get('terminal_sn', ''),
                    })
                
                return records
            return []
        except Exception as e:
            print(f"Error fetching transactions: {str(e)}")
            return []
    
    def get_total_time_card_data(self, start_date, end_date, employee_id=None):
        """Get total time card data from ZKBioTime (Clock In, Clock Out, Total Time, Duty WT)"""
        if not self.token:
            self.authenticate()
        
        try:
            # Try multiple possible endpoints for time card data
            endpoints_to_try = [
                f"{self.base_url}/att/api/attcalclog/",
                f"{self.base_url}/att/api/scheduledlog/", 
                f"{self.base_url}/personnel/api/attcalclog/",
                f"{self.base_url}/iclock/api/attcalclog/"
            ]
            
            params = {
                'start_date': start_date.strftime('%Y-%m-%d'),
                'end_date': end_date.strftime('%Y-%m-%d'),
                'page_size': 1000
            }
            
            if employee_id:
                params['emp_code'] = employee_id
            
            for url in endpoints_to_try:
                try:
                    print(f"Trying endpoint: {url}")
                    response = self.session.get(url, params=params)
                    
                    if response.status_code == 200:
                        data = response.json()
                        records = data.get('data', [])
                        
                        if records:  # If we got data, process it
                            print(f"Found {len(records)} time card records from {url}")
                            processed_records = []
                            for record in records:
                                # Parse the time card data
                                clock_in = record.get('clock_in') or record.get('checkin_time')
                                clock_out = record.get('clock_out') or record.get('checkout_time')
                                total_time = record.get('total_time', 0) or record.get('work_time', 0)
                                duty_time = record.get('duty_time', 0) or record.get('should_time', 0)
                                
                                # Convert time formats if needed
                                if isinstance(total_time, str):
                                    try:
                                        # Handle HH:MM format
                                        if ':' in str(total_time):
                                            hours, minutes = map(int, str(total_time).split(':'))
                                            total_time = hours * 60 + minutes
                                        else:
                                            total_time = float(total_time)
                                    except:
                                        total_time = 0
                                
                                processed_records.append({
                                    'employee_id': record.get('emp_code', ''),
                                    'employee_name': record.get('emp_name', ''),
                                    'date': record.get('att_date', record.get('date', '')),
                                    'clock_in': clock_in,
                                    'clock_out': clock_out,
                                    'total_time_minutes': total_time,
                                    'duty_time_minutes': duty_time,
                                    'total_time_hours': round(total_time / 60, 2) if total_time else 0,
                                    'duty_time_hours': round(duty_time / 60, 2) if duty_time else 0,
                                    'department': record.get('department', ''),
                                    'shift': record.get('shift', ''),
                                    'late_minutes': record.get('late', 0),
                                    'early_minutes': record.get('early', 0),
                                    'overtime_minutes': record.get('overtime', 0),
                                    'device_id': record.get('terminal_sn', ''),
                                })
                            
                            return processed_records
                    else:
                        print(f"Endpoint {url} returned {response.status_code}")
                        
                except Exception as e:
                    print(f"Error trying endpoint {url}: {str(e)}")
                    continue
            
            print("No time card endpoints returned data")
            return []
                
        except Exception as e:
            print(f"Error fetching time card data: {str(e)}")
            return []

    def get_scheduling_report_data(self, start_date, end_date, department=None):
        """Get scheduling report data including total time calculations"""
        if not self.token:
            self.authenticate()
        
        try:
            # Alternative endpoint for scheduling reports
            url = f"{self.base_url}/att/api/scheduledlog/"
            params = {
                'start_date': start_date.strftime('%Y-%m-%d'),
                'end_date': end_date.strftime('%Y-%m-%d'),
                'page_size': 1000
            }
            
            if department:
                params['department'] = department
            
            response = self.session.get(url, params=params)
            
            if response.status_code == 200:
                data = response.json()
                return data.get('data', [])
            else:
                print(f"Failed to fetch scheduling report: {response.status_code}")
                return []
                
        except Exception as e:
            print(f"Error fetching scheduling report: {str(e)}")
            return []
    def get_transactions_by_date_range(self, start_date, end_date):
        """Get attendance transactions for a specific date range"""
        if not self.token:
            self.authenticate()
        
        try:
            # First try to get detailed time card data
            time_card_data = self.get_total_time_card_data(start_date, end_date)
            if time_card_data:
                # Convert time card data to transaction format for compatibility
                records = []
                for tc_record in time_card_data:
                    if tc_record['clock_in']:
                        try:
                            clock_in_time = datetime.strptime(f"{tc_record['date']} {tc_record['clock_in']}", '%Y-%m-%d %H:%M:%S')
                            records.append({
                                'employee_id': tc_record['employee_id'],
                                'employee_name': tc_record['employee_name'],
                                'timestamp': clock_in_time,
                                'punch_type': 'Check In',
                                'device_id': tc_record['device_id'],
                                'total_time_hours': tc_record.get('total_time_hours', 0),
                                'duty_time_hours': tc_record.get('duty_time_hours', 0),
                            })
                        except:
                            pass
                    
                    if tc_record['clock_out']:
                        try:
                            clock_out_time = datetime.strptime(f"{tc_record['date']} {tc_record['clock_out']}", '%Y-%m-%d %H:%M:%S')
                            records.append({
                                'employee_id': tc_record['employee_id'],
                                'employee_name': tc_record['employee_name'],
                                'timestamp': clock_out_time,
                                'punch_type': 'Check Out',
                                'device_id': tc_record['device_id'],
                                'total_time_hours': tc_record.get('total_time_hours', 0),
                                'duty_time_hours': tc_record.get('duty_time_hours', 0),
                            })
                        except:
                            pass
                
                return records
            
            # Fallback to regular transaction API with pagination support
            return self._get_all_transactions_paginated(start_date, end_date)
            
        except Exception as e:
            print(f"Error fetching transactions: {str(e)}")
            return []

    def _get_all_transactions_paginated(self, start_date, end_date):
        """Get all transactions with pagination support"""
        all_records = []
        page = 1
        page_size = 1000
        
        url = f"{self.base_url}/iclock/api/transactions/"
        base_params = {
            'start_time': start_date.strftime('%Y-%m-%d 00:00:00'),
            'end_time': end_date.strftime('%Y-%m-%d 23:59:59'),
            'page_size': page_size,
            'ordering': 'punch_time'
        }
        
        print(f"Fetching transactions from {base_params['start_time']} to {base_params['end_time']}")
        
        while True:
            try:
                params = base_params.copy()
                params['page'] = page
                
                print(f"Fetching page {page}...")
                response = self.session.get(url, params=params)
                
                if response.status_code != 200:
                    print(f"Transaction API returned {response.status_code}: {response.text}")
                    break
                
                data = response.json()
                transactions = data.get('data', [])
                
                if not transactions:
                    print(f"No more transactions on page {page}")
                    break
                
                print(f"Found {len(transactions)} transactions on page {page}")
                
                # Process transactions
                for trans in transactions:
                    try:
                        # Parse punch time
                        punch_time_str = trans.get('punch_time', '')
                        if not punch_time_str:
                            continue
                            
                        punch_time = datetime.strptime(punch_time_str, '%Y-%m-%d %H:%M:%S')
                        
                        # Get punch state/type
                        punch_state = trans.get('punch_state', trans.get('punch_type', ''))
                        
                        # Map ZKBioTime punch states to standardized types
                        if punch_state in ['0', 'Check In', 'IN', 'CheckIn']:
                            punch_type = 'Check In'
                        elif punch_state in ['1', 'Check Out', 'OUT', 'CheckOut']:
                            punch_type = 'Check Out'
                        elif punch_state == '255':
                            # 255 is auto-state in ZKBioTime - determine by time and context
                            hour = punch_time.hour
                            if hour < 12:  # Morning hours - likely check in
                                punch_type = 'Auto Check In'
                            else:  # Afternoon/evening - likely check out
                                punch_type = 'Auto Check Out'
                        else:
                            # Try to determine from other fields or use raw value
                            punch_type = f'Unknown ({punch_state})'
                        
                        record = {
                            'employee_id': trans.get('emp_code', ''),
                            'employee_name': trans.get('emp_name', ''),
                            'timestamp': punch_time,
                            'punch_type': punch_type,
                            'device_id': trans.get('terminal_sn', ''),
                            'raw_punch_state': punch_state,
                        }
                        
                        all_records.append(record)
                        
                    except Exception as e:
                        print(f"Error processing transaction: {e}")
                        continue
                
                # Check if we have more pages
                total_count = data.get('count', 0)
                current_count = len(all_records)
                
                if current_count >= total_count or len(transactions) < page_size:
                    print(f"Reached end of data. Total records: {current_count}")
                    break
                
                page += 1
                
                # Safety limit to prevent infinite loops
                if page > 100:
                    print(f"Reached page limit (100). Total records so far: {len(all_records)}")
                    break
                    
            except Exception as e:
                print(f"Error fetching page {page}: {e}")
                break
        
        print(f"Total transactions fetched: {len(all_records)}")
        return all_records