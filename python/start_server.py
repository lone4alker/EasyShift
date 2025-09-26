#!/usr/bin/env python3
"""
EasyShift AI Services Startup Script
Unified Flask server for recommendations and insights
"""

import os
import sys
from pathlib import Path

# Add the python directory to the path
python_dir = Path(__file__).parent
sys.path.insert(0, str(python_dir))

# Import and start the unified server
from main import create_unified_flask_api

if __name__ == "__main__":
    print("🚀 Starting EasyShift AI Services...")
    print("=" * 50)
    print("📊 Recommendations API: /api/recommendations")
    print("🔮 Insights API: /api/insights")
    print("⚡ Quick Insights: /api/insights/quick")
    print("❤️  Health Check: /api/health")
    print("=" * 50)
    print("🌐 Server running on http://127.0.0.1:5000")
    print("Press Ctrl+C to stop the server")
    print("=" * 50)
    
    app = create_unified_flask_api()
    app.run(host='127.0.0.1', port=5000, debug=True)
