import os
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from supabase import create_client, Client
from dotenv import load_dotenv
import pandas as pd

# Load environment variables from .env file in python folder
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

class DemoDataExtractor:
    def __init__(self):
        """Initialize the demo extractor with Supabase connection from .env file."""
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_KEY')
        
        if not supabase_url or not supabase_key:
            print("❌ Error: Missing SUPABASE_URL or SUPABASE_KEY in .env file")
            print("Please create a .env file in the python folder with:")
            print("SUPABASE_URL=your-supabase-url")
            print("SUPABASE_KEY=your-supabase-key")
            exit(1)
        
        self.supabase: Client = create_client(supabase_url, supabase_key)
        print("✅ Connected to Supabase successfully!")
    
    def get_business_list(self) -> List[Dict]:
        """Get list of available businesses."""
        try:
            # Fixed: Using actual column names from your database schema
            response = self.supabase.table('businesses').select('business_id, shop_name, owner_email, business_type').limit(10).execute()
            return response.data or []
        except Exception as e:
            print(f"❌ Error fetching businesses: {e}")
            return []
    
    def extract_staff_data(self, business_id: str) -> List[Dict]:
        """Extract staff members data for a business."""
        try:
            response = self.supabase.table('staff_members').select('*').eq('business_id', business_id).execute()
            staff_members = response.data or []
            
            formatted_staff = []
            for member in staff_members:
                formatted_staff.append({
                    "staff_id": member.get('staff_id', ''),
                    "first_name": member.get('first_name', ''),
                    "last_name": member.get('last_name', ''),
                    "email": member.get('email', ''),
                    "phone_number": member.get('phone_number', ''),
                    "hourly_rate": float(member.get('hourly_rate', 0)) if member.get('hourly_rate') else 0,
                    "max_hours_per_week": member.get('max_hours_per_week', 0),
                    "role": member.get('role', ''),
                    "skills": member.get('skills', []) if member.get('skills') else [],
                    "preferred_shifts": member.get('preferred_shifts', []) if member.get('preferred_shifts') else [],
                    "unavailable_days": member.get('unavailable_days', []) if member.get('unavailable_days') else [],
                    "unavailable_dates": [str(date) for date in member.get('unavailable_dates', [])] if member.get('unavailable_dates') else [],
                    "experience_level": member.get('experience_level', ''),
                    "certifications": member.get('certifications', []) if member.get('certifications') else [],
                    "location_preference": member.get('location_preference', ''),
                    "is_active": member.get('is_active', True),
                    "created_at": str(member.get('created_at', '')),
                    "updated_at": str(member.get('updated_at', ''))
                })
            
            return formatted_staff
        except Exception as e:
            print(f"❌ Error extracting staff data: {e}")
            return []
    
    def extract_schedule_data(self, business_id: str, days_back: int = 30) -> List[Dict]:
        """Extract schedule/shifts data for a business."""
        try:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days_back)
            
            # Get schedules for the business
            schedules_response = self.supabase.table('schedules').select('*').eq('business_id', business_id).gte('start_date', start_date.date().isoformat()).lte('end_date', end_date.date().isoformat()).execute()
            schedules = schedules_response.data or []
            schedule_ids = [s.get('schedule_id') for s in schedules]
            
            # Get shifts for these schedules
            shifts = []
            if schedule_ids:
                shifts_response = self.supabase.table('shifts').select('*').in_('schedule_id', schedule_ids).execute()
                shifts = shifts_response.data or []
            
            formatted_schedule = []
            for shift in shifts:
                # Get staff info for this shift
                try:
                    staff_response = self.supabase.table('staff_members').select('role, first_name, last_name').eq('staff_id', shift.get('staff_id')).single().execute()
                    if staff_response.data:
                        staff_role = staff_response.data.get('role', '')
                        staff_name = f"{staff_response.data.get('first_name', '')} {staff_response.data.get('last_name', '')}"
                    else:
                        staff_role = ''
                        staff_name = ''
                except:
                    staff_role = ''
                    staff_name = ''
                
                # Format datetime fields
                start_time = shift.get('start_time')
                end_time = shift.get('end_time')
                
                if start_time and end_time:
                    try:
                        start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
                        end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
                        
                        formatted_schedule.append({
                            "shift_id": shift.get('shift_id', ''),
                            "schedule_id": shift.get('schedule_id', ''),
                            "staff_id": shift.get('staff_id', ''),
                            "staff_name": staff_name.strip(),
                            "date": start_dt.date().isoformat(),
                            "start_time": start_dt.time().strftime('%H:%M'),
                            "end_time": end_dt.time().strftime('%H:%M'),
                            "role": staff_role,
                            "is_owner_created": True,
                            "is_optimized": False,
                            "notes": shift.get('notes', '')
                        })
                    except Exception as e:
                        print(f"⚠️  Warning: Could not parse datetime for shift {shift.get('shift_id')}: {e}")
                        continue
            
            return formatted_schedule
        except Exception as e:
            print(f"❌ Error extracting schedule data: {e}")
            return []
    
    def extract_business_hours(self, business_id: str) -> List[Dict]:
        """Extract business hours for a business."""
        try:
            response = self.supabase.table('business_hours').select('*').eq('business_id', business_id).execute()
            business_hours = response.data or []
            
            formatted_hours = []
            for hour in business_hours:
                formatted_hours.append({
                    "business_hour_id": hour.get('business_hour_id', ''),
                    "operating_day": hour.get('operating_day', ''),
                    "open_time": hour.get('open_time', ''),
                    "close_time": hour.get('close_time', ''),
                    "is_closed": hour.get('is_closed', False)
                })
            
            return formatted_hours
        except Exception as e:
            print(f"❌ Error extracting business hours: {e}")
            return []
    
    def extract_staff_availability(self, business_id: str) -> List[Dict]:
        """Extract staff availability data."""
        try:
            # First get all staff for this business
            staff_response = self.supabase.table('staff_members').select('staff_id').eq('business_id', business_id).execute()
            staff_ids = [s.get('staff_id') for s in staff_response.data or []]
            
            if not staff_ids:
                return []
            
            # Get availability for these staff members
            availability_response = self.supabase.table('staff_availability').select('*').in_('staff_id', staff_ids).execute()
            availability_data = availability_response.data or []
            
            formatted_availability = []
            for avail in availability_data:
                formatted_availability.append({
                    "availability_id": avail.get('availability_id', ''),
                    "staff_id": avail.get('staff_id', ''),
                    "day_of_week": avail.get('day_of_week', ''),
                    "start_time": avail.get('start_time', ''),
                    "end_time": avail.get('end_time', '')
                })
            
            return formatted_availability
        except Exception as e:
            print(f"❌ Error extracting staff availability: {e}")
            return []
    
    def extract_feature_lookup_data(self, business_id: str, days_back: int = 30) -> Dict:
        """Extract feature lookup data (business metrics, sales, etc.)."""
        try:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days_back)
            
            # Get business details
            try:
                business_response = self.supabase.table('businesses').select('*').eq('business_id', business_id).single().execute()
                business = business_response.data if business_response.data else {}
            except:
                business = {}
            
            # Generate feature lookup for each day in the period
            feature_lookup = {}
            current_date = start_date.date()
            
            while current_date <= end_date.date():
                date_str = current_date.isoformat()
                day_of_week = current_date.weekday()  # 0 = Monday, 6 = Sunday
                
                # Check if it's a holiday
                is_diwali = 0
                is_christmas = 1 if current_date.month == 12 and current_date.day == 25 else 0
                
                # Mock sales data - replace with actual sales data if available
                base_sales = 30000
                weekend_multiplier = 1.2 if day_of_week >= 5 else 1.0
                holiday_multiplier = 1.5 if is_christmas else 1.0
                sales = int(base_sales * weekend_multiplier * holiday_multiplier)
                
                feature_lookup[date_str] = {
                    "store_id": 1,
                    "store_size_sqft": 3500,
                    "day_of_week": day_of_week,
                    "is_weekend": 1 if day_of_week >= 5 else 0,
                    "sales": sales,
                    "diwali_flag": is_diwali,
                    "christmas_flag": is_christmas,
                    "month": current_date.month,
                    "year": current_date.year,
                    "dayofmonth": current_date.day,
                    "weekofyear": current_date.isocalendar()[1],
                    "city_Mumbai": 1
                }
                
                current_date += timedelta(days=1)
            
            return feature_lookup
        except Exception as e:
            print(f"❌ Error extracting feature lookup data: {e}")
            return {}
    
    def extract_comprehensive_data(self, business_id: str, days_back: int = 30) -> Dict:
        """Extract all data for a business."""
        print("📊 Extracting staff data...")
        staff_data = self.extract_staff_data(business_id)
        
        print("📅 Extracting schedule data...")
        schedule_data = self.extract_schedule_data(business_id, days_back)
        
        print("🕒 Extracting business hours...")
        business_hours = self.extract_business_hours(business_id)
        
        print("⏰ Extracting staff availability...")
        staff_availability = self.extract_staff_availability(business_id)
        
        print("📈 Extracting feature lookup data...")
        feature_lookup = self.extract_feature_lookup_data(business_id, days_back)
        
        return {
            "business_id": business_id,
            "extraction_date": datetime.now().isoformat(),
            "days_back": days_back,
            "staff": staff_data,
            "schedule": schedule_data,
            "business_hours": business_hours,
            "staff_availability": staff_availability,
            "feature_lookup": feature_lookup
        }
    
    def display_data_summary(self, data: Dict):
        """Display a formatted summary of the extracted data."""
        print("\n" + "="*60)
        print("📊 DATA EXTRACTION SUMMARY")
        print("="*60)
        
        # Staff summary
        staff_count = len(data.get('staff', []))
        print(f"\n👥 STAFF MEMBERS: {staff_count}")
        if staff_count > 0:
            for i, staff in enumerate(data['staff'][:5], 1):  # Show first 5
                print(f"  {i}. {staff['first_name']} {staff['last_name']} - {staff['role']} (₹{staff['hourly_rate']}/hr)")
            if staff_count > 5:
                print(f"  ... and {staff_count - 5} more")
        
        # Schedule summary
        schedule_count = len(data.get('schedule', []))
        print(f"\n📅 SCHEDULED SHIFTS: {schedule_count}")
        if schedule_count > 0:
            for i, shift in enumerate(data['schedule'][:5], 1):  # Show first 5
                staff_info = f" - {shift['staff_name']}" if shift['staff_name'] else f" - Staff {shift['staff_id']}"
                print(f"  {i}. {shift['date']} {shift['start_time']}-{shift['end_time']}{staff_info}")
            if schedule_count > 5:
                print(f"  ... and {schedule_count - 5} more")
        
        # Business hours summary
        hours_count = len(data.get('business_hours', []))
        print(f"\n🕒 BUSINESS HOURS: {hours_count} days configured")
        if hours_count > 0:
            for hour in data['business_hours'][:7]:  # Show all days
                if hour['is_closed']:
                    print(f"  {hour['operating_day']}: CLOSED")
                else:
                    print(f"  {hour['operating_day']}: {hour['open_time']} - {hour['close_time']}")
        
        # Staff availability summary
        availability_count = len(data.get('staff_availability', []))
        print(f"\n⏰ STAFF AVAILABILITY RECORDS: {availability_count}")
        if availability_count > 0:
            for i, avail in enumerate(data['staff_availability'][:5], 1):
                print(f"  {i}. Staff {avail['staff_id']} - {avail['day_of_week']}: {avail['start_time']}-{avail['end_time']}")
            if availability_count > 5:
                print(f"  ... and {availability_count - 5} more")
        
        # Feature lookup summary
        feature_count = len(data.get('feature_lookup', {}))
        print(f"\n📈 BUSINESS METRICS: {feature_count} days of data")
        if feature_count > 0:
            sample_dates = list(data['feature_lookup'].keys())[:3]
            for date in sample_dates:
                metrics = data['feature_lookup'][date]
                print(f"  {date}: Sales ₹{metrics['sales']:,}, Weekend: {bool(metrics['is_weekend'])}, Holiday: {bool(metrics['christmas_flag'])}")
        
        print("\n" + "="*60)
    
    def save_to_file(self, data: Dict, filename: str = None):
        """Save extracted data to a JSON file."""
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"extracted_data_{timestamp}.json"
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, default=str)
        
        print(f"💾 Data saved to {filename}")
        return filename

