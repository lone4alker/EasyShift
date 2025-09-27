'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/app/utils/supabase';
import { useT, formatTime } from '@/app/utils/translations';
import LanguageSwitcher from '../../../../components/ui/LanguageSwitcher';
import AIInsights from './components/AIInsights';
// import OwnerNavbar from '../..                <span className="text-sm">{t('buttons.exportReport')}</span>../../components/ui/OwnerNavbar';

export default function OwnerDashboard() {
  const { t } = useT();
  const { t: tDashboard } = useT('dashboard');
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

  const checkAuth = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/owner/login');
    } else {
      setUser(user);
      await fetchOwnerData(user);
    }
    setLoading(false);
  }, [router]);

  const loadDashboardData = useCallback(async () => {
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
  }, [user]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user, loadDashboardData]);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      router.push('/owner/login');
    }
  };

  // Export: fetch data -> backend AI -> generate PDF
  const handleExportReport = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      // 1) Get businesses owned by the user using email
      const { data: userBusinesses } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_email', currentUser.email);

      if (!userBusinesses || userBusinesses.length === 0) {
        alert('No businesses found for this owner email.');
        return;
      }

      const businessIds = userBusinesses.map(b => b.business_id);

      // 2) Fetch staff for these businesses
      const { data: staffMembers } = await supabase
        .from('staff_members')
        .select('*')
        .in('business_id', businessIds);

      const staffIds = (staffMembers || []).map(s => s.staff_id);

      // 3) Parallel fetch of related tables
      const [availabilityRes, staffRolesRes, timeOffRes, schedulesRes, hoursRes] = await Promise.all([
        supabase.from('staff_availability').select('*').in('staff_id', staffIds),
        supabase.from('staff_roles').select('*').in('staff_id', staffIds),
        supabase.from('time_off_requests').select('*').in('staff_id', staffIds),
        supabase.from('schedules').select('*').in('business_id', businessIds),
        supabase.from('business_hours').select('*').in('business_id', businessIds)
      ]);

      // 4) Shifts are tied to schedules; fetch but ignore errors if table missing
      let shifts = [];
      try {
        const scheduleIds = (schedulesRes.data || []).map(s => s.schedule_id);
        if (scheduleIds.length > 0) {
          const { data: shiftData } = await supabase
            .from('shifts')
            .select('*')
            .in('schedule_id', scheduleIds);
          shifts = shiftData || [];
        }
      } catch (_) {}

      const payload = {
        metadata: {
          owner_email: currentUser.email,
          business_ids: businessIds,
          generated_at: new Date().toISOString()
        },
        businesses: userBusinesses,
        staff_members: staffMembers || [],
        staff_availability: availabilityRes.data || [],
        staff_roles: staffRolesRes.data || [],
        time_off_requests: timeOffRes.data || [],
        schedules: schedulesRes.data || [],
        shifts: shifts,
        business_hours: hoursRes.data || []
      };

      // 5) Call backend for recommendations (with fallback hosts and timeout)
      const tryHosts = [
        process.env.NEXT_PUBLIC_PY_API_URL,
        'http://127.0.0.1:5000',
        'http://localhost:5000'
      ].filter(Boolean);

      let rec = null;
      let lastErr = null;
      for (const host of tryHosts) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort('timeout'), 30000);
          const resp = await fetch(`${host}/api/recommendations`, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal
          });
          clearTimeout(timer);
          if (resp.ok) {
            rec = await resp.json();
            break;
          } else {
            lastErr = new Error(`Backend responded ${resp.status} at ${host}`);
          }
        } catch (e) {
          // If aborted due to timeout, try next host; otherwise capture error
          if (e && e.name === 'AbortError') {
            lastErr = new Error(`Request timed out at ${host}`);
          } else {
            lastErr = e;
          }
        }
      }

      if (!rec) throw lastErr || new Error('Failed to reach recommendation backend');

      // 6) Generate PDF
      const { default: jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new jsPDF();
      const businessName = userBusinesses[0]?.shop_name || 'Business';

      doc.setFontSize(16);
      doc.text(`EasyShift Report - ${businessName}`, 14, 18);
      doc.setFontSize(11);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 26);

      // Overview
      const overview = [
        `Total Staff: ${stats.totalStaff}`,
        `Active Staff: ${stats.activeStaff}`,
        `Today's Attendance: ${stats.todaysAttendance}`
      ];
      doc.text('Overview', 14, 36);
      overview.forEach((l, i) => doc.text(`- ${l}`, 18, 44 + i * 6));

      // AI Recommendations
      doc.text('AI Recommendations', 14, 66);
      const recText = (rec.ai_recommendations || '').substring(0, 2500); // avoid huge PDFs
      doc.setFontSize(10);
      const split = doc.splitTextToSize(recText, 180);
      doc.text(split, 14, 74);

      // Immediate Actions table
      if (Array.isArray(rec.immediate_actions) && rec.immediate_actions.length > 0) {
        autoTable(doc, {
          startY: doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 140,
          head: [['Priority', 'Category', 'Action', 'Deadline']],
          body: rec.immediate_actions.map(a => [a.priority, a.category, a.action, (a.deadline || '').toString().slice(0, 10)])
        });
      }

      doc.save('EasyShift_Report.pdf');
    } catch (e) {
      console.error('Export failed:', e);
      alert('Failed to export report. Check console for details.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">{tDashboard('loadingMessage')}</p>
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
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-2 sm:space-x-8">
              <Link href="/" className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-md sm:rounded-lg flex items-center justify-center">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h1 className="text-sm sm:text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {t('appName')}
                </h1>
              </Link>

              {/* Main Navigation - Desktop Only */}
              <div className="hidden lg:flex items-center space-x-1">
                <div className="flex items-center px-3 py-2 text-blue-600 bg-blue-100 rounded-lg font-medium">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  </svg>
                  <span className="text-sm">{t('navigation.dashboard')}</span>
                </div>

                <Link href="/owner/staff-management" className="flex items-center px-3 py-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="text-sm">{t('navigation.staffManagement')}</span>
                </Link>

                <Link href="/owner/schedule" className="flex items-center px-3 py-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 8a4 4 0 11-8 0 4 4 0 018 0zm0 0c0 1.5 1 3 4 3s4-1.5 4-3" />
                  </svg>
                  <span className="text-sm">{t('navigation.schedule')}</span>
                </Link>

                <Link href="/owner/analytics" className="flex items-center px-3 py-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span className="text-sm">{t('navigation.analytics')}</span>
                </Link>
              </div>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Language Switcher - Desktop Only */}
              <div className="hidden sm:block">
                <LanguageSwitcher />
              </div>

              {/* User Info */}
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="text-right hidden md:block">
                  <p className="text-sm font-medium text-slate-800">{ownerData?.owner_full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || 'Admin User'}</p>
                  <p className="text-xs text-slate-500">Owner</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                  title={t('buttons.signOut')}
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
      <div className="relative z-10 container mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <nav className="flex items-center space-x-2 text-sm">
          <Link href="/" className="text-slate-500 hover:text-blue-600 transition-colors duration-200 flex items-center">
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs">{tDashboard('breadcrumb.home')}</span>
          </Link>
          <span className="text-slate-400">/</span>
          <span className="text-slate-700 font-medium text-xs sm:text-sm">{tDashboard('breadcrumb.ownerDashboard')}</span>
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
                <h2 className="text-xl font-bold text-slate-800 mb-1">{tDashboard('title')}</h2>
                <p className="text-slate-600 text-xs">{tDashboard('welcome', { name: ownerData?.owner_full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || 'Admin' })}</p>
                <div className="flex items-center mt-3 space-x-3">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {tDashboard('systemStatus.allSystemsActive')}
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {tDashboard('systemStatus.lastUpdated')}: {formatTime()}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex space-x-3">
              <button onClick={handleExportReport} className="flex items-center space-x-2 px-4 py-2 border-2 border-slate-300 text-slate-700 font-medium rounded-lg hover:border-blue-300 hover:text-blue-600 transition-all duration-200 cursor-pointer">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm">Export Report</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-10">
            {/* Total Staff */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg border border-slate-200/50 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="p-2 sm:p-3 bg-blue-100 rounded-lg sm:rounded-xl">
                  <svg className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <div>
                <p className="text-xl sm:text-3xl font-bold text-slate-900 mb-1">{stats.totalStaff}</p>
                <p className="text-xs sm:text-sm font-medium text-slate-600">{tDashboard('stats.totalStaff')}</p>
                <p className="text-xs text-green-600 mt-1">↗ +2 this month</p>
              </div>
            </div>

            {/* Active Staff */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg border border-slate-200/50 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="p-2 sm:p-3 bg-green-100 rounded-lg sm:rounded-xl">
                  <svg className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div>
                <p className="text-xl sm:text-3xl font-bold text-slate-900 mb-1">{stats.activeStaff}</p>
                <p className="text-xs sm:text-sm font-medium text-slate-600">{tDashboard('stats.activeStaff')}</p>
                <p className="text-xs text-green-600 mt-1">↗ 92%</p>
              </div>
            </div>

            {/* Today's Attendance */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg border border-slate-200/50 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="p-2 sm:p-3 bg-indigo-100 rounded-lg sm:rounded-xl">
                  <svg className="w-4 h-4 sm:w-6 sm:h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div>
                <p className="text-xl sm:text-3xl font-bold text-slate-900 mb-1">{stats.todaysAttendance}</p>
                <p className="text-xs sm:text-sm font-medium text-slate-600">{tDashboard('stats.todaysAttendance')}</p>
                <p className="text-xs text-green-600 mt-1">↗ 95%</p>
              </div>
            </div>

            {/* Monthly Revenue */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg border border-slate-200/50 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="p-2 sm:p-3 bg-purple-100 rounded-lg sm:rounded-xl">
                  <svg className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
              <div>
                <p className="text-xl sm:text-3xl font-bold text-slate-900 mb-1">₹{stats.monthlyRevenue.toLocaleString()}</p>
                <p className="text-xs sm:text-sm font-medium text-slate-600">{tDashboard('stats.monthlyRevenue')}</p>
                <p className="text-xs text-green-600 mt-1">↗ +15%</p>
              </div>
            </div>
          </div>

          {/* Quick Actions & Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 mb-6 sm:mb-10">
            {/* Management Actions */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-8 shadow-lg border border-slate-200/50">
                <h2 className="text-lg sm:text-2xl font-bold text-slate-900 mb-4 sm:mb-6">{tDashboard('quickActions.title')}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <Link
                    href="/owner/staff-management"
                    className="group flex items-center p-3 sm:p-4 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg sm:rounded-xl transition-all duration-200 border border-blue-200/50"
                  >
                    <div className="p-2 bg-blue-100 group-hover:bg-blue-200 rounded-lg mr-3 transition-colors">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{tDashboard('quickActionItems.staffManagement.title', 'Staff Management')}</p>
                      <p className="text-xs text-blue-600">{tDashboard('quickActionItems.staffManagement.subtitle', 'Manage team')}</p>
                    </div>
                  </Link>

                  <Link
                    href="/owner/schedule"
                    className="group flex items-center p-3 sm:p-4 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg sm:rounded-xl transition-all duration-200 border border-green-200/50"
                  >
                    <div className="p-2 bg-green-100 group-hover:bg-green-200 rounded-lg mr-3 transition-colors">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{tDashboard('quickActionItems.schedule.title', 'Schedule')}</p>
                      <p className="text-xs text-green-600">{tDashboard('quickActionItems.schedule.subtitle', 'Manage shifts')}</p>
                    </div>
                  </Link>
                </div>
              </div>
            </div>

            {/* AI Insights */}
            <AIInsights user={user} />
          </div>

          {/* Performance Overview */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-8 shadow-lg border border-slate-200/50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-8 space-y-3 sm:space-y-0">
              <h2 className="text-lg sm:text-2xl font-bold text-slate-900">{tDashboard('performance.title')}</h2>
              <select className="text-xs sm:text-sm border border-slate-300 rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 bg-white">
                <option>{t('common.thisMonth')}</option>
                <option>{t('common.lastMonth')}</option>
                <option>Last 3 Months</option>
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
              {/* Attendance Trends */}
              <div className="text-center">
                <div className="relative w-20 h-20 sm:w-28 sm:h-28 mx-auto mb-3 sm:mb-4">
                  <svg className="w-20 h-20 sm:w-28 sm:h-28 transform -rotate-90" viewBox="0 0 36 36">
                    <path className="text-slate-200" strokeWidth="3" fill="none" stroke="currentColor" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="text-blue-500" strokeWidth="3" strokeLinecap="round" fill="none" stroke="currentColor" strokeDasharray="92, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg sm:text-2xl font-bold text-slate-900">92%</span>
                  </div>
                </div>
                <h3 className="font-semibold text-slate-900 mb-1 text-sm sm:text-base">{tDashboard('performance.attendanceRate')}</h3>
                <p className="text-xs sm:text-sm text-slate-600">{tDashboard('performance.monthlyAverage')}</p>
              </div>

              {/* Staff Satisfaction */}
              <div className="text-center">
                <div className="relative w-20 h-20 sm:w-28 sm:h-28 mx-auto mb-3 sm:mb-4">
                  <svg className="w-20 h-20 sm:w-28 sm:h-28 transform -rotate-90" viewBox="0 0 36 36">
                    <path className="text-slate-200" strokeWidth="3" fill="none" stroke="currentColor" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="text-green-500" strokeWidth="3" strokeLinecap="round" fill="none" stroke="currentColor" strokeDasharray="96, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg sm:text-2xl font-bold text-slate-900">4.8</span>
                  </div>
                </div>
                <h3 className="font-semibold text-slate-900 mb-1 text-sm sm:text-base">{tDashboard('performance.staffRating')}</h3>
                <p className="text-xs sm:text-sm text-slate-600">{tDashboard('performance.outOfFive')}</p>
              </div>

              {/* Revenue Growth */}
              <div className="text-center">
                <div className="relative w-20 h-20 sm:w-28 sm:h-28 mx-auto mb-3 sm:mb-4">
                  <svg className="w-20 h-20 sm:w-28 sm:h-28 transform -rotate-90" viewBox="0 0 36 36">
                    <path className="text-slate-200" strokeWidth="3" fill="none" stroke="currentColor" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="text-purple-500" strokeWidth="3" strokeLinecap="round" fill="none" stroke="currentColor" strokeDasharray="75, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-base sm:text-xl font-bold text-slate-900">+15%</span>
                  </div>
                </div>
                <h3 className="font-semibold text-slate-900 mb-1 text-sm sm:text-base">{tDashboard('performance.revenueGrowth')}</h3>
                <p className="text-xs sm:text-sm text-slate-600">{tDashboard('performance.vsLastMonth')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
}
