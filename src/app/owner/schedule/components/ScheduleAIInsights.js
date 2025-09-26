'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/app/utils/supabase';

export default function ScheduleAIInsights({ user }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchScheduleInsights = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get user's businesses
      const { data: userBusinesses } = await supabase
        .from('businesses')
        .select('business_id')
        .eq('owner_email', user.email);

      if (!userBusinesses || userBusinesses.length === 0) {
        setInsights({ alerts: [], insights: 'No business data available' });
        setLoading(false);
        return;
      }

      const businessIds = userBusinesses.map(b => b.business_id);

      // Call AI insights API
      const tryHosts = [
        process.env.NEXT_PUBLIC_PY_API_URL,
        'http://127.0.0.1:5000',
        'http://localhost:5000'
      ].filter(Boolean);

      let insightsData = null;
      let lastErr = null;

      for (const host of tryHosts) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort('timeout'), 15000);
          
          const resp = await fetch(`${host}/api/insights/quick`, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              metadata: {
                business_ids: businessIds,
                owner_email: user.email,
                generated_at: new Date().toISOString()
              }
            }),
            signal: controller.signal
          });
          
          clearTimeout(timer);
          
          if (resp.ok) {
            insightsData = await resp.json();
            break;
          } else {
            lastErr = new Error(`Insights API responded ${resp.status} at ${host}`);
          }
        } catch (e) {
          if (e && e.name === 'AbortError') {
            lastErr = new Error(`Request timed out at ${host}`);
          } else {
            lastErr = e;
          }
        }
      }

      if (!insightsData) {
        throw lastErr || new Error('Failed to reach insights API');
      }

      setInsights(insightsData);
    } catch (e) {
      console.error('Failed to fetch schedule insights:', e);
      setError(e.message);
      setInsights({ alerts: [], insights: 'Failed to load insights' });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchScheduleInsights();
    }
  }, [user, fetchScheduleInsights]);


  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'festival':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'staffing':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      case 'workload':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      case 'inventory':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-orange-100 text-orange-800';
      case 'low': return 'bg-slate-100 text-slate-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-slate-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-slate-200 rounded"></div>
            <div className="h-20 bg-slate-200 rounded"></div>
            <div className="h-20 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-2">⚠️ Failed to load insights</div>
        <p className="text-sm text-slate-500 mb-4">{error}</p>
        <button 
          onClick={fetchScheduleInsights}
          className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const alerts = insights?.alerts || [];
  const aiSummary = insights?.insights || 'No insights available';

  return (
    <div>
      {/* Header with refresh button */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {alerts.length} insights available
          </span>
        </div>
        <button 
          onClick={fetchScheduleInsights}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          Refresh
        </button>
      </div>

      {alerts.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-green-600 mb-2">✅ All Good!</div>
          <p className="text-sm text-slate-500">No immediate scheduling alerts for the next 7 days</p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert, index) => (
            <div 
              key={index}
              className="p-6 bg-slate-50 rounded-xl shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-blue-100">
                    {getTypeIcon(alert.type)}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800">{alert.title}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ml-2 ${getPriorityBadge(alert.priority)}`}>
                      {alert.priority.toUpperCase()} PRIORITY
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-slate-700 mb-4">{alert.message}</p>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">{alert.date}</span>
                <div className="flex space-x-2">
                  <button className="px-4 py-1.5 text-sm font-medium text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer">
                    Apply Suggestion
                  </button>
                  <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                    <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {aiSummary && aiSummary !== 'No insights available' && (
        <div className="mt-6 pt-4 border-t border-slate-200">
          <h4 className="text-sm font-semibold text-slate-900 mb-2">AI Summary</h4>
          <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg">
            {aiSummary.length > 300 ? `${aiSummary.substring(0, 300)}...` : aiSummary}
          </div>
        </div>
      )}
    </div>
  );
}
