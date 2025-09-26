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
class StoreRecommendationAgent:
    def __init__(self, supabase_url: str, supabase_key: str, gemini_api_key: str):
        """Initialize the AI recommendation agent with database and AI service connections."""
        self.supabase: Client = create_client(supabase_url, supabase_key)
        # Initialize Gemini client (uses provided key or env fallback if supported)
        try:
            self.gemini_client = genai.Client(api_key=gemini_api_key)
        except Exception:
            self.gemini_client = genai.Client()
        self.shop_id = None
        
        # Get Indian holidays for festival planning
        self.india_holidays = holidays.India(years=[2024, 2025])
        
    def set_shop(self, shop_id: str):
        """Set the current shop context for recommendations."""
        self.shop_id = shop_id
        
    def fetch_comprehensive_data(self, days_back: int = 90) -> Dict:
        """Fetch comprehensive data from your database schema."""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days_back)
        
        try:
            # Fetch shifts with related data
            shifts_response = self.supabase.table('shifts').select(
                '*, staff_id, shop_id, role_id'
            ).eq('shop_id', self.shop_id).gte(
                'start_date', start_date.isoformat()
            ).lte('end_date', end_date.isoformat()).execute()
            
            # Fetch staff members
            staff_response = self.supabase.table('staff_members').select(
                '*, shop_id'
            ).eq('shop_id', self.shop_id).execute()
            
            # Fetch staff availability
            availability_response = self.supabase.table('staff_availability').select(
                '*'
            ).execute()
            
            # Fetch schedules
            schedules_response = self.supabase.table('schedules').select(
                '*, shop_id, staff_id'
            ).eq('shop_id', self.shop_id).execute()
            
            # Fetch business hours
            hours_response = self.supabase.table('business_hours').select(
                '*'
            ).eq('shop_id', self.shop_id).execute()
            
            # Fetch time off requests
            time_off_response = self.supabase.table('time_off_requests').select(
                '*'
            ).execute()
            
            # Fetch roles for understanding staff hierarchy
            roles_response = self.supabase.table('roles').select('*').execute()
            
            # Fetch staff roles mapping
            staff_roles_response = self.supabase.table('staff_roles').select(
                '*'
            ).execute()
            
            # Fetch shop details
            shop_response = self.supabase.table('shops').select(
                '*'
            ).eq('shop_id', self.shop_id).execute()
            
            return {
                'shifts': shifts_response.data,
                'staff_members': staff_response.data,
                'staff_availability': availability_response.data,
                'schedules': schedules_response.data,
                'business_hours': hours_response.data,
                'time_off_requests': time_off_response.data,
                'roles': roles_response.data,
                'staff_roles': staff_roles_response.data,
                'shop_details': shop_response.data,
                'analysis_period': f"{start_date.date()} to {end_date.date()}"
            }
            
        except Exception as e:
            print(f"Error fetching data: {e}")
            return {
                'shifts': [], 'staff_members': [], 'staff_availability': [],
                'schedules': [], 'business_hours': [], 'time_off_requests': [],
                'roles': [], 'staff_roles': [], 'shop_details': []
            }
    
    def analyze_staffing_efficiency(self, data: Dict) -> Dict:
        """Analyze staffing patterns and efficiency based on your schema."""
        if not data['shifts'] or not data['staff_members']:
            return {'analysis': 'Insufficient data for staffing analysis'}
            
        shifts_df = pd.DataFrame(data['shifts'])
        staff_df = pd.DataFrame(data['staff_members'])
        schedules_df = pd.DataFrame(data['schedules']) if data['schedules'] else pd.DataFrame()
        
        # Convert datetime fields
        if 'start_date' in shifts_df.columns:
            shifts_df['start_date'] = pd.to_datetime(shifts_df['start_date'])
            shifts_df['day_of_week'] = shifts_df['start_date'].dt.day_name()
        
        analysis = {
            'total_shifts': len(shifts_df),
            'total_staff': len(staff_df),
            'active_staff': len(staff_df[staff_df['is_active'] == True]) if 'is_active' in staff_df.columns else len(staff_df),
            'shifts_per_staff': {},
            'peak_days': {},
            'staff_utilization': {},
            'role_distribution': {},
            'overtime_analysis': {},
            'availability_gaps': []
        }
        
        # Analyze shifts per staff member
        if 'staff_id' in shifts_df.columns:
            shifts_per_staff = shifts_df['staff_id'].value_counts()
            for staff_id, shift_count in shifts_per_staff.items():
                staff_info = staff_df[staff_df['staff_id'] == staff_id]
                if not staff_info.empty:
                    staff_name = staff_info.iloc[0].get('first_name', 'Unknown')
                    analysis['shifts_per_staff'][staff_name] = int(shift_count)
        
        # Analyze peak days
        if 'day_of_week' in shifts_df.columns:
            analysis['peak_days'] = shifts_df['day_of_week'].value_counts().to_dict()
        
        # Analyze role distribution
        roles_df = pd.DataFrame(data['roles']) if data['roles'] else pd.DataFrame()
        staff_roles_df = pd.DataFrame(data['staff_roles']) if data['staff_roles'] else pd.DataFrame()
        
        if not roles_df.empty and not staff_roles_df.empty:
            role_counts = staff_roles_df['role_id'].value_counts()
            for role_id, count in role_counts.items():
                role_info = roles_df[roles_df['role_id'] == role_id]
                if not role_info.empty:
                    role_name = role_info.iloc[0].get('role_name', f'Role_{role_id}')
                    analysis['role_distribution'][role_name] = int(count)
        
        return analysis
    
    def analyze_festival_patterns(self, data: Dict) -> Dict:
        """Analyze patterns around festivals and suggest staffing changes."""
        shifts_df = pd.DataFrame(data['shifts']) if data['shifts'] else pd.DataFrame()
        
        if shifts_df.empty or 'start_date' not in shifts_df.columns:
            return {'festival_analysis': 'No shift data available for festival analysis'}
        
        shifts_df['start_date'] = pd.to_datetime(shifts_df['start_date'])
        
        festival_analysis = {
            'upcoming_festivals': [],
            'historical_festival_impact': {},
            'staffing_recommendations': []
        }
        
        # Get upcoming festivals in next 60 days
        today = datetime.now().date()
        for date, name in self.india_holidays.items():
            if today <= date <= (today + timedelta(days=60)):
                festival_analysis['upcoming_festivals'].append({
                    'date': str(date),
                    'name': name,
                    'days_until': (date - today).days
                })
        
        # Analyze historical patterns around festivals
        for date, name in self.india_holidays.items():
            if (today - timedelta(days=365)) <= date <= today:
                # Check shifts around this festival (3 days before and after)
                festival_period = shifts_df[
                    (shifts_df['start_date'].dt.date >= (date - timedelta(days=3))) &
                    (shifts_df['start_date'].dt.date <= (date + timedelta(days=3)))
                ]
                
                if not festival_period.empty:
                    normal_period = shifts_df[
                        (shifts_df['start_date'].dt.date >= (date - timedelta(days=14))) &
                        (shifts_df['start_date'].dt.date <= (date - timedelta(days=7)))
                    ]
                    
                    festival_shifts = len(festival_period)
                    normal_avg = len(normal_period) / 7 * 7 if not normal_period.empty else festival_shifts
                    
                    impact = ((festival_shifts - normal_avg) / normal_avg * 100) if normal_avg > 0 else 0
                    
                    festival_analysis['historical_festival_impact'][name] = {
                        'shifts_during_festival': festival_shifts,
                        'normal_period_avg': round(normal_avg, 2),
                        'impact_percentage': round(impact, 2)
                    }
        
        # Generate staffing recommendations for upcoming festivals
        for festival in festival_analysis['upcoming_festivals']:
            festival_name = festival['name']
            days_until = festival['days_until']
            
            historical_impact = festival_analysis['historical_festival_impact'].get(festival_name, {})
            
            if historical_impact and historical_impact.get('impact_percentage', 0) > 20:
                festival_analysis['staffing_recommendations'].append({
                    'festival': festival_name,
                    'date': festival['date'],
                    'recommendation': f"Increase staffing by {round(historical_impact['impact_percentage'])}% based on historical data",
                    'priority': 'High' if days_until <= 7 else 'Medium'
                })
            elif days_until <= 7:
                festival_analysis['staffing_recommendations'].append({
                    'festival': festival_name,
                    'date': festival['date'],
                    'recommendation': "Consider 25-30% staff increase for festival period",
                    'priority': 'Medium'
                })
        
        return festival_analysis
    
    def analyze_profit_optimization(self, data: Dict) -> Dict:
        """Analyze profit optimization opportunities."""
        staff_df = pd.DataFrame(data['staff_members']) if data['staff_members'] else pd.DataFrame()
        shifts_df = pd.DataFrame(data['shifts']) if data['shifts'] else pd.DataFrame()
        business_hours_df = pd.DataFrame(data['business_hours']) if data['business_hours'] else pd.DataFrame()
        
        profit_analysis = {
            'cost_optimization': {},
            'revenue_opportunities': {},
            'efficiency_improvements': {},
            'staff_cost_analysis': {}
        }
        
        # Staff cost analysis
        if not staff_df.empty and 'hourly_rate' in staff_df.columns:
            total_staff_cost = 0
            staff_costs = {}
            
            for _, staff in staff_df.iterrows():
                if pd.notna(staff.get('hourly_rate')):
                    # Calculate monthly cost assuming average hours
                    monthly_hours = 160  # Approximate full-time hours
                    if 'max_hours_per_week' in staff:
                        monthly_hours = staff['max_hours_per_week'] * 4.33
                    
                    monthly_cost = staff['hourly_rate'] * monthly_hours
                    staff_costs[staff.get('first_name', 'Unknown')] = monthly_cost
                    total_staff_cost += monthly_cost
            
            profit_analysis['staff_cost_analysis'] = {
                'total_monthly_labor_cost': round(total_staff_cost, 2),
                'individual_costs': staff_costs,
                'average_hourly_rate': round(staff_df['hourly_rate'].mean(), 2) if 'hourly_rate' in staff_df.columns else 0
            }
        
        # Business hours optimization
        if not business_hours_df.empty:
            profit_analysis['efficiency_improvements']['operating_hours'] = {
                'total_weekly_hours': len(business_hours_df) * 8,  # Assuming 8-hour days
                'optimization_suggestion': "Analyze customer traffic patterns to optimize opening hours"
            }
        
        # Shift efficiency analysis
        if not shifts_df.empty:
            if 'start_date' in shifts_df.columns:
                shifts_df['start_date'] = pd.to_datetime(shifts_df['start_date'])
                daily_shifts = shifts_df.groupby(shifts_df['start_date'].dt.date).size()
                
                profit_analysis['efficiency_improvements']['shift_distribution'] = {
                    'avg_shifts_per_day': round(daily_shifts.mean(), 2),
                    'max_shifts_day': int(daily_shifts.max()),
                    'min_shifts_day': int(daily_shifts.min()),
                    'optimization_potential': "High" if daily_shifts.std() > daily_shifts.mean() * 0.3 else "Low"
                }
        
        return profit_analysis
    
    def generate_ai_recommendations(self, analysis_data: Dict) -> str:
        """Generate comprehensive AI recommendations using Google Gemini."""
        
        context = f"""
        COMPREHENSIVE STORE ANALYSIS DATA:
        
        STAFFING EFFICIENCY:
        - Total shifts analyzed: {analysis_data['staffing']['total_shifts']}
        - Total staff members: {analysis_data['staffing']['total_staff']}
        - Active staff: {analysis_data['staffing']['active_staff']}
        - Peak days: {analysis_data['staffing']['peak_days']}
        - Role distribution: {analysis_data['staffing']['role_distribution']}
        - Shifts per staff: {analysis_data['staffing']['shifts_per_staff']}
        
        FESTIVAL & SEASONAL ANALYSIS:
        - Upcoming festivals: {analysis_data['festivals']['upcoming_festivals']}
        - Historical festival impact: {analysis_data['festivals']['historical_festival_impact']}
        - Festival staffing recommendations: {analysis_data['festivals']['staffing_recommendations']}
        
        PROFIT OPTIMIZATION DATA:
        - Staff cost analysis: {analysis_data['profit']['staff_cost_analysis']}
        - Efficiency improvements: {analysis_data['profit']['efficiency_improvements']}
        
        Analysis period: {analysis_data.get('period', 'Last 90 days')}
        Location: India (considering local festivals and holidays)
        """
        
        prompt = f"""
        As an AI business consultant specializing in Indian small retail operations, analyze this comprehensive store data and provide specific, actionable recommendations for:

        1. PROFIT MAXIMIZATION STRATEGIES:
        - Labor cost optimization without compromising service
        - Revenue enhancement opportunities
        - Pricing and operational efficiency improvements
        - Cost reduction in non-critical areas

        2. FESTIVAL & SEASONAL STAFF MANAGEMENT:
        - Specific staffing adjustments for upcoming Indian festivals
        - Seasonal hiring recommendations
        - Staff scheduling optimization for peak periods
        - Training recommendations for festival rush

        3. OPERATIONAL EFFICIENCY:
        - Staff utilization optimization
        - Role distribution improvements
        - Shift pattern enhancements
        - Customer service during peak times

        4. RISK MANAGEMENT & PLANNING:
        - Staff shortage mitigation during festivals
        - Cross-training recommendations
        - Emergency staffing protocols
        - Long-term growth planning

        Store Analysis Data:
        {context}

        Please provide specific recommendations with:
        - Clear action items
        - Priority levels (Critical/High/Medium/Low)
        - Expected impact on profit/efficiency
        - Timeline for implementation
        - Specific numbers/percentages where applicable

        Focus on practical solutions that a small Indian shop owner can implement immediately.
        """

        try:
            response = self.gemini_client.models.generate_content(
                model="gemini-2.5-flash",
                contents=f"{prompt}"
            )
            return response.text
        except Exception as e:
            return f"Error generating AI recommendations (Gemini): {e}"
    
    def generate_comprehensive_recommendations(self, shop_id: str) -> Dict:
        """Main method to generate comprehensive recommendations for a shop."""
        self.set_shop(shop_id)
        
        print("Fetching comprehensive shop data...")
        raw_data = self.fetch_comprehensive_data()
        
        print("Analyzing staffing efficiency...")
        staffing_analysis = self.analyze_staffing_efficiency(raw_data)
        
        print("Analyzing festival patterns and seasonal trends...")
        festival_analysis = self.analyze_festival_patterns(raw_data)
        
        print("Analyzing profit optimization opportunities...")
        profit_analysis = self.analyze_profit_optimization(raw_data)
        
        # Combine all analysis
        combined_analysis = {
            'staffing': staffing_analysis,
            'festivals': festival_analysis,
            'profit': profit_analysis,
            'period': raw_data['analysis_period']
        }
        
        print("Generating AI-powered recommendations...")
        ai_recommendations = self.generate_ai_recommendations(combined_analysis)
        
        # Generate immediate action items
        immediate_actions = self._generate_immediate_actions(combined_analysis)
        
        # Structure final recommendations
        recommendations = {
            'shop_id': shop_id,
            'generated_at': datetime.now().isoformat(),
            'analysis_summary': combined_analysis,
            'ai_recommendations': ai_recommendations,
            'immediate_actions': immediate_actions,
            'profit_impact_score': self._calculate_profit_impact_score(combined_analysis),
            'implementation_timeline': self._create_implementation_timeline(combined_analysis)
        }
        
        # Save to database (you might want to create a recommendations table)
        try:
            self.supabase.table('ai_recommendations').upsert({
                'shop_id': shop_id,
                'recommendations_data': recommendations,
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            }).execute()
            print("Recommendations saved to database.")
        except Exception as e:
            print(f"Could not save recommendations: {e}")
        
        return recommendations
    
    def _generate_immediate_actions(self, analysis: Dict) -> List[Dict]:
        """Generate immediate actionable items."""
        actions = []
        
        # Festival-based actions
        festivals = analysis['festivals']['staffing_recommendations']
        for festival_rec in festivals:
            if festival_rec['priority'] == 'High':
                actions.append({
                    'priority': 'Critical',
                    'category': 'Festival Preparation',
                    'action': f"Prepare for {festival_rec['festival']}",
                    'description': festival_rec['recommendation'],
                    'deadline': festival_rec['date']
                })
        
        # Staffing efficiency actions
        staffing = analysis['staffing']
        if staffing.get('total_staff', 0) > 0:
            utilization = staffing.get('shifts_per_staff', {})
            if utilization:
                max_shifts = max(utilization.values())
                min_shifts = min(utilization.values())
                
                if max_shifts > min_shifts * 2:  # Significant imbalance
                    actions.append({
                        'priority': 'High',
                        'category': 'Staff Optimization',
                        'action': 'Balance staff workload',
                        'description': f'Some staff have {max_shifts} shifts while others have {min_shifts}. Redistribute for better efficiency.',
                        'deadline': (datetime.now() + timedelta(days=7)).isoformat()
                    })
        
        # Cost optimization actions
        profit = analysis['profit']
        staff_costs = profit.get('staff_cost_analysis', {})
        if staff_costs.get('total_monthly_labor_cost', 0) > 0:
            actions.append({
                'priority': 'Medium',
                'category': 'Cost Control',
                'action': 'Review labor costs',
                'description': f'Monthly labor cost: ₹{staff_costs["total_monthly_labor_cost"]}. Analyze if this aligns with revenue targets.',
                'deadline': (datetime.now() + timedelta(days=14)).isoformat()
            })
        
        return actions
    
    def _calculate_profit_impact_score(self, analysis: Dict) -> int:
        """Calculate potential profit impact score (0-100)."""
        score = 50  # Base score
        
        # Festival opportunities
        upcoming_festivals = len(analysis['festivals']['upcoming_festivals'])
        score += min(upcoming_festivals * 5, 20)  # Max 20 points for festivals
        
        # Staff efficiency opportunities
        staffing = analysis['staffing']
        if staffing.get('shifts_per_staff'):
            utilization_values = list(staffing['shifts_per_staff'].values())
            if utilization_values:
                std_dev = np.std(utilization_values)
                mean_val = np.mean(utilization_values)
                if mean_val > 0:
                    cv = std_dev / mean_val
                    # Higher coefficient of variation means more optimization potential
                    score += min(cv * 30, 30)
        
        return min(int(score), 100)
    
    def _create_implementation_timeline(self, analysis: Dict) -> Dict:
        """Create implementation timeline for recommendations."""
        timeline = {
            'immediate (1-3 days)': [],
            'short_term (1-2 weeks)': [],
            'medium_term (1-2 months)': [],
            'long_term (3+ months)': []
        }
        
        # Add festival preparations to immediate if within 7 days
        for festival in analysis['festivals']['upcoming_festivals']:
            if festival['days_until'] <= 3:
                timeline['immediate (1-3 days)'].append(f"Prepare for {festival['name']}")
            elif festival['days_until'] <= 14:
                timeline['short_term (1-2 weeks)'].append(f"Plan staffing for {festival['name']}")
        
        # Add other recommendations
        timeline['short_term (1-2 weeks)'].extend([
            'Optimize shift distributions',
            'Review staff utilization patterns'
        ])
        
        timeline['medium_term (1-2 months)'].extend([
            'Implement cost optimization measures',
            'Cross-train staff for flexibility'
        ])
        
        timeline['long_term (3+ months)'].extend([
            'Develop seasonal staffing strategy',
            'Implement comprehensive performance tracking'
        ])
        
        return timeline

