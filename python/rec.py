import os
import json
from datetime import datetime, timedelta
from typing import Dict, List
from google import genai
from dotenv import load_dotenv
import pandas as pd
import numpy as np
import holidays
import uuid

load_dotenv()


class StoreRecommendationAgent:
    def __init__(self, gemini_api_key: str = None):
        """Initialize the AI recommendation agent with AI service and test-mode data generation."""
        # Initialize Gemini client (uses provided key or env fallback if supported)
        try:
            self.gemini_client = genai.Client(api_key=gemini_api_key) if gemini_api_key else genai.Client()
        except Exception:
            self.gemini_client = None

        self.shop_id = None

        # Get Indian holidays for festival planning
        self.india_holidays = holidays.India(years=[2024, 2025])

    def set_shop(self, shop_id: str):
        """Set the current shop context for recommendations."""
        self.shop_id = shop_id

    def generate_dummy_data(self, days_back: int = 90) -> Dict:
        """Generate dummy data for testing purposes."""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days_back)

        # Generate dummy staff members
        staff_members = []
        for i in range(1, 8):  # 7 staff members
            staff_members.append({
                'staff_id': f'staff_{i}',
                'shop_id': self.shop_id,
                'first_name': f'Employee_{i}',
                'last_name': f'LastName_{i}',
                'email': f'employee{i}@shop.com',
                'phone_number': f'987654321{i}',
                'hourly_rate': np.random.uniform(15, 30),  # Random hourly rate between 15-30
                'max_hours_per_week': np.random.choice([20, 30, 40]),  # Part-time or full-time
                'is_active': True,
                'created_at': (datetime.now() - timedelta(days=np.random.randint(30, 365))).isoformat()
            })

        # Generate dummy shifts
        shifts = []
        current_date = start_date
        while current_date <= end_date:
            # Generate 2-5 shifts per day
            daily_shifts = np.random.randint(2, 6)
            for _ in range(daily_shifts):
                staff_id = np.random.choice([s['staff_id'] for s in staff_members])
                start_time = current_date.replace(
                    hour=np.random.randint(6, 18),
                    minute=np.random.choice([0, 30])
                )
                end_time = start_time + timedelta(hours=np.random.randint(4, 9))

                shifts.append({
                    'shift_id': str(uuid.uuid4()),
                    'staff_id': staff_id,
                    'shop_id': self.shop_id,
                    'role_id': f'role_{np.random.randint(1, 4)}',
                    'start_date': start_time.date().isoformat(),
                    'end_date': end_time.date().isoformat(),
                    'start_time': start_time.time().isoformat(),
                    'end_time': end_time.time().isoformat(),
                    'status': np.random.choice(['completed', 'scheduled'], p=[0.8, 0.2]),
                    'created_at': start_time.isoformat()
                })

            current_date += timedelta(days=1)

        # Generate dummy roles
        roles = [
            {'role_id': 'role_1', 'role_name': 'Cashier', 'description': 'Handle payments and customer checkout'},
            {'role_id': 'role_2', 'role_name': 'Sales Associate', 'description': 'Help customers and manage inventory'},
            {'role_id': 'role_3', 'role_name': 'Manager', 'description': 'Supervise operations and manage staff'},
            {'role_id': 'role_4', 'role_name': 'Stock Clerk', 'description': 'Manage inventory and restocking'}
        ]

        # Generate dummy staff roles
        staff_roles = []
        for staff in staff_members:
            staff_roles.append({
                'staff_id': staff['staff_id'],
                'role_id': f'role_{np.random.randint(1, 5)}',
                'assigned_at': (datetime.now() - timedelta(days=np.random.randint(1, 365))).isoformat()
            })

        # Generate dummy schedules
        schedules = []
        for i, staff in enumerate(staff_members[:5]):  # Only for 5 staff members
            schedules.append({
                'schedule_id': f'schedule_{i+1}',
                'shop_id': self.shop_id,
                'staff_id': staff['staff_id'],
                'status': np.random.choice(['active', 'draft']),
                'created_at': (datetime.now() - timedelta(days=np.random.randint(1, 30))).isoformat(),
                'updated_at': (datetime.now() - timedelta(days=np.random.randint(1, 7))).isoformat()
            })

        # Generate dummy business hours
        business_hours = []
        for i in range(7):
            business_hours.append({
                'business_hour_id': f'hour_{i+1}',
                'shop_id': self.shop_id,
                'day_of_week': i,
                'open_time': '09:00:00',
                'close_time': '21:00:00' if i < 6 else '18:00:00',
                'is_closed': False
            })

        # Generate dummy time off requests
        time_off_requests = []
        for i in range(5):  # 5 time off requests
            staff_id = np.random.choice([s['staff_id'] for s in staff_members])
            start_date_off = datetime.now() + timedelta(days=np.random.randint(1, 60))
            end_date_off = start_date_off + timedelta(days=np.random.randint(1, 5))

            time_off_requests.append({
                'request_id': f'request_{i+1}',
                'staff_id': staff_id,
                'start_datetime': start_date_off.isoformat(),
                'end_datetime': end_date_off.isoformat(),
                'reason': np.random.choice(['Vacation', 'Sick Leave', 'Personal', 'Family Emergency']),
                'status': np.random.choice(['pending', 'approved', 'denied'], p=[0.3, 0.6, 0.1]),
                'created_at': (datetime.now() - timedelta(days=np.random.randint(1, 30))).isoformat()
            })

        # Generate dummy staff availability
        staff_availability = []
        for staff in staff_members:
            for day in range(7):
                if np.random.random() > 0.2:  # 80% chance of being available
                    staff_availability.append({
                        'availability_id': str(uuid.uuid4()),
                        'staff_id': staff['staff_id'],
                        'day_of_week': day,
                        'start_time': '09:00:00',
                        'end_time': '18:00:00'
                    })

        # Generate dummy shop details
        shop_details = [{
            'shop_id': self.shop_id,
            'shop_name': 'Test Retail Store',
            'owner_id': 'owner_1',
            'email': 'owner@teststore.com',
            'phone_number': '9876543210',
            'business_contact_number': '9876543211',
            'created_at': (datetime.now() - timedelta(days=365)).isoformat(),
            'updated_at': datetime.now().isoformat()
        }]

        return {
            'shifts': shifts,
            'staff_members': staff_members,
            'staff_availability': staff_availability,
            'schedules': schedules,
            'business_hours': business_hours,
            'time_off_requests': time_off_requests,
            'roles': roles,
            'staff_roles': staff_roles,
            'shop_details': shop_details,
            'analysis_period': f"{start_date.date()} to {end_date.date()}"
        }

    def fetch_comprehensive_data(self, days_back: int = 90) -> Dict:
        """Fetch comprehensive data - using dummy data for testing."""
        print("Using dummy data for testing...")
        return self.generate_dummy_data(days_back)

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

        # Analyze historical patterns around festivals (deterministic based on actual shift data)
        for date, name in self.india_holidays.items():
            if (today - timedelta(days=365)) <= date <= today:
                festival_period = shifts_df[
                    (shifts_df['start_date'].dt.date >= (date - timedelta(days=3))) &
                    (shifts_df['start_date'].dt.date <= (date + timedelta(days=3)))
                ]

                if not festival_period.empty:
                    normal_period = shifts_df[
                        (shifts_df['start_date'].dt.date >= (date - timedelta(days=14))) &
                        (shifts_df['start_date'].dt.date <= (date - timedelta(days=7)))
                    ]

                    festival_shifts = int(len(festival_period))
                    if not normal_period.empty:
                        days_in_normal = max(1, (normal_period['start_date'].dt.date.nunique()))
                        normal_avg_per_day = len(normal_period) / days_in_normal
                        normal_avg = normal_avg_per_day * 7  # normalize to 7-day festival window
                    else:
                        normal_avg = float(festival_shifts)

                    impact = ((festival_shifts - normal_avg) / normal_avg * 100) if normal_avg > 0 else 0.0

                    festival_analysis['historical_festival_impact'][name] = {
                        'shifts_during_festival': festival_shifts,
                        'normal_period_avg': round(normal_avg, 2),
                        'impact_percentage': round(float(impact), 2)
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
                    monthly_hours = 160
                    if 'max_hours_per_week' in staff:
                        monthly_hours = staff['max_hours_per_week'] * 4.33

                    monthly_cost = float(staff['hourly_rate']) * float(monthly_hours)
                    staff_costs[staff.get('first_name', 'Unknown')] = round(monthly_cost, 2)
                    total_staff_cost += monthly_cost

            profit_analysis['staff_cost_analysis'] = {
                'total_monthly_labor_cost': round(total_staff_cost, 2),
                'individual_costs': staff_costs,
                'average_hourly_rate': round(float(staff_df['hourly_rate'].mean()), 2) if 'hourly_rate' in staff_df.columns else 0
            }

        # Business hours optimization
        if not business_hours_df.empty:
            profit_analysis['efficiency_improvements']['operating_hours'] = {
                'total_weekly_hours': len(business_hours_df) * 8,
                'optimization_suggestion': "Analyze customer traffic patterns to optimize opening hours"
            }

        # Shift efficiency analysis
        if not shifts_df.empty:
            if 'start_date' in shifts_df.columns:
                shifts_df['start_date'] = pd.to_datetime(shifts_df['start_date'])
                daily_shifts = shifts_df.groupby(shifts_df['start_date'].dt.date).size()

                profit_analysis['efficiency_improvements']['shift_distribution'] = {
                    'avg_shifts_per_day': round(float(daily_shifts.mean()), 2),
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
        Format your response as a structured business report with clear sections and actionable insights.
        """

        try:
            if self.gemini_client:
                response = self.gemini_client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=prompt,
                )
                return response.text
            else:
                return self._generate_mock_response(analysis_data)
        except Exception as e:
            print(f"Error with Gemini API: {e}")
            return self._generate_mock_response(analysis_data)

    def _generate_mock_response(self, analysis_data: Dict) -> str:
        """Generate mock AI response for testing when API is not available."""

        return f"""
        COMPREHENSIVE BUSINESS RECOMMENDATIONS FOR YOUR STORE

        1. PROFIT MAXIMIZATION STRATEGIES (Priority: HIGH)
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

        💰 LABOR COST OPTIMIZATION:
        - Current monthly labor cost: ₹{analysis_data['profit']['staff_cost_analysis'].get('total_monthly_labor_cost', 0)}
        - Redistribute shifts to balance workload - some staff are overworked while others are underutilized
        - Consider cross-training staff to handle multiple roles during peak times
        - Implement performance-based scheduling to maximize productivity

        📈 REVENUE ENHANCEMENT:
        - Peak days analysis shows {list(analysis_data['staffing']['peak_days'].keys())[0] if analysis_data['staffing']['peak_days'] else 'weekends'} as busiest
        - Schedule your best sales staff during peak hours
        - Consider promotional campaigns during slower days to boost revenue

        2. FESTIVAL & SEASONAL STAFF MANAGEMENT (Priority: CRITICAL)
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

        🎉 UPCOMING FESTIVALS:
        {"- " + chr(10).join([f"{f['name']} ({f['days_until']} days away)" for f in analysis_data['festivals']['upcoming_festivals'][:3]])}

        👥 STAFFING ADJUSTMENTS:
        - Increase staffing by 25-40% during festival periods based on historical data
        - Plan overtime schedules 1 week in advance
        - Arrange backup staff for emergency coverage
        - Consider hiring temporary staff for major festivals like Diwali

        3. OPERATIONAL EFFICIENCY (Priority: MEDIUM)
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

        ⚡ STAFF UTILIZATION:
        - Current staff count: {analysis_data['staffing']['total_staff']} members
        - Active staff: {analysis_data['staffing']['active_staff']}
        - Role distribution needs balancing - ensure adequate coverage for each role

        📊 SHIFT OPTIMIZATION:
        - Implement staggered shifts during peak hours
        - Use data-driven scheduling based on customer traffic patterns
        - Consider flexible shifts for part-time staff

        4. IMMEDIATE ACTION ITEMS
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

        🔥 THIS WEEK:
        - Review and balance staff workloads
        - Prepare for upcoming festivals (if any within 7 days)
        - Analyze current labor cost vs revenue ratio

        📅 THIS MONTH:
        - Implement cross-training program
        - Optimize shift patterns based on customer flow
        - Set up emergency staffing protocols

        💡 EXPECTED IMPACT:
        - Labor cost reduction: 10-15%
        - Revenue increase during festivals: 20-30%
        - Staff satisfaction improvement: 25%
        - Customer service efficiency: 20% improvement
        [NOTE: Mock response shown because Gemini API is not configured]
        """

    def generate_comprehensive_recommendations(self, shop_id: str) -> Dict:
        """Main method to generate comprehensive recommendations for a shop (test mode)."""
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

        print("Skipping database save in test mode...")

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
                values = list(utilization.values())
                if len(values) > 1:
                    max_shifts = max(values)
                    min_shifts = min(values)

                    if max_shifts > min_shifts * 2:
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
                'description': f"Monthly labor cost: ₹{staff_costs['total_monthly_labor_cost']}. Analyze if this aligns with revenue targets.",
                'deadline': (datetime.now() + timedelta(days=14)).isoformat()
            })

        return actions

    def _calculate_profit_impact_score(self, analysis: Dict) -> int:
        """Calculate potential profit impact score (0-100)."""
        score = 50

        upcoming_festivals = len(analysis['festivals']['upcoming_festivals'])
        score += min(upcoming_festivals * 5, 20)

        staffing = analysis['staffing']
        if staffing.get('shifts_per_staff'):
            utilization_values = list(staffing['shifts_per_staff'].values())
            if utilization_values:
                std_dev = float(np.std(utilization_values))
                mean_val = float(np.mean(utilization_values))
                if mean_val > 0:
                    cv = std_dev / mean_val
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

        # Add festival preparations to immediate/short-term buckets
        for festival in analysis['festivals']['upcoming_festivals']:
            if festival['days_until'] <= 3:
                timeline['immediate (1-3 days)'].append(f"Prepare for {festival['name']}")
            elif festival['days_until'] <= 14:
                timeline['short_term (1-2 weeks)'].append(f"Plan staffing for {festival['name']}")

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


def test_agent() -> Dict:
    """Run the agent with dummy data for quick testing."""
    print("=" * 60)
    print("🚀 TESTING STORE RECOMMENDATION AGENT (DUMMY DATA)")
    print("=" * 60)

    gemini_key = os.getenv('GEMINI_API_KEY')
    agent = StoreRecommendationAgent(gemini_api_key=gemini_key)
    test_shop_id = "test_shop_123"

    recommendations = agent.generate_comprehensive_recommendations(test_shop_id)

    print("\n" + "="*60)
    print("📊 ANALYSIS SUMMARY")
    print("="*60)

    summary = recommendations['analysis_summary']
    print(f"Shop ID: {recommendations['shop_id']}")
    print(f"Analysis Period: {summary['period']}")
    print(f"Profit Impact Score: {recommendations['profit_impact_score']}/100")

    print(f"\n📈 STAFFING ANALYSIS:")
    staffing = summary['staffing']
    print(f"- Total Shifts: {staffing['total_shifts']}")
    print(f"- Total Staff: {staffing['total_staff']}")
    print(f"- Active Staff: {staffing['active_staff']}")
    print(f"- Peak Days: {staffing['peak_days']}")

    print(f"\n🎉 FESTIVAL ANALYSIS:")
    festivals = summary['festivals']
    print(f"- Upcoming Festivals: {len(festivals['upcoming_festivals'])}")
    for f in festivals['upcoming_festivals'][:3]:
        print(f"  • {f['name']} in {f['days_until']} days")

    print(f"\n💰 PROFIT ANALYSIS:")
    profit = summary['profit']
    if profit['staff_cost_analysis']:
        print(f"- Monthly Labor Cost: ₹{profit['staff_cost_analysis']['total_monthly_labor_cost']}")
        print(f"- Average Hourly Rate: ₹{profit['staff_cost_analysis']['average_hourly_rate']}")

    print(f"\n⚡ IMMEDIATE ACTIONS ({len(recommendations['immediate_actions'])}):")
    for i, action in enumerate(recommendations['immediate_actions'][:5], 1):
        print(f"{i}. [{action['priority']}] {action['action']} - {action['category']}")

    print(f"\n🤖 AI RECOMMENDATIONS:")
    print("="*60)
    print(recommendations['ai_recommendations'])

    return recommendations


if __name__ == "__main__":
    print("🔧 STORE RECOMMENDATION AGENT - DUMMY TEST MODE")
    print("="*50)
    print("Uses generated dummy data. Set GEMINI_API_KEY to enable Gemini outputs.")
    print("="*50)

    _ = test_agent()


