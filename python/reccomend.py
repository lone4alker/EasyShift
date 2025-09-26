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
    def _init_(self, supabase_url: str, supabase_key: str, gemini_api_key: str):
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
                '*'
            ).eq('business_id', self.shop_id).gte(
                'start_time', start_date.isoformat()
            ).lte('end_time', end_date.isoformat()).execute()
            
            # Fetch staff members
            staff_response = self.supabase.table('staff_members').select(
                '*'
            ).eq('business_id', self.shop_id).execute()
            
            # Fetch staff availability
            availability_response = self.supabase.table('staff_availability').select(
                '*'
            ).execute()
            
            # Fetch schedules
            schedules_response = self.supabase.table('schedules').select(
                '*'
            ).eq('business_id', self.shop_id).execute()
            
            # Fetch business hours
            hours_response = self.supabase.table('business_hours').select(
                '*'
            ).eq('business_id', self.shop_id).execute()
            
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
            shop_response = self.supabase.table('businesses').select('*').eq('business_id', self.shop_id).execute()
            
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
        # Normalize time fields
        if 'start_time' in shifts_df.columns:
            shifts_df['start_time'] = pd.to_datetime(shifts_df['start_time'])
            shifts_df['day_of_week'] = shifts_df['start_time'].dt.day_name()
        
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
        
        if shifts_df.empty or 'start_time' not in shifts_df.columns:
            return {'festival_analysis': 'No shift data available for festival analysis'}
        
        shifts_df['start_time'] = pd.to_datetime(shifts_df['start_time'])
        
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
                    (shifts_df['start_time'].dt.date >= (date - timedelta(days=3))) &
                    (shifts_df['start_time'].dt.date <= (date + timedelta(days=3)))
                ]
                
                if not festival_period.empty:
                    normal_period = shifts_df[
                        (shifts_df['start_time'].dt.date >= (date - timedelta(days=14))) &
                        (shifts_df['start_time'].dt.date <= (date - timedelta(days=7)))
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
            if 'start_time' in shifts_df.columns:
                shifts_df['start_time'] = pd.to_datetime(shifts_df['start_time'])
                daily_shifts = shifts_df.groupby(shifts_df['start_time'].dt.date).size()
                
                profit_analysis['efficiency_improvements']['shift_distribution'] = {
                    'avg_shifts_per_day': round(daily_shifts.mean(), 2),
                    'max_shifts_day': int(daily_shifts.max()),
                    'min_shifts_day': int(daily_shifts.min()),
                    'optimization_potential': "High" if daily_shifts.std() > daily_shifts.mean() * 0.3 else "Low"
                }
        
        return profit_analysis
    
    def generate_ai_recommendations(self, analysis_data: Dict) -> str:
        """Generate comprehensive AI recommendations using Google Gemini."""
        # Use safe defaults in case upstream analyses are sparse
        staffing = analysis_data.get('staffing') or {}
        festivals = analysis_data.get('festivals') or {}
        profit = analysis_data.get('profit') or {}

        if not isinstance(staffing, dict):
            staffing = {}
        if not isinstance(festivals, dict):
            festivals = {}
        if not isinstance(profit, dict):
            profit = {}

        total_shifts = staffing.get('total_shifts', 0)
        total_staff = staffing.get('total_staff', 0)
        active_staff = staffing.get('active_staff', 0)
        peak_days = staffing.get('peak_days', {})
        role_distribution = staffing.get('role_distribution', {})
        shifts_per_staff = staffing.get('shifts_per_staff', {})

        upcoming_festivals = festivals.get('upcoming_festivals', [])
        historical_festival_impact = festivals.get('historical_festival_impact', {})
        staffing_recommendations = festivals.get('staffing_recommendations', [])

        staff_cost_analysis = profit.get('staff_cost_analysis', {})
        efficiency_improvements = profit.get('efficiency_improvements', {})

        context = f"""
        COMPREHENSIVE STORE ANALYSIS DATA:
        
        STAFFING EFFICIENCY:
        - Total shifts analyzed: {total_shifts}
        - Total staff members: {total_staff}
        - Active staff: {active_staff}
        - Peak days: {peak_days}
        - Role distribution: {role_distribution}
        - Shifts per staff: {shifts_per_staff}
        
        FESTIVAL & SEASONAL ANALYSIS:
        - Upcoming festivals: {upcoming_festivals}
        - Historical festival impact: {historical_festival_impact}
        - Festival staffing recommendations: {staffing_recommendations}
        
        PROFIT OPTIMIZATION DATA:
        - Staff cost analysis: {staff_cost_analysis}
        - Efficiency improvements: {efficiency_improvements}
        
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
        
        # Festival-based actions (with safe defaults)
        festivals_data = analysis.get('festivals', {})
        festivals = festivals_data.get('staffing_recommendations', [])
        if isinstance(festivals, list):
            for festival_rec in festivals:
                if isinstance(festival_rec, dict) and festival_rec.get('priority') == 'High':
                    actions.append({
                        'priority': 'Critical',
                        'category': 'Festival Preparation',
                        'action': f"Prepare for {festival_rec.get('festival', 'upcoming festival')}",
                        'description': festival_rec.get('recommendation', 'Prepare for festival period'),
                        'deadline': festival_rec.get('date', (datetime.now() + timedelta(days=7)).isoformat())
                    })
        
        # Staffing efficiency actions
        staffing = analysis.get('staffing', {})
        if staffing.get('total_staff', 0) > 0:
            utilization = staffing.get('shifts_per_staff', {})
            if utilization and isinstance(utilization, dict):
                values = [v for v in utilization.values() if isinstance(v, (int, float))]
                if values:
                    max_shifts = max(values)
                    min_shifts = min(values)
                    
                    if max_shifts > min_shifts * 2:  # Significant imbalance
                        actions.append({
                            'priority': 'High',
                            'category': 'Staff Optimization',
                            'action': 'Balance staff workload',
                            'description': f'Some staff have {max_shifts} shifts while others have {min_shifts}. Redistribute for better efficiency.',
                            'deadline': (datetime.now() + timedelta(days=7)).isoformat()
                        })
        
        # Cost optimization actions
        profit = analysis.get('profit', {})
        staff_costs = profit.get('staff_cost_analysis', {})
        if isinstance(staff_costs, dict) and staff_costs.get('total_monthly_labor_cost', 0) > 0:
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
    """Flask API that accepts frontend data and returns recommendations."""
    from flask import Flask, request, jsonify
    from flask_cors import CORS

    app = Flask(_name_)
    CORS(app)

    @app.route('/api/recommendations', methods=['POST'])
    def recommendations_from_frontend():
        try:
            payload = request.get_json(force=True) or {}

            # Extract business context from metadata
            metadata = payload.get('metadata', {}) or {}
            business_ids = metadata.get('business_ids', []) or []
            owner_email = metadata.get('owner_email', 'Unknown')

            # Build minimal analysis inputs from posted data
            raw_data = {
                'shifts': payload.get('shifts', []) or [],
                'staff_members': payload.get('staff_members', []) or [],
                'staff_availability': payload.get('staff_availability', []) or [],
                'schedules': payload.get('schedules', []) or [],
                'business_hours': payload.get('business_hours', []) or [],
                'time_off_requests': payload.get('time_off_requests', []) or [],
                'roles': payload.get('roles', []) or [],
                'staff_roles': payload.get('staff_roles', []) or [],
                'businesses': payload.get('businesses', []) or [],
                'analysis_period': metadata.get('generated_at', ''),
                'business_ids': business_ids,
                'owner_email': owner_email
            }

            # Use the same analysis pipeline without DB fetch
            agent = StoreRecommendationAgent(
                os.getenv('SUPABASE_URL', ''),
                os.getenv('SUPABASE_KEY', ''),
                os.getenv('GEMINI_API_KEY', '')
            )

            staffing = agent.analyze_staffing_efficiency(raw_data)
            festivals = agent.analyze_festival_patterns(raw_data)
            profit = agent.analyze_profit_optimization(raw_data)

            combined = {
                'staffing': staffing,
                'festivals': festivals,
                'profit': profit,
                'period': raw_data.get('analysis_period') or 'Recent data'
            }

            ai_text = agent.generate_ai_recommendations(combined)
            actions = agent._generate_immediate_actions(combined)

            return jsonify({
                'ai_recommendations': ai_text,
                'immediate_actions': actions,
                'analysis_summary': combined,
                'business_context': {
                    'business_ids': business_ids,
                    'owner_email': owner_email,
                    'business_count': len(payload.get('businesses', []))
                },
                'generated_at': datetime.now().isoformat()
            })
        except Exception as e:
            import traceback
            tb = traceback.format_exc()
            print("/api/recommendations error:", e)
            print(tb)
            # Return 200 with error payload so frontend can still render PDF with error info
            return jsonify({
                'ai_recommendations': f"Recommendation generation failed: {e}",
                'immediate_actions': [],
                'analysis_summary': {},
                'error': str(e),
                'trace': tb,
                'generated_at': datetime.now().isoformat()
            })

    return app

if _name_ == "_main_":
    app = create_flask_api()
    app.run(host='127.0.0.1', port=5000, debug=True)