# Usage functions for integration
def get_shop_recommendations(shop_id: str, supabase_url: str, supabase_key: str, gemini_api_key: str) -> Dict:
    """Main function to get recommendations for a specific shop."""
    agent = StoreRecommendationAgent(supabase_url, supabase_key, gemini_api_key)
    return agent.generate_comprehensive_recommendations(shop_id)

def create_flask_api():
    """Flask API integration example."""
    from flask import Flask, request, jsonify
    
    app = Flask(__name__)
    
    @app.route('/api/shop/<shop_id>/recommendations', methods=['GET'])
    def get_recommendations(shop_id):
        try:
            supabase_url = os.getenv('SUPABASE_URL')
            supabase_key = os.getenv('SUPABASE_KEY') 
            gemini_api_key = os.getenv('GEMINI_API_KEY')
            
            recommendations = get_shop_recommendations(
                shop_id, supabase_url, supabase_key, gemini_api_key
            )
            
            return jsonify(recommendations)
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/shop/<shop_id>/quick-actions', methods=['GET'])
    def get_quick_actions(shop_id):
        try:
            supabase_url = os.getenv('SUPABASE_URL')
            supabase_key = os.getenv('SUPABASE_KEY')
            gemini_api_key = os.getenv('GEMINI_API_KEY')
            
            agent = StoreRecommendationAgent(supabase_url, supabase_key, gemini_api_key)
            raw_data = agent.fetch_comprehensive_data()
            
            # Quick analysis for immediate actions
            staffing_analysis = agent.analyze_staffing_efficiency(raw_data)
            festival_analysis = agent.analyze_festival_patterns(raw_data)
            
            combined_analysis = {
                'staffing': staffing_analysis,
                'festivals': festival_analysis,
                'profit': {}
            }
            
            quick_actions = agent._generate_immediate_actions(combined_analysis)
            
            return jsonify({'quick_actions': quick_actions})
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    return app

if __name__ == "__main__":
    # Example usage
    SUPABASE_URL = os.getenv('SUPABASE_URL', 'your-supabase-url')
    SUPABASE_KEY = os.getenv('SUPABASE_KEY', 'your-supabase-key')
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', 'your-openai-key')
    
    # Test the agent
    # agent = StoreRecommendationAgent(SUPABASE_URL, SUPABASE_KEY, OPENAI_API_KEY)
    # recommendations = agent.generate_comprehensive_recommendations('your-shop-id')
    # print(json.dumps(recommendations, indent=2, default=str))