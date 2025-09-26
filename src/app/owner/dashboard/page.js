'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/app/utils/supabase';
// import OwnerNavbar from '../../../../components/ui/OwnerNavbar';

export default function OwnerDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ownerData, setOwnerData] = useState(null);
  const [stats, setStats] = useState({
    totalStaff: 0,
    activeStaff: 0,
    todaysAttendance: 0,
    monthlyRevenue: 0
  });
  const [businessId, setBusinessId] = useState(null);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const fetchOwnerData = async (user) => {
    console.log('Fetching owner data for user ID:', user.id);
    
    // Try to fetch all business records first to debug
    try {
      const { data: allBusinesses, error: listError } = await supabase
        .from('businesses')
        .select('*')
        .limit(5);
      
      console.log('All businesses (first 5):', allBusinesses);
      console.log('List error:', listError);
    } catch (err) {
      console.log('Error fetching businesses list:', err);
    }

    // Try multiple approaches to find the owner data
    const attempts = [
      // Attempt 1: owner_id field
      () => supabase.from('businesses').select('*').eq('owner_id', user.id).single(),
      // Attempt 2: id field
      () => supabase.from('businesses').select('*').eq('id', user.id).single(),
      // Attempt 3: user_id field (common alternative)
      () => supabase.from('businesses').select('*').eq('user_id', user.id).single(),
      // Attempt 4: Get first business record for this user's email
      () => supabase.from('businesses').select('*').eq('owner_email', user.email).single()
    ];

    for (let i = 0; i < attempts.length; i++) {
      try {
        const { data: businessData, error } = await attempts[i]();
        console.log(`Attempt ${i + 1} result:`, { data: businessData, error });
        
        if (!error && businessData) {
          console.log('Successfully found business data:', businessData);
          setOwnerData(businessData);
          setBusinessId(businessData.id);
          return;
        }
      } catch (err) {
        console.log(`Attempt ${i + 1} exception:`, err);
      }
    }
    
    console.log('No business data found for user');
  };

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/owner/login');
    } else {
      setUser(user);
      await fetchOwnerData(user);
    }
    setLoading(false);
  };

  const loadDashboardData = async () => {
    if (!user) {
      console.log('No user found, skipping dashboard data load');
      return;
    }
    
    try {
      console.log('Loading dashboard data for user:', user.id);
      
      // Step 1: Get all business IDs owned by the current user
      const { data: userBusinesses, error: businessError } = await supabase
        .from('businesses')
        .select('business_id')
        .eq('owner_id', user.id);
        
      console.log('User businesses:', { data: userBusinesses, error: businessError });
      
      if (businessError) {
        console.error('Error fetching businesses:', businessError);
        setStats(prevStats => ({
          ...prevStats,
          totalStaff: 0,
          activeStaff: 0,
          todaysAttendance: 0
        }));
        return;
      }
      
      if (!userBusinesses || userBusinesses.length === 0) {
        console.log('No businesses found for user');
        setStats(prevStats => ({
          ...prevStats,
          totalStaff: 0,
          activeStaff: 0,
          todaysAttendance: 0
        }));
        return;
      }
      
      // Step 2: Extract business IDs
      const businessIds = userBusinesses.map(b => b.business_id);
      console.log('Business IDs to search for:', businessIds);
      
      // Step 3: Count staff members where business_id is in the user's business IDs
      const { count: totalStaffCount, error: totalStaffError } = await supabase
        .from('staff_members')
        .select('*', { count: 'exact', head: true })
        .in('business_id', businessIds);
        
      console.log('Total staff count:', { count: totalStaffCount, error: totalStaffError });
      
      if (totalStaffError) {
        console.error('Error counting total staff:', totalStaffError);
        setStats(prevStats => ({
          ...prevStats,
          totalStaff: 0,
          activeStaff: 0,
          todaysAttendance: 0
        }));
        return;
      }
      
      // Step 4: Count active staff members
      const { count: activeStaffCount, error: activeStaffError } = await supabase
        .from('staff_members')
        .select('*', { count: 'exact', head: true })
        .in('business_id', businessIds)
        .eq('is_active', true);
        
      console.log('Active staff count:', { count: activeStaffCount, error: activeStaffError });
      
      // Step 5: Get sample data for verification
      const { data: sampleStaff, error: sampleError } = await supabase
        .from('staff_members')
        .select('id, first_name, last_name, business_id, is_active')
        .in('business_id', businessIds)
        .limit(5);
        
      console.log('Sample staff data:', { data: sampleStaff, error: sampleError });

      const totalStaff = totalStaffCount || 0;
      const activeStaff = activeStaffCount || 0;

      setStats(prevStats => ({
        ...prevStats,
        totalStaff: totalStaff,
        activeStaff: activeStaff,
        todaysAttendance: activeStaff
      }));

      console.log('Dashboard stats updated successfully:', { 
        totalStaff, 
        activeStaff,
        businessIds,
        userId: user.id,
        sampleData: sampleStaff
      });
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setStats(prevStats => ({
        ...prevStats,
        totalStaff: 0,
        activeStaff: 0,
        todaysAttendance: 0
      }));
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      router.push('/owner/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading dashboard...</p>
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
                <div className="flex items-center px-3 py-2 text-blue-600 bg-blue-100 rounded-lg font-medium">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  </svg>
                  <span className="text-sm">Dashboard</span>
                </div>
                
                <Link href="/owner/staff-management" className="flex items-center px-3 py-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="text-sm">Staff Management</span>
                </Link>
                
                <Link href="/owner/schedule" className="flex items-center px-3 py-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 8a4 4 0 11-8 0 4 4 0 018 0zm0 0c0 1.5 1 3 4 3s4-1.5 4-3" />
                  </svg>
                  <span className="text-sm">Schedule</span>
                </Link>

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
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs">Home</span>
          </Link>
          <span className="text-slate-400">/</span>
          <span className="text-slate-700 font-medium">Owner Dashboard</span>
        </nav>
      </div>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-6 pb-8">
        {/* Header Section */}
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-8 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2H2" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800 mb-1">Owner Dashboard</h2>
                <p className="text-slate-600 text-xs">Welcome back, {ownerData?.owner_full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || 'Admin'}! Here's what's happening with your business today</p>
                <div className="flex items-center mt-3 space-x-3">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    All Systems Active
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Last Updated: {new Date().toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      hour12: true
                    })}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex space-x-3">
              <button className="flex items-center space-x-2 px-4 py-2 border-2 border-slate-300 text-slate-700 font-medium rounded-lg hover:border-blue-300 hover:text-blue-600 transition-all duration-200 cursor-pointer">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm">Export Report</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {/* Total Staff */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200/50 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900 mb-1">{stats.totalStaff}</p>
                <p className="text-sm font-medium text-slate-600">Total Staff</p>
                <p className="text-xs text-green-600 mt-1">↗ +2 this month</p>
              </div>
            </div>

            {/* Active Staff */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200/50 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 rounded-xl">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900 mb-1">{stats.activeStaff}</p>
                <p className="text-sm font-medium text-slate-600">Active Staff</p>
                <p className="text-xs text-green-600 mt-1">↗ 92% active rate</p>
              </div>
            </div>

            {/* Today's Attendance */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200/50 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-indigo-100 rounded-xl">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900 mb-1">{stats.todaysAttendance}</p>
                <p className="text-sm font-medium text-slate-600">Today's Attendance</p>
                <p className="text-xs text-green-600 mt-1">↗ On time: 95%</p>
              </div>
            </div>

            {/* Monthly Revenue */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200/50 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900 mb-1">₹{stats.monthlyRevenue.toLocaleString()}</p>
                <p className="text-sm font-medium text-slate-600">Monthly Revenue</p>
                <p className="text-xs text-green-600 mt-1">↗ +15% from last month</p>
              </div>
            </div>
          </div>

          {/* Quick Actions & Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
            {/* Management Actions */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200/50">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Quick Actions</h2>
                <div className="grid grid-cols-2 gap-4">
                  <Link
                    href="/owner/staff-management"
                    className="group flex items-center p-4 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition-all duration-200 border border-blue-200/50"
                  >
                    <div className="p-2 bg-blue-100 group-hover:bg-blue-200 rounded-lg mr-3 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Staff Management</p>
                      <p className="text-xs text-blue-600">Manage team</p>
                    </div>
                  </Link>

                  <button className="group flex items-center p-4 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl transition-all duration-200 border border-green-200/50">
                    <div className="p-2 bg-green-100 group-hover:bg-green-200 rounded-lg mr-3 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Analytics</p>
                      <p className="text-xs text-green-600">View reports</p>
                    </div>
                  </button>

                  <button className="group flex items-center p-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl transition-all duration-200 border border-indigo-200/50">
                    <div className="p-2 bg-indigo-100 group-hover:bg-indigo-200 rounded-lg mr-3 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Attendance</p>
                      <p className="text-xs text-indigo-600">Track time</p>
                    </div>
                  </button>

                  <button className="group flex items-center p-4 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl transition-all duration-200 border border-purple-200/50">
                    <div className="p-2 bg-purple-100 group-hover:bg-purple-200 rounded-lg mr-3 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Settings</p>
                      <p className="text-xs text-purple-600">Configure</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200/50">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900">Recent Activity</h2>
                <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">View All</button>
              </div>
              <div className="space-y-4">
                <div className="flex items-start space-x-3 p-3 hover:bg-slate-50 rounded-lg transition-colors">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">New staff member added</p>
                    <p className="text-xs text-slate-500 mt-1">John Doe joined as cashier</p>
                    <p className="text-xs text-slate-400 mt-1">2 hours ago</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 hover:bg-slate-50 rounded-lg transition-colors">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">Perfect attendance</p>
                    <p className="text-xs text-slate-500 mt-1">All staff checked in today</p>
                    <p className="text-xs text-slate-400 mt-1">4 hours ago</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 hover:bg-slate-50 rounded-lg transition-colors">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">Monthly report generated</p>
                    <p className="text-xs text-slate-500 mt-1">Revenue up 15% this month</p>
                    <p className="text-xs text-slate-400 mt-1">Yesterday</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Overview */}
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200/50">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-slate-900">Performance Overview</h2>
              <select className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white">
                <option>This Month</option>
                <option>Last Month</option>
                <option>Last 3 Months</option>
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Attendance Trends */}
              <div className="text-center">
                <div className="relative w-28 h-28 mx-auto mb-4">
                  <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 36 36">
                    <path className="text-slate-200" strokeWidth="3" fill="none" stroke="currentColor" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="text-blue-500" strokeWidth="3" strokeLinecap="round" fill="none" stroke="currentColor" strokeDasharray="92, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-slate-900">92%</span>
                  </div>
                </div>
                <h3 className="font-semibold text-slate-900 mb-1">Attendance Rate</h3>
                <p className="text-sm text-slate-600">Monthly average</p>
              </div>

              {/* Staff Satisfaction */}
              <div className="text-center">
                <div className="relative w-28 h-28 mx-auto mb-4">
                  <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 36 36">
                    <path className="text-slate-200" strokeWidth="3" fill="none" stroke="currentColor" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="text-green-500" strokeWidth="3" strokeLinecap="round" fill="none" stroke="currentColor" strokeDasharray="96, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-slate-900">4.8</span>
                  </div>
                </div>
                <h3 className="font-semibold text-slate-900 mb-1">Staff Rating</h3>
                <p className="text-sm text-slate-600">Out of 5.0 stars</p>
              </div>

              {/* Revenue Growth */}
              <div className="text-center">
                <div className="relative w-28 h-28 mx-auto mb-4">
                  <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 36 36">
                    <path className="text-slate-200" strokeWidth="3" fill="none" stroke="currentColor" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="text-purple-500" strokeWidth="3" strokeLinecap="round" fill="none" stroke="currentColor" strokeDasharray="75, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold text-slate-900">+15%</span>
                  </div>
                </div>
                <h3 className="font-semibold text-slate-900 mb-1">Revenue Growth</h3>
                <p className="text-sm text-slate-600">vs last month</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
}
