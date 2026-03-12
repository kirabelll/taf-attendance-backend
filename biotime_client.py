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
    
    def get_transactions_by_date_range(self, start_date, end_date):
        """Get attendance transactions for a specific date range"""
        if not self.token:
            self.authenticate()
        
        try:
            url = f"{self.base_url}/iclock/api/transactions/"
            params = {
                'start_time': start_date.strftime('%Y-%m-%d 00:00:00'),
                'end_time': end_date.strftime('%Y-%m-%d 23:59:59'),
                'page_size': 1000
            }
            
            response = self.session.get(url, params=params)
            
            if response.status_code == 200:
                data = response.json()
                transactions = data.get('data', [])
                
                records = []
                for trans in transactions:
                    try:
                        records.append({
                            'employee_id': trans.get('emp_code', ''),
                            'employee_name': trans.get('emp_name', ''),
                            'timestamp': datetime.strptime(trans.get('punch_time', ''), '%Y-%m-%d %H:%M:%S'),
                            'punch_type': trans.get('punch_state', 'Unknown'),
                            'device_id': trans.get('terminal_sn', ''),
                        })
                    except Exception:
                        continue
                
                return records
            return []
        except Exception as e:
            print(f"Error fetching transactions: {str(e)}")
            return []