def main():
    """Main demo function."""
    print("🚀 EasyShift Data Extractor Demo")
    print("="*40)
    
    # Initialize extractor
    extractor = DemoDataExtractor()
    
    # Show available businesses
    print("\n📋 Available Businesses:")
    businesses = extractor.get_business_list()
    if not businesses:
        print("❌ No businesses found in database")
        print("💡 You can still proceed by entering a business_id directly")
        business_id = input("\nEnter business_id: ").strip()
        business_name = "Manual Entry"
    else:
        for i, business in enumerate(businesses, 1):
            shop_name = business.get('shop_name', 'Unknown')
            business_type = business.get('business_type', 'N/A')
            print(f"  {i}. {shop_name} ({business_type}) - ID: {business.get('business_id', 'N/A')}")
        
        # Get business ID from user
        print("\n" + "-"*40)
        while True:
            try:
                choice = input("\nEnter business number (1-{}) or business_id directly: ".format(len(businesses)))
                
                # Check if it's a number (choice from list)
                if choice.isdigit() and 1 <= int(choice) <= len(businesses):
                    business_id = businesses[int(choice) - 1]['business_id']
                    business_name = businesses[int(choice) - 1].get('shop_name', 'Unknown')
                    break
                else:
                    # Assume it's a direct business_id
                    business_id = choice.strip()
                    business_name = "Selected Business"
                    break
            except KeyboardInterrupt:
                print("\n👋 Goodbye!")
                return
            except Exception as e:
                print(f"❌ Invalid input: {e}")
    
    print(f"\n🎯 Extracting data for: {business_name} (ID: {business_id})")
    
    # Get days back
    try:
        days_back = int(input("Enter days back to extract (default 30): ") or "30")
    except:
        days_back = 30
    
    # Extract data
    print(f"\n⏳ Extracting data for last {days_back} days...")
    data = extractor.extract_comprehensive_data(business_id, days_back)
    
    # Display summary
    extractor.display_data_summary(data)
    
    # Ask if user wants to save
    save_choice = input("\n💾 Save data to file? (y/n): ").lower().strip()
    if save_choice in ['y', 'yes']:
        filename = extractor.save_to_file(data)
        print(f"✅ Data saved successfully!")
    
    # Ask if user wants to see raw JSON
    json_choice = input("\n📄 Display raw JSON? (y/n): ").lower().strip()
    if json_choice in ['y', 'yes']:
        print("\n" + "="*60)
        print("📄 RAW JSON OUTPUT")
        print("="*60)
        print(json.dumps(data, indent=2, default=str))
    
    print("\n🎉 Demo completed successfully!")

if __name__ == "__main__":
    main()
