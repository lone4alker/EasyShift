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
from flask import Flask, request, jsonify
from flask_cors import CORS

load_dotenv()

# Import classes from other files
from reccomend import StoreRecommendationAgent
from alert import AIInsightsGenerator

def create_unified_flask_api():
    """Unified Flask API that handles both recommendations and insights."""
    app = Flask(__name__)
    CORS(app)

    # ===== RECOMMENDATIONS API =====
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

    # ===== INSIGHTS API =====
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

    # ===== HEALTH CHECK =====
    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'services': {
                'recommendations': 'active',
                'insights': 'active'
            }
        })

    return app

if __name__ == "__main__":
    app = create_unified_flask_api()
    print("🚀 Starting EasyShift AI Services...")
    print("📊 Recommendations API: /api/recommendations")
    print("🔮 Insights API: /api/insights")
    print("⚡ Quick Insights: /api/insights/quick")
    print("❤️  Health Check: /api/health")
    print("🌐 Server running on http://127.0.0.1:5000")
    app.run(host='127.0.0.1', port=5000, debug=True)
