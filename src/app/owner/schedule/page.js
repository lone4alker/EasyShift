'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/app/utils/supabase';
import { useT } from '@/app/utils/translations';
import LanguageSwitcher from '../../../../components/ui/LanguageSwitcher';
import ScheduleAIInsights from './components/ScheduleAIInsights';

export default function ScheduleDashboardPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ownerData, setOwnerData] = useState(null);
  const router = useRouter();
  const [scheduleView, setScheduleView] = useState('List View');
  const [scheduleShifts, setScheduleShifts] = useState([]);
  
  const [scheduleData, setScheduleData] = useState({
    totalShifts: 0,
    pendingApproval: 0,
    totalHours: 30,
    estPayroll: 450,
    overtimeHours: 2,
    staffBreakdown: [
      { name: 'Sarah Johnson', role: 'Barista', rate: 15.5, hours: 16 },
      { name: 'Mike Chen', role: 'Cashier', rate: 14, hours: 14 },
    ],
  });

  // State for handling request updates
  const [updatingRequestId, setUpdatingRequestId] = useState(null);
  const t = useT();

  /**
   * Fetches data from staff_members and time_off_requests tables based on your schema
   */
  const fetchScheduleData = async (businessId) => {
    console.log('Attempting to fetch schedule and staff data for business ID:', businessId);
    if (!businessId) {
      console.error("Business ID is missing. Cannot fetch schedule data.");
      return;
    }
    
    try {
      // 1. Fetch Staff Members - using correct column names from your schema
      const { data: members, error: staffError } = await supabase
        .from('staff_members')
        .select('staff_id, first_name, last_name, role, business_id')
        .eq('business_id', businessId);
        
      if (staffError) throw staffError;

      // Create a map for quick staff lookup using staff_id
      const staffMap = members.reduce((acc, member) => {
        acc[member.staff_id] = { 
          name: `${member.first_name} ${member.last_name}`,
          role: member.role 
        };
        return acc;
      }, {});
      console.log('Fetched staff map:', staffMap);

      // 2. Fetch Time Off Requests - using correct table and column names
      // First try to get all time off requests to see what's available
      console.log('Staff IDs to filter by:', Object.keys(staffMap));
      
      const { data: requests, error: requestsError } = await supabase
        .from('time_off_requests')
        .select('request_id, staff_id, start_datetime, end_datetime, status, reason, created_at')
        .in('staff_id', Object.keys(staffMap)) // Use .in() instead of .eq() for array filtering
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;
      console.log('Fetched time_off_requests:', requests);
      
      // 3. Transform and Merge Data
      const formattedShifts = requests.map(request => {
        const staffInfo = staffMap[request.staff_id] || { 
          name: 'Unknown Staff', 
          role: 'N/A' 
        };
        
        return {
          id: request.request_id,
          name: staffInfo.name,
          role: staffInfo.role,
          startTime: request.start_datetime,
          endTime: request.end_datetime,
          status: request.status || 'pending',
          reason: request.reason || 'Time off request',
          createdAt: request.created_at
        };
      });
      
      setScheduleShifts(formattedShifts);
      console.log('Successfully fetched and formatted requests:', formattedShifts);
      
      // Update KPIs based on fetched data
      const pending = formattedShifts.filter(s => s.status?.toLowerCase() === 'pending').length;
      setScheduleData(prev => ({
          ...prev,
          totalShifts: formattedShifts.length,
          pendingApproval: pending,
      }));

    } catch (err) {
      console.error('Error fetching schedule data:', err);
      
      // Fallback: try a simpler query to see what data exists
      try {
        console.log('Trying fallback queries...');
        
        // Check if we have any staff members at all
        const { data: allStaff, error: allStaffError } = await supabase
          .from('staff_members')
          .select('*')
          .eq('business_id', businessId);
          
        console.log('All staff for business:', allStaff, 'Error:', allStaffError);
        
        // Check if we have any time off requests at all
        const { data: allRequests, error: allRequestsError } = await supabase
          .from('time_off_requests')
          .select('*');
          
        console.log('All time off requests:', allRequests, 'Error:', allRequestsError);
        
      } catch (fallbackErr) {
        console.error('Fallback queries also failed:', fallbackErr);
      }
    }
  };

  const fetchOwnerData = useCallback(async (user) => {
    console.log('Fetching owner data for user ID:', user.id);
    let businessData = null;
    
    // Try different approaches to find the business - using correct column names
    const attempts = [
      () => supabase.from('businesses').select('*').eq('owner_id', user.id).single(),
      () => supabase.from('businesses').select('*').eq('business_id', user.id).single(),
      () => supabase.from('businesses').select('*').eq('owner_email', user.email).single()
    ];

    for (let i = 0; i < attempts.length; i++) {
      try {
        const { data: result, error } = await attempts[i]();
        if (!error && result) {
          businessData = result;
          break;
        }
      } catch (err) {
        console.log(`Attempt ${i + 1} exception:`, err);
      }
    }
    
    if (businessData) {
      setOwnerData(businessData);
      // Use the correct business ID column
      await fetchScheduleData(businessData.business_id); 
    } else {
      console.log('No business data found for user');
    }
  }, []);

  const checkAuth = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/owner/login');
    } else {
      setUser(user);
      await fetchOwnerData(user); 
    }
    setLoading(false);
  }, [router, fetchOwnerData]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      router.push('/owner/login');
    }
  };

  const getInitials = name => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };
  
  const formatTime = (isoTime) => {
    if (!isoTime) return 'N/A';
    try {
      return new Date(isoTime).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } catch (e) {
      return 'N/A';
    }
  };

  const formatDate = (isoTime) => {
    if (!isoTime) return 'N/A';
    try {
      return new Date(isoTime).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (e) {
      return 'N/A';
    }
  };

  const updateRequestStatus = async (requestId, status) => {
    setUpdatingRequestId(requestId);
    try {
      const { error } = await supabase
        .from('time_off_requests')
        .update({ status })
        .eq('request_id', requestId);

      if (error) throw error;

      // Update local state
      setScheduleShifts(prev => 
        prev.map(shift => 
          shift.id === requestId 
            ? { ...shift, status }
            : shift
        )
      );

      // Update pending count
      setScheduleData(prev => ({
        ...prev,
        pendingApproval: status === 'approved' || status === 'rejected' 
          ? prev.pendingApproval - 1 
          : prev.pendingApproval
      }));

    } catch (error) {
      console.error('Error updating request status:', error);
    } finally {
      setUpdatingRequestId(null);
    }
  };

  const approveAllPendingRequests = async () => {
    setUpdatingRequestId('bulk');
    try {
      const pendingRequests = scheduleShifts.filter(shift => shift.status?.toLowerCase() === 'pending');
      
      for (const request of pendingRequests) {
        await updateRequestStatus(request.id, 'approved');
      }
    } catch (error) {
      console.error('Error approving all requests:', error);
    } finally {
      setUpdatingRequestId(null);
    }
  };

  const renderScheduleSubView = () => {
    switch (scheduleView) {
      case 'Calendar View':
        return (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-slate-800">Schedule Calendar</h3>
              <div className="flex items-center space-x-4">
                <select className="rounded-lg border-slate-300 text-sm px-3 py-2 bg-white">
                  <option>All Staff</option>
                </select>
                <select className="rounded-lg border-slate-300 text-sm px-3 py-2 bg-white">
                  <option>All Roles</option>
                </select>
                <div className="flex items-center space-x-2">
                  <button className="text-slate-500 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-colors">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                  </button>
                  <span className="text-sm font-medium text-slate-700">Sep 21 - Sep 27</span>
                  <button className="text-slate-500 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-colors">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                  </button>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="grid grid-cols-7 gap-2 text-center mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                  <div key={day} className="p-3 bg-white rounded-lg shadow-sm">
                    <div className="text-sm font-semibold text-slate-500">{day}</div>
                    <div className="text-lg font-bold text-slate-800">{21 + index}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2 min-h-48">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-4 bg-white border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-400 text-sm hover:border-blue-300 transition-colors">
                    No shifts
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'List View':
        const pendingShifts = scheduleShifts.filter(shift => shift.status?.toLowerCase() === 'pending').length;
        
        return (
          <div>
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-semibold text-slate-800">Staff Time Off Requests</h3>
                <p className="text-sm text-slate-600 mt-1">Review and approve time-off requests from your staff</p>
              </div>
              <div className="flex items-center space-x-3">
                <select className="rounded-lg border-slate-300 text-sm px-3 py-2 bg-white">
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
                <select className="rounded-lg border-slate-300 text-sm px-3 py-2 bg-white">
                  <option value="">All Staff</option>
                </select>
              </div>
            </div>

            {/* Pending Requests Alert */}
            {pendingShifts > 0 && (
              <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 text-yellow-800 px-6 py-4 rounded-xl mb-6 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-yellow-200 rounded-lg">
                    <svg className="w-4 h-4 text-yellow-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  </div>
                  <span className="font-medium">{pendingShifts} time off request(s) pending your approval</span>
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={approveAllPendingRequests}
                    disabled={updatingRequestId === 'bulk'}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 cursor-pointer flex items-center space-x-2"
                  >
                    {updatingRequestId === 'bulk' && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    )}
                    <span>Approve All</span>
                  </button>
                  <button className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 cursor-pointer">
                    Review All
                  </button>
                </div>
              </div>
            )}

            {/* Staff Time Off Requests List */}
            <div className="space-y-4">
              {scheduleShifts.length > 0 ? (
                scheduleShifts.map(request => {
                  const startTime = new Date(request.startTime);
                  const endTime = new Date(request.endTime);
                  const durationHours = ((endTime - startTime) / (1000 * 60 * 60)).toFixed(1);
                  const requestDate = formatDate(request.startTime);
                  
                  return (
                    <div key={request.id} className="p-6 bg-slate-50 rounded-xl border border-slate-200 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          {/* Staff Avatar */}
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                            {getInitials(request.name)}
                          </div>
                          
                          {/* Request Details */}
                          <div>
                            <div className="flex items-center space-x-3">
                              <h4 className="font-semibold text-slate-900">{request.name}</h4>
                              <span className="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded-full">
                                {request.role}
                              </span>
                            </div>
                            <div className="text-sm text-slate-600 mt-1">
                              <span className="font-medium">{requestDate}</span> • {formatTime(request.startTime)} - {formatTime(request.endTime)} • {durationHours}h
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              {request.reason} • Submitted {formatDate(request.createdAt)}
                            </div>
                          </div>
                        </div>
                        
                        {/* Status and Actions */}
                        <div className="flex items-center space-x-3">
                          {/* Status Badge */}
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            request.status?.toLowerCase() === 'pending'
                              ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                              : request.status?.toLowerCase() === 'approved'
                              ? 'bg-green-100 text-green-800 border border-green-200'
                              : request.status?.toLowerCase() === 'rejected'
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : 'bg-green-100 text-green-800 border border-green-200'
                          }`}>
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d={
                                request.status?.toLowerCase() === 'pending'
                                  ? "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z"
                                  : request.status?.toLowerCase() === 'rejected'
                                  ? "M6 18L18 6M6 6l12 12"
                                  : "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              } />
                            </svg>
                            {request.status || 'Approved'}
                          </span>
                          
                          {/* Action Buttons - Only show for pending requests */}
                          {request.status?.toLowerCase() === 'pending' && (
                            <div className="flex space-x-2">
                              <button 
                                onClick={() => updateRequestStatus(request.id, 'approved')}
                                disabled={updatingRequestId === request.id}
                                className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 border border-green-300 rounded-lg hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center space-x-1"
                              >
                                {updatingRequestId === request.id ? (
                                  <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-700"></div>
                                    <span>Processing...</span>
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                    </svg>
                                    <span>Approve</span>
                                  </>
                                )}
                              </button>
                              <button 
                                onClick={() => updateRequestStatus(request.id, 'rejected')}
                                disabled={updatingRequestId === request.id}
                                className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 border border-red-300 rounded-lg hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center space-x-1"
                              >
                                {updatingRequestId === request.id ? (
                                  <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-700"></div>
                                    <span>Processing...</span>
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    <span>Reject</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                          
                          {/* More Options Menu */}
                          <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center p-12 bg-white rounded-xl text-slate-500 border-dashed border-2">
                  {loading ? (
                    <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                      <p>Loading time off requests...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <svg className="w-12 h-12 text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <p className="text-lg font-medium mb-2">No time off requests found</p>
                      <p className="text-sm">Your staff haven&apos;t submitted any time off requests yet, or check your database connection.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Summary Footer */}
            {scheduleShifts.length > 0 && (
              <div className="mt-6 p-4 bg-slate-100 rounded-lg text-center text-sm text-slate-600">
                Showing {scheduleShifts.length} time off request(s) • {pendingShifts} pending approval • {scheduleShifts.length - pendingShifts} processed
              </div>
            )}
          </div>
        );

      case 'Payroll':
        return (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-slate-800">Payroll Summary</h3>
              <button className="flex items-center space-x-2 py-2 px-4 rounded-lg border-2 border-slate-300 text-slate-700 hover:border-blue-300 hover:text-blue-600 transition-all duration-200 cursor-pointer">
                <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                <span className="text-sm">Export Report</span>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl text-center border border-blue-200">
                <div className="text-3xl font-bold text-blue-800">${(scheduleData.staffBreakdown[0].hours * scheduleData.staffBreakdown[0].rate + scheduleData.staffBreakdown[1].hours * scheduleData.staffBreakdown[1].rate).toFixed(2)}</div>
                <div className="text-sm text-blue-700 mt-1 font-medium">Total Payroll</div>
              </div>
              <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl text-center border border-green-200">
                <div className="text-3xl font-bold text-green-800">{scheduleData.totalHours.toFixed(1)}h</div>
                <div className="text-sm text-green-700 mt-1 font-medium">Total Hours</div>
              </div>
              <div className="p-6 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl text-center border border-yellow-200">
                <div className="text-3xl font-bold text-yellow-800">{scheduleData.overtimeHours.toFixed(1)}h</div>
                <div className="text-sm text-yellow-700 mt-1 font-medium">Overtime Hours</div>
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-slate-800 mb-4">Staff Breakdown</h4>
              <div className="space-y-4">
                {scheduleData.staffBreakdown.map(member => (
                  <div key={member.name} className="flex justify-between items-center p-6 bg-slate-50 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                    <div>
                      <h5 className="font-semibold text-slate-900">{member.name}</h5>
                      <p className="text-sm text-slate-600">${member.rate}/hour • {member.hours.toFixed(1)} total hours</p>
                    </div>
                    <span className="font-bold text-xl text-slate-800">${(member.rate * member.hours).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'AI Insights':
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-slate-800">
          AI Recommendations {/* Replace with static text */}
        </h3>
      </div>
      {/* Dynamic AI Insights Component */}
      <ScheduleAIInsights user={user} />
    </div>
  );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-600/5 via-indigo-600/5 to-purple-600/5"></div>
        <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgb(59 130 246 / 0.1)" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Enhanced Modern Navigation */}
      <nav className="relative z-10 bg-white/70 backdrop-blur-xl border-b border-white/50 shadow-lg">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h1 className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  ShiftEasy
                </h1>
              </Link>

              {/* Main Navigation */}
              <div className="hidden md:flex items-center space-x-1">
                <Link href="/owner/dashboard" className="flex items-center px-3 py-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  </svg>
                  <span className="text-sm">Dashboard</span>
                </Link>
                
                <Link href="/owner/staff-management" className="flex items-center px-3 py-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="text-sm">Staff Management</span>
                </Link>
                
                <div className="flex items-center px-3 py-2 text-blue-600 bg-blue-100 rounded-lg font-medium">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 8a4 4 0 11-8 0 4 4 0 018 0zm0 0c0 1.5 1 3 4 3s4-1.5 4-3" />
                  </svg>
                  <span className="text-sm">Schedule</span>
                </div>

                <Link href="/owner/analytics" className="flex items-center px-3 py-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span className="text-sm">Analytics</span>
                </Link>
              </div>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-4">
              {/* User Info */}
              <div className="flex items-center space-x-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-slate-800">{ownerData?.owner_full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || 'Admin User'}</p>
                  <p className="text-xs text-slate-500">Owner</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                  title="Sign Out"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Breadcrumb Navigation */}
      <div className="relative z-10 container mx-auto px-6 py-4">
        <nav className="flex items-center space-x-2 text-sm">
          <Link href="/" className="text-slate-500 hover:text-blue-600 transition-colors duration-200 flex items-center">
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            <span className="text-xs">Home</span>
          </Link>
          <span className="text-slate-400">/</span>
          <Link href="/owner/dashboard" className="text-slate-500 hover:text-blue-600 transition-colors duration-200">
            Owner Dashboard
          </Link>
          <span className="text-slate-400">/</span>
          <span className="text-slate-700 font-medium">Schedule</span>
        </nav>
      </div>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-6 pb-8">
        {/* Header Section */}
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-8 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5a2.25 2.25 0 002.25-2.25m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zM14.25 15h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zM16.5 15h.008v.008H16.5V15zm0 2.25h.008v.008H16.5v-.008z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800 mb-1">Schedule Dashboard</h2>
                <p className="text-slate-600 text-xs">Manage and optimize your staff schedules</p>
                <div className="flex items-center mt-3 space-x-3">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {scheduleData.totalShifts} Requests This Week
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    {scheduleData.pendingApproval} Pending Approval
                  </span>
                </div>
              </div>
            </div>
            <div className="flex space-x-3">
              <button className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
                <span className="text-sm">Generate AI Schedule</span>
              </button>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200/50 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900 mb-1">{scheduleData.totalShifts}</p>
              <p className="text-sm font-medium text-slate-600">Time Off Requests</p>
              <p className="text-xs text-green-600 mt-1">↗ This week</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200/50 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-100 rounded-xl">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900 mb-1">{scheduleData.pendingApproval}</p>
              <p className="text-sm font-medium text-slate-600">Pending Approval</p>
              <p className="text-xs text-yellow-600 mt-1">↗ Requires action</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200/50 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900 mb-1">{scheduleData.totalHours.toFixed(1)}</p>
              <p className="text-sm font-medium text-slate-600">Total Hours</p>
              <p className="text-xs text-green-600 mt-1">↗ Scheduled</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200/50 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-xl">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900 mb-1">${scheduleData.estPayroll.toFixed(0)}</p>
              <p className="text-sm font-medium text-slate-600">Est. Payroll</p>
              <p className="text-xs text-blue-600 mt-1">↗ Weekly estimate</p>
            </div>
          </div>
        </div>

        {/* Schedule View Tabs */}
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 mb-8">
          <div className="border-b border-slate-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {['Calendar View', 'List View', 'Payroll', 'AI Insights'].map(view => (
                <button
                  key={view}
                  onClick={() => setScheduleView(view)}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer ${
                    scheduleView === view
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {view}
                </button>
              ))}
            </nav>
          </div>
          {/* Render sub-view */}
          <div className="p-6">
            {renderScheduleSubView()}
          </div>
        </div>
      </div>
    </div>
  );
}