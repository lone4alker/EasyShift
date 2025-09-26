import os
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from google import genai
from supabase import create_client, Client
from dotenv import load_dotenv
import pandas as pd
import numpy as np
import holidays

load_dotenv()

class AIInsightsGenerator:
    def __init__(self, supabase_url: str, supabase_key: str, gemini_api_key: str):
        """Initialize the AI insights generator with database and AI service connections."""
        self.supabase: Client = create_client(supabase_url, supabase_key)
        try:
            self.gemini_client = genai.Client(api_key=gemini_api_key)
        except Exception:
            self.gemini_client = genai.Client()
        
        # Get Indian holidays for festival planning
        self.india_holidays = holidays.India(years=[2024, 2025])
        
    def fetch_upcoming_data(self, business_ids: List[str], days_ahead: int = 7) -> Dict:
        """Fetch data for the next week to generate insights."""
        start_date = datetime.now()
        end_date = start_date + timedelta(days=days_ahead)
        
        try:
            # Fetch upcoming schedules
            schedules_response = self.supabase.table('schedules').select(
                '*'
            ).in_('business_id', business_ids).gte(
                'start_date', start_date.isoformat()
            ).lte('end_date', end_date.isoformat()).execute()
            
            # Fetch staff members
            staff_response = self.supabase.table('staff_members').select(
                '*'
            ).in_('business_id', business_ids).execute()
            
            # Fetch time off requests for the period
            time_off_response = self.supabase.table('time_off_requests').select(
                '*'
            ).in_('business_id', business_ids).gte(
                'start_date', start_date.isoformat()
            ).lte('end_date', end_date.isoformat()).execute()
            
            # Fetch business hours
            hours_response = self.supabase.table('business_hours').select(
                '*'
            ).in_('business_id', business_ids).execute()
            
            # Fetch staff availability
            availability_response = self.supabase.table('staff_availability').select(
                '*'
            ).execute()
            
            # Fetch roles for staff hierarchy
            roles_response = self.supabase.table('roles').select('*').execute()
            
            # Fetch staff roles mapping
            staff_roles_response = self.supabase.table('staff_roles').select(
                '*'
            ).execute()
            
            return {
                'schedules': schedules_response.data,
                'staff_members': staff_response.data,
                'time_off_requests': time_off_response.data,
                'business_hours': hours_response.data,
                'staff_availability': availability_response.data,
                'roles': roles_response.data,
                'staff_roles': staff_roles_response.data,
                'analysis_period': f"{start_date.date()} to {end_date.date()}"
            }
            
        except Exception as e:
            print(f"Error fetching upcoming data: {e}")
            return {
                'schedules': [], 'staff_members': [], 'time_off_requests': [],
                'business_hours': [], 'staff_availability': [], 'roles': [],
                'staff_roles': [], 'analysis_period': f"{start_date.date()} to {end_date.date()}"
            }
    
    def analyze_upcoming_events(self, data: Dict) -> Dict:
        """Analyze upcoming events and potential issues."""
        schedules_df = pd.DataFrame(data['schedules']) if data['schedules'] else pd.DataFrame()
        staff_df = pd.DataFrame(data['staff_members']) if data['staff_members'] else pd.DataFrame()
        time_off_df = pd.DataFrame(data['time_off_requests']) if data['time_off_requests'] else pd.DataFrame()
        
        analysis = {
            'upcoming_festivals': [],
            'staff_shortages': [],
            'heavy_workload_days': [],
            'stock_intake_alerts': [],
            'weather_considerations': [],
            'special_events': []
        }
        
        # Analyze upcoming festivals
        today = datetime.now().date()
        for date, name in self.india_holidays.items():
            if today <= date <= (today + timedelta(days=7)):
                analysis['upcoming_festivals'].append({
                    'date': str(date),
                    'name': name,
                    'days_until': (date - today).days,
                    'impact': 'High' if (date - today).days <= 3 else 'Medium'
                })
        
        # Analyze staff availability and potential shortages
        if not staff_df.empty and not time_off_df.empty:
            for _, time_off in time_off_df.iterrows():
                if time_off.get('status') == 'approved':
                    # Check if this creates a shortage
                    affected_staff = time_off.get('staff_id')
                    if affected_staff:
                        staff_info = staff_df[staff_df['staff_id'] == affected_staff]
                        if not staff_info.empty:
                            analysis['staff_shortages'].append({
                                'date': time_off.get('start_date'),
                                'staff_name': staff_info.iloc[0].get('first_name', 'Unknown'),
                                'reason': time_off.get('reason', 'Time off'),
                                'priority': 'High' if time_off.get('start_date') == str(today) else 'Medium'
                            })
        
        # Analyze heavy workload days
        if not schedules_df.empty and 'start_date' in schedules_df.columns:
            schedules_df['start_date'] = pd.to_datetime(schedules_df['start_date'])
            daily_schedules = schedules_df.groupby(schedules_df['start_date'].dt.date).size()
            
            avg_schedules = daily_schedules.mean()
            heavy_days = daily_schedules[daily_schedules > avg_schedules * 1.5]
            
            for date, count in heavy_days.items():
                analysis['heavy_workload_days'].append({
                    'date': str(date),
                    'schedule_count': int(count),
                    'recommendation': 'Consider additional staff or overtime'
                })
        
        # Check for stock intake patterns based on business patterns
        if len(schedules_df) > 0:
            # Analyze business patterns for stock intake
            # Check for patterns that might indicate stock intake days
            if 'start_date' in schedules_df.columns:
                schedules_df['start_date'] = pd.to_datetime(schedules_df['start_date'])
                
                # Look for days with unusual scheduling patterns (might indicate stock intake)
                daily_schedules = schedules_df.groupby(schedules_df['start_date'].dt.date).size()
                
                # Check for patterns in the next 7 days
                for i in range(7):
                    check_date = today + timedelta(days=i)
                    if check_date in daily_schedules.index:
                        schedule_count = daily_schedules[check_date]
                        # If there are many schedules on a specific day, it might be stock intake
                        if schedule_count > 3:  # Threshold for potential stock intake
                            analysis['stock_intake_alerts'].append({
                                'date': str(check_date),
                                'type': 'Potential Stock Intake',
                                'recommendation': f'High activity day ({schedule_count} schedules) - ensure strong staff available for heavy lifting',
                                'priority': 'Medium'
                            })
            
            # Add general stock intake reminder for mid-week
            mid_week = today + timedelta(days=3)
            analysis['stock_intake_alerts'].append({
                'date': str(mid_week),
                'type': 'Weekly Stock Check',
                'recommendation': 'Schedule inventory check and stock organization',
                'priority': 'Low'
            })
        
        return analysis
    
    def generate_ai_insights(self, analysis_data: Dict, business_data: Dict) -> str:
        """Generate AI insights using Google Gemini."""
        
        # Prepare context for AI
        festivals = analysis_data.get('upcoming_festivals', [])
        staff_shortages = analysis_data.get('staff_shortages', [])
        heavy_workload = analysis_data.get('heavy_workload_days', [])
        stock_alerts = analysis_data.get('stock_intake_alerts', [])
        
        context = f"""
        UPCOMING WEEK ANALYSIS (Next 7 Days):
        
        FESTIVALS & SPECIAL EVENTS:
        {festivals}
        
        STAFF SHORTAGES:
        {staff_shortages}
        
        HEAVY WORKLOAD DAYS:
        {heavy_workload}
        
        STOCK & INVENTORY ALERTS:
        {stock_alerts}
        
        BUSINESS CONTEXT:
        - Analysis Period: {business_data.get('analysis_period', 'Next 7 days')}
        - Total Staff: {len(business_data.get('staff_members', []))}
        - Active Schedules: {len(business_data.get('schedules', []))}
        """
        
        prompt = f"""
        As an AI business advisor for Indian small retail operations, analyze this upcoming week data and provide proactive insights and recommendations:

        CONTEXT:
        {context}

        Please provide specific, actionable insights for the next 7 days focusing on:

        1. STAFFING PREPARATIONS:
        - Festival staffing needs (if any festivals are coming)
        - Staff shortage mitigation strategies
        - Heavy workload day preparations
        - Cross-training recommendations

        2. OPERATIONAL ALERTS:
        - Stock intake and inventory management
        - Equipment or facility needs
        - Customer service preparations
        - Safety considerations

        3. BUSINESS OPPORTUNITIES:
        - Festival sales preparation
        - Staff scheduling optimizations
        - Cost-saving opportunities
        - Revenue enhancement tips

        4. RISK MITIGATION:
        - Potential staffing gaps
        - Equipment or supply issues
        - Weather or external factors
        - Emergency backup plans

        Format your response as:
        - Clear, actionable insights
        - Priority levels (Critical/High/Medium/Low)
        - Specific dates and timelines
        - Practical steps the owner can take immediately

        Focus on being proactive rather than reactive. Help the owner prepare for the upcoming week.
        """
        
        try:
            response = self.gemini_client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )
            return response.text
        except Exception as e:
            return f"Error generating AI insights (Gemini): {e}"
    
    def generate_weekly_insights(self, business_ids: List[str], owner_email: str) -> Dict:
        """Main method to generate weekly insights."""
        
        print("Fetching upcoming week data...")
        raw_data = self.fetch_upcoming_data(business_ids)
        
        print("Analyzing upcoming events...")
        events_analysis = self.analyze_upcoming_events(raw_data)
        
        print("Generating AI insights...")
        ai_insights = self.generate_ai_insights(events_analysis, raw_data)
        
        # Generate immediate action items
        immediate_actions = self._generate_immediate_actions(events_analysis)
        
        # Structure final insights
        insights = {
            'business_ids': business_ids,
            'owner_email': owner_email,
            'generated_at': datetime.now().isoformat(),
            'analysis_period': raw_data['analysis_period'],
            'events_analysis': events_analysis,
            'ai_insights': ai_insights,
            'immediate_actions': immediate_actions,
            'priority_score': self._calculate_priority_score(events_analysis)
        }
        
        return insights
    
    def _generate_immediate_actions(self, analysis: Dict) -> List[Dict]:
        """Generate immediate actionable items for the upcoming week."""
        actions = []
        
        # Festival preparations
        festivals = analysis.get('upcoming_festivals', [])
        for festival in festivals:
            if festival.get('impact') == 'High':
                actions.append({
                    'priority': 'Critical',
                    'category': 'Festival Preparation',
                    'action': f"Prepare for {festival['name']}",
                    'description': f"Festival in {festival['days_until']} days - consider extra staffing",
                    'deadline': festival['date']
                })
        
        # Staff shortage actions
        shortages = analysis.get('staff_shortages', [])
        for shortage in shortages:
            if shortage.get('priority') == 'High':
                actions.append({
                    'priority': 'High',
                    'category': 'Staffing',
                    'action': f"Address staff shortage - {shortage['staff_name']}",
                    'description': f"Find replacement for {shortage['reason']} on {shortage['date']}",
                    'deadline': shortage['date']
                })
        
        # Heavy workload preparations
        heavy_days = analysis.get('heavy_workload_days', [])
        for day in heavy_days:
            actions.append({
                'priority': 'Medium',
                'category': 'Workload Management',
                'action': f"Prepare for heavy workload on {day['date']}",
                'description': f"{day['schedule_count']} schedules - {day['recommendation']}",
                'deadline': day['date']
            })
        
        # Stock intake preparations
        stock_alerts = analysis.get('stock_intake_alerts', [])
        for alert in stock_alerts:
            actions.append({
                'priority': alert.get('priority', 'Medium'),
                'category': 'Inventory',
                'action': f"Prepare for {alert['type']}",
                'description': alert['recommendation'],
                'deadline': alert['date']
            })
        
        return actions
    
    def _calculate_priority_score(self, analysis: Dict) -> int:
        """Calculate priority score (0-100) based on upcoming events."""
        score = 0
        
        # Festival impact
        festivals = analysis.get('upcoming_festivals', [])
        for festival in festivals:
            if festival.get('impact') == 'High':
                score += 30
            else:
                score += 15
        
        # Staff shortage impact
        shortages = analysis.get('staff_shortages', [])
        for shortage in shortages:
            if shortage.get('priority') == 'High':
                score += 25
            else:
                score += 10
        
        # Heavy workload impact
        heavy_days = len(analysis.get('heavy_workload_days', []))
        score += min(heavy_days * 10, 20)
        
        return min(score, 100)

