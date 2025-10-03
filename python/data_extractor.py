# data_extractor.py - Data Extractor for AI Schedule Generation
import os
import json
import argparse
from datetime import datetime, timedelta
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

# Initialize Supabase
supabase = create_client(
    os.getenv('SUPABASE_URL'),
    os.getenv('SUPABASE_KEY')
)

def extract_data_for_schedule(business_id: str, days_back: int = 30) -> dict:
    """Extract data in the exact format needed for AI schedule generation"""
    try:
        # Get business data
        business_response = supabase.table('businesses').select('business_type, shop_name').eq('business_id', business_id).execute()
        if not business_response.data:
            return {"error": f"Business with ID {business_id} not found"}
        
        business_data = business_response.data[0]
        business_type = business_data.get('business_type', 'general')
        
        # Get staff data
        staff_response = supabase.table('staff_members').select('*').eq('business_id', business_id).execute()
        staff_members = staff_response.data or []
        
        # Get time off requests for availability checking
        time_off_response = supabase.table('time_off_requests').select('*').eq('business_id', business_id).execute()
        time_off_requests = time_off_response.data or []
        
        # Create availability lookup by staff_id and date
        availability_lookup = {}
        for request in time_off_requests:
            staff_id = request.get('staff_id')
            start_date = request.get('start_date')
            end_date = request.get('end_date')
            status = request.get('status', 'pending')
            
            if staff_id and start_date and status in ['approved', 'pending']:
                if staff_id not in availability_lookup:
                    availability_lookup[staff_id] = []
                
                # Add date range to unavailable dates
                start_dt = datetime.fromisoformat(start_date.split('T')[0])  # Handle both date and datetime formats
                end_dt = datetime.fromisoformat(end_date.split('T')[0]) if end_date else start_dt
                
                current_date = start_dt.date()
                while current_date <= end_dt.date():
                    availability_lookup[staff_id].append(current_date.isoformat())
                    current_date += timedelta(days=1)
        
        # Format staff data according to required structure
        formatted_staff = []
        for member in staff_members:
            staff_id = member.get('staff_id', '')
            unavailable_dates = availability_lookup.get(staff_id, [])
            
            # Combine first_name and last_name into name
            first_name = member.get('first_name', '')
            last_name = member.get('last_name', '')
            name = f"{first_name} {last_name}".strip() or f"Staff {staff_id}"
            
            # Parse roles - handle both string and array formats
            roles = member.get('role', [])
            if isinstance(roles, str):
                roles = [roles] if roles else []
            elif not isinstance(roles, list):
                roles = []
            
            # Parse preferred shifts
            preferred_shifts = member.get('preferred_shifts', [])
            if isinstance(preferred_shifts, str):
                preferred_shifts = [preferred_shifts] if preferred_shifts else []
            elif not isinstance(preferred_shifts, list):
                preferred_shifts = []
            
            # Parse unavailable days
            unavailable_days = member.get('unavailable_days', [])
            if isinstance(unavailable_days, str):
                unavailable_days = [unavailable_days] if unavailable_days else []
            elif not isinstance(unavailable_days, list):
                unavailable_days = []
            
            formatted_staff.append({
                "staff_id": staff_id,
                "name": name,
                "hourly_rate": float(member.get('hourly_rate', 0)) if member.get('hourly_rate') else 0,
                "max_hours_per_week": member.get('max_hours_per_week', 40),
                "preferred_shifts": preferred_shifts,
                "unavailable_days": unavailable_days,
                "roles": roles
            })
        
        # Get schedule data
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days_back)
        
        schedules_response = supabase.table('schedules').select('*').eq('business_id', business_id).gte('start_date', start_date.date().isoformat()).lte('end_date', end_date.date().isoformat()).execute()
        schedules = schedules_response.data or []
        schedule_ids = [s.get('schedule_id') for s in schedules if s.get('schedule_id')]
        
        shifts = []
        if schedule_ids:
            shifts_response = supabase.table('shifts').select('*').in_('schedule_id', schedule_ids).execute()
            raw_shifts = shifts_response.data or []
            
            for shift in raw_shifts:
                if shift.get('start_time') and shift.get('end_time'):
                    # Handle different datetime formats
                    start_time_str = shift['start_time']
                    end_time_str = shift['end_time']
                    
                    # Remove 'Z' and handle timezone
                    if start_time_str.endswith('Z'):
                        start_time_str = start_time_str[:-1] + '+00:00'
                    if end_time_str.endswith('Z'):
                        end_time_str = end_time_str[:-1] + '+00:00'
                    
                    start_dt = datetime.fromisoformat(start_time_str)
                    end_dt = datetime.fromisoformat(end_time_str)
                    
                    # Get staff role for this shift
                    staff_member = next((s for s in staff_members if s['staff_id'] == shift['staff_id']), {})
                    staff_roles = staff_member.get('role', [])
                    if isinstance(staff_roles, list) and staff_roles:
                        role = staff_roles[0]  # Use first role as default
                    elif isinstance(staff_roles, str):
                        role = staff_roles
                    else:
                        role = 'general'
                    
                    shifts.append({
                        "shift_id": shift.get('shift_id', ''),
                        "staff_id": shift.get('staff_id', ''),
                        "date": start_dt.date().isoformat(),
                        "start_time": start_dt.time().strftime('%H:%M'),
                        "end_time": end_dt.time().strftime('%H:%M'),
                        "role": role,
                        "is_owner_created": True,
                        "is_optimized": False
                    })
        
        # Generate feature lookup
        feature_lookup = {}
        current_date = start_date.date()
        
        while current_date <= end_date.date():
            date_str = current_date.isoformat()
            day_of_week = current_date.weekday()  # Monday = 0, Sunday = 6
            
            # Check holidays
            is_christmas = 1 if current_date.month == 12 and current_date.day == 25 else 0
            is_diwali = 0  # You can add Diwali detection logic here
            is_holi = 0    # Add Holi detection logic here
            is_eid = 0     # Add Eid detection logic here
            is_independence = 1 if current_date.month == 8 and current_date.day == 15 else 0
            
            # Mock sales data based on day type and holidays
            base_sales = 25000
            weekend_multiplier = 1.3 if day_of_week >= 5 else 1.0  # Saturday = 5, Sunday = 6
            holiday_multiplier = 1.5 if any([is_christmas, is_diwali, is_holi, is_eid]) else 1.0
            if is_independence:
                holiday_multiplier = 1.2
            
            sales = int(base_sales * weekend_multiplier * holiday_multiplier)
            
            feature_data = {
                "store_id": 1,
                "store_size_sqft": 3500,
                "day_of_week": day_of_week,
                "is_weekend": 1 if day_of_week >= 5 else 0,
                "sales": sales,
                "diwali_flag": is_diwali,
                "month": current_date.month,
                "year": current_date.year,
                "dayofmonth": current_date.day,
                "weekofyear": current_date.isocalendar()[1],
                "city_Mumbai": 1
            }
            
            # Add holiday flags
            if is_holi:
                feature_data["holi_flag"] = is_holi
            if is_eid:
                feature_data["eid_flag"] = is_eid
            if is_christmas:
                feature_data["christmas_flag"] = is_christmas
            if is_independence:
                feature_data["independence_flag"] = is_independence
            
            feature_lookup[date_str] = feature_data
            current_date += timedelta(days=1)
        
        return {
            "business_type": business_type,
            "staff": formatted_staff,
            "schedule": shifts,
            "feature_lookup": feature_lookup
        }
        
    except Exception as e:
        return {"error": str(e)}

def main():
    """Command line interface"""
    parser = argparse.ArgumentParser(description='Extract data for AI schedule generation')
    parser.add_argument('--business-id', required=True, help='Business ID to extract data for')
    parser.add_argument('--days-back', type=int, default=30, help='Number of days back to extract')
    parser.add_argument('--json', action='store_true', help='Output as JSON')
    
    args = parser.parse_args()
    
    data = extract_data_for_schedule(args.business_id, args.days_back)
    
    if args.json:
        print(json.dumps(data, indent=2, default=str))
    else:
        if "error" in data:
            print(f"Error: {data['error']}")
        else:
            print(f"Extracted data for business {args.business_id}")
            print(f"Business type: {data.get('business_type', 'unknown')}")
            print(f"Staff: {len(data.get('staff', []))}")
            print(f"Shifts: {len(data.get('schedule', []))}")
            print(f"Feature days: {len(data.get('feature_lookup', {}))}")

if __name__ == '__main__':
    main()