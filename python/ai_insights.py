#!/usr/bin/env python3
"""
AI Insights Generator for EasyShift
Generates top 2-3 relevant insights for today's date including:
- Order scheduling recommendations
- Strong manpower requirements
- Upcoming festival preparations
- Business-specific insights
"""

import os
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from supabase import create_client
from dotenv import load_dotenv
import holidays

load_dotenv()

class AIInsightsGenerator:
    def __init__(self, supabase_url: str, supabase_key: str):
        """Initialize the AI insights generator."""
        self.supabase = create_client(supabase_url, supabase_key)
        
        # Get Indian holidays for festival planning
        self.india_holidays = holidays.India(years=[2024, 2025])
        
        # Business type specific insights
        self.business_insights = {
            "electronics": {
                "peak_seasons": ["Diwali", "Christmas", "New Year", "Back to School"],
                "order_patterns": "High-value orders increase during festivals",
                "manpower_needs": "More packer_fragile and QC staff needed for delicate items"
            },
            "grocery": {
                "peak_seasons": ["Diwali", "Holi", "Eid", "Christmas"],
                "order_patterns": "Bulk orders increase before festivals",
                "manpower_needs": "More picker and delivery staff for bulk orders"
            },
            "restaurant": {
                "peak_seasons": ["Diwali", "Christmas", "Valentine's Day", "Weekends"],
                "order_patterns": "Delivery orders spike during festivals",
                "manpower_needs": "More floor_exec and delivery staff during peak times"
            },
            "pharmacy": {
                "peak_seasons": ["Monsoon", "Winter", "Festival seasons"],
                "order_patterns": "Medicine orders increase during seasonal changes",
                "manpower_needs": "More picker and QC staff for accurate medicine handling"
            },
            "fashion": {
                "peak_seasons": ["Diwali", "Wedding season", "Festival seasons"],
                "order_patterns": "Fashion orders peak before major festivals",
                "manpower_needs": "More floor_exec staff for customer assistance"
            }
        }
    
    def get_todays_insights(self, business_id: str) -> List[Dict]:
        """Generate top 2-3 insights for today's date."""
        try:
            # Get business information
            business_response = self.supabase.table('businesses').select('business_type, shop_name').eq('business_id', business_id).execute()
            business_data = business_response.data[0] if business_response.data else {}
            business_type = business_data.get('business_type', 'general').lower()
            
            # Get today's date info
            today = datetime.now().date()
            day_name = today.strftime("%A")
            is_weekend = day_name in ["Saturday", "Sunday"]
            
            insights = []
            
            # 1. Festival/Seasonal Insight
            festival_insight = self._get_festival_insight(today, business_type)
            if festival_insight:
                insights.append(festival_insight)
            
            # 2. Order Scheduling Insight
            order_insight = self._get_order_scheduling_insight(today, day_name, is_weekend, business_type)
            if order_insight:
                insights.append(order_insight)
            
            # 3. Manpower/Staffing Insight
            manpower_insight = self._get_manpower_insight(today, day_name, is_weekend, business_type)
            if manpower_insight:
                insights.append(manpower_insight)
            
            # Return top 3 insights
            return insights[:3]
            
        except Exception as e:
            print(f"Error generating insights: {e}")
            return [{
                "type": "error",
                "title": "Unable to generate insights",
                "message": "Please check your business configuration",
                "priority": "low",
                "icon": "⚠️"
            }]
    
    def _get_festival_insight(self, today: datetime.date, business_type: str) -> Optional[Dict]:
        """Get festival-related insights."""
        # Check for upcoming festivals in next 30 days
        upcoming_festivals = []
        for date, name in self.india_holidays.items():
            if today <= date <= (today + timedelta(days=30)):
                days_until = (date - today).days
                upcoming_festivals.append((name, days_until, date))
        
        if not upcoming_festivals:
            return None
        
        # Get the nearest festival
        nearest_festival = min(upcoming_festivals, key=lambda x: x[1])
        festival_name, days_until, festival_date = nearest_festival
        
        business_info = self.business_insights.get(business_type, {})
        peak_seasons = business_info.get("peak_seasons", [])
        
        # Check if this festival is relevant for the business
        is_relevant = any(season.lower() in festival_name.lower() or festival_name.lower() in season.lower() 
                         for season in peak_seasons)
        
        if days_until <= 7:
            priority = "high"
            icon = "🚨"
            action = "URGENT: Start preparations now!"
        elif days_until <= 14:
            priority = "medium"
            icon = "📅"
            action = "Plan ahead for increased demand"
        else:
            priority = "low"
            icon = "📆"
            action = "Prepare for upcoming season"
        
        if is_relevant:
            return {
                "type": "festival",
                "title": f"{festival_name} Preparation",
                "message": f"{festival_name} is in {days_until} days. {action}",
                "priority": priority,
                "icon": icon,
                "details": f"Festival date: {festival_date.strftime('%B %d, %Y')}",
                "recommendation": business_info.get("manpower_needs", "Increase staff for peak demand")
            }
        
        return None
    
    def _get_order_scheduling_insight(self, today: datetime.date, day_name: str, is_weekend: bool, business_type: str) -> Optional[Dict]:
        """Get order scheduling insights."""
        business_info = self.business_insights.get(business_type, {})
        order_patterns = business_info.get("order_patterns", "")
        
        # Weekend insights
        if is_weekend:
            if business_type in ["restaurant", "cafe"]:
                return {
                    "type": "order_scheduling",
                    "title": "Weekend Rush Preparation",
                    "message": "Weekends are peak time for restaurants. Ensure adequate delivery staff.",
                    "priority": "high",
                    "icon": "🍽️",
                    "details": "Saturday & Sunday typically see 40% more orders",
                    "recommendation": "Schedule extra delivery and floor staff for weekend shifts"
                }
            elif business_type in ["fashion", "electronics"]:
                return {
                    "type": "order_scheduling",
                    "title": "Weekend Shopping Peak",
                    "message": "Weekend footfall increases significantly. Prepare for higher order volumes.",
                    "priority": "medium",
                    "icon": "🛍️",
                    "details": "Weekend orders typically 30% higher than weekdays",
                    "recommendation": "Ensure sufficient cashier and floor staff coverage"
                }
        
        # Weekday insights
        else:
            if business_type in ["grocery", "pharmacy"]:
                return {
                    "type": "order_scheduling",
                    "title": "Weekday Order Optimization",
                    "message": "Weekdays are ideal for bulk orders and inventory management.",
                    "priority": "medium",
                    "icon": "📦",
                    "details": "Best time for large orders and stock replenishment",
                    "recommendation": "Focus on picker and QC staff for accurate order fulfillment"
                }
            elif business_type in ["electronics"]:
                return {
                    "type": "order_scheduling",
                    "title": "Technical Order Processing",
                    "message": "Weekdays are better for complex electronics orders requiring careful handling.",
                    "priority": "medium",
                    "icon": "🔧",
                    "details": "Complex orders need more time and attention",
                    "recommendation": "Ensure packer_fragile and QC staff are available"
                }
        
        return None
    
    def _get_manpower_insight(self, today: datetime.date, day_name: str, is_weekend: bool, business_type: str) -> Optional[Dict]:
        """Get manpower/staffing insights."""
        business_info = self.business_insights.get(business_type, {})
        manpower_needs = business_info.get("manpower_needs", "")
        
        # Check current month for seasonal insights
        current_month = today.month
        current_season = self._get_season(current_month)
        
        # Seasonal manpower insights
        if current_season == "festival" and business_type in ["electronics", "fashion", "grocery"]:
            return {
                "type": "manpower",
                "title": "Festival Season Staffing",
                "message": "Festival season requires strong manpower. Consider hiring temporary staff.",
                "priority": "high",
                "icon": "👥",
                "details": "Festival seasons typically require 50% more staff",
                "recommendation": "Hire temporary staff or increase existing staff hours"
            }
        
        # Weekend staffing insights
        if is_weekend:
            if business_type in ["restaurant", "cafe"]:
                return {
                    "type": "manpower",
                    "title": "Weekend Staffing Boost",
                    "message": "Weekends require strong delivery and service staff.",
                    "priority": "high",
                    "icon": "🚀",
                    "details": "Weekend demand requires 30% more staff",
                    "recommendation": "Schedule extra delivery and floor staff"
                }
        
        # General business-specific insights
        if business_type == "electronics":
            return {
                "type": "manpower",
                "title": "Technical Staff Requirements",
                "message": "Electronics business needs skilled packer_fragile and QC staff.",
                "priority": "medium",
                "icon": "⚡",
                "details": "Delicate items require careful handling",
                "recommendation": "Ensure trained staff for fragile item handling"
            }
        elif business_type == "pharmacy":
            return {
                "type": "manpower",
                "title": "Accuracy-Critical Staffing",
                "message": "Pharmacy requires highly accurate picker and QC staff.",
                "priority": "high",
                "icon": "💊",
                "details": "Medicine orders require zero-error handling",
                "recommendation": "Double-check all medicine orders with QC staff"
            }
        
        return None
    
    def _get_season(self, month: int) -> str:
        """Get current season based on month."""
        if month in [10, 11, 12, 1]:  # Oct, Nov, Dec, Jan
            return "festival"
        elif month in [2, 3, 4]:  # Feb, Mar, Apr
            return "spring"
        elif month in [5, 6, 7, 8, 9]:  # May to Sep
            return "monsoon"
        else:
            return "general"

def get_ai_insights(business_id: str, supabase_url: str, supabase_key: str) -> List[Dict]:
    """Main function to get AI insights for a business."""
    generator = AIInsightsGenerator(supabase_url, supabase_key)
    return generator.get_todays_insights(business_id)

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Generate AI insights for a business')
    parser.add_argument('--business-id', required=True, help='Business ID')
    parser.add_argument('--json', action='store_true', help='Output as JSON')
    
    args = parser.parse_args()
    
    insights = get_ai_insights(
        args.business_id,
        os.getenv('SUPABASE_URL'),
        os.getenv('SUPABASE_KEY')
    )
    
    if args.json:
        print(json.dumps(insights, indent=2, default=str))
    else:
        print("🤖 AI Insights for Today")
        print("=" * 40)
        for i, insight in enumerate(insights, 1):
            print(f"\n{i}. {insight['icon']} {insight['title']}")
            print(f"   {insight['message']}")
            if 'details' in insight:
                print(f"   📋 {insight['details']}")
            if 'recommendation' in insight:
                print(f"   💡 {insight['recommendation']}")
            print(f"   Priority: {insight['priority'].upper()}")