def create_flask_insights_api():
    """Flask API for AI insights generation."""
    from flask import Flask, request, jsonify
    from flask_cors import CORS
    
    app = Flask(__name__)
    CORS(app)
    
    @app.route('/api/insights', methods=['POST'])
    def generate_insights():
        try:
            payload = request.get_json(force=True) or {}
            
            # Extract business context
            metadata = payload.get('metadata', {}) or {}
            business_ids = metadata.get('business_ids', []) or []
            owner_email = metadata.get('owner_email', 'Unknown')
            
            if not business_ids:
                return jsonify({
                    'error': 'No business IDs provided',
                    'insights': 'No business data available for insights generation'
                })
            
            # Generate insights
            generator = AIInsightsGenerator(
                os.getenv('SUPABASE_URL', ''),
                os.getenv('SUPABASE_KEY', ''),
                os.getenv('GEMINI_API_KEY', '')
            )
            
            insights = generator.generate_weekly_insights(business_ids, owner_email)
            
            return jsonify(insights)
            
        except Exception as e:
            import traceback
            tb = traceback.format_exc()
            print("/api/insights error:", e)
            print(tb)
            
            return jsonify({
                'error': str(e),
                'insights': f"Insights generation failed: {e}",
                'immediate_actions': [],
                'generated_at': datetime.now().isoformat()
            })
    
    @app.route('/api/insights/quick', methods=['POST'])
    def quick_insights():
        """Quick insights endpoint for dashboard alerts."""
        try:
            payload = request.get_json(force=True) or {}
            
            # Extract business context
            metadata = payload.get('metadata', {}) or {}
            business_ids = metadata.get('business_ids', []) or []
            owner_email = metadata.get('owner_email', 'Unknown')
            
            if not business_ids:
                return jsonify({
                    'alerts': [],
                    'insights': 'No business data available',
                    'generated_at': datetime.now().isoformat()
                })
            
            # Generate quick insights for dashboard
            generator = AIInsightsGenerator(
                os.getenv('SUPABASE_URL', ''),
                os.getenv('SUPABASE_KEY', ''),
                os.getenv('GEMINI_API_KEY', '')
            )
            
            # Fetch upcoming data
            raw_data = generator.fetch_upcoming_data(business_ids, days_ahead=7)
            events_analysis = generator.analyze_upcoming_events(raw_data)
            
            # Generate dashboard alerts
            alerts = []
            
            # Festival alerts
            festivals = events_analysis.get('upcoming_festivals', [])
            for festival in festivals:
                if festival.get('impact') == 'High':
                    alerts.append({
                        'type': 'festival',
                        'priority': 'high',
                        'title': f"Festival Alert: {festival['name']}",
                        'message': f"Major festival in {festival['days_until']} days. Consider hiring extra staff.",
                        'date': festival['date'],
                        'action_required': 'Hire temporary staff'
                    })
                else:
                    alerts.append({
                        'type': 'festival',
                        'priority': 'medium',
                        'title': f"Festival Notice: {festival['name']}",
                        'message': f"Festival in {festival['days_until']} days. Plan for increased customer traffic.",
                        'date': festival['date'],
                        'action_required': 'Prepare for busy period'
                    })
            
            # Staff shortage alerts
            shortages = events_analysis.get('staff_shortages', [])
            for shortage in shortages:
                alerts.append({
                    'type': 'staffing',
                    'priority': shortage.get('priority', 'medium'),
                    'title': f"Staff Shortage: {shortage['staff_name']}",
                    'message': f"{shortage['reason']} on {shortage['date']}. Find replacement.",
                    'date': shortage['date'],
                    'action_required': 'Find staff replacement'
                })
            
            # Heavy workload alerts
            heavy_days = events_analysis.get('heavy_workload_days', [])
            for day in heavy_days:
                alerts.append({
                    'type': 'workload',
                    'priority': 'medium',
                    'title': f"Heavy Workload: {day['date']}",
                    'message': f"{day['schedule_count']} schedules scheduled. {day['recommendation']}",
                    'date': day['date'],
                    'action_required': 'Schedule additional staff'
                })
            
            # Stock intake alerts
            stock_alerts = events_analysis.get('stock_intake_alerts', [])
            for alert in stock_alerts:
                alerts.append({
                    'type': 'inventory',
                    'priority': alert.get('priority', 'medium'),
                    'title': f"Stock Intake: {alert['type']}",
                    'message': f"{alert['recommendation']}",
                    'date': alert['date'],
                    'action_required': 'Assign strong staff for heavy lifting'
                })
            
            # Generate AI summary
            ai_summary = generator.generate_ai_insights(events_analysis, raw_data)
            
            return jsonify({
                'alerts': alerts,
                'insights': ai_summary,
                'priority_score': generator._calculate_priority_score(events_analysis),
                'generated_at': datetime.now().isoformat()
            })
            
        except Exception as e:
            import traceback
            tb = traceback.format_exc()
            print("/api/insights/quick error:", e)
            print(tb)
            
            return jsonify({
                'alerts': [],
                'insights': f"Insights generation failed: {e}",
                'priority_score': 0,
                'generated_at': datetime.now().isoformat()
            })
    
    return app

if __name__ == "__main__":
    app = create_flask_insights_api()
    app.run(host='127.0.0.1', port=5001, debug=True)
