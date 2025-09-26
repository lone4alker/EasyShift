'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/app/utils/supabase'

export default function StaffManagementPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [staffLoading, setStaffLoading] = useState(false);
  const [ownerData, setOwnerData] = useState(null);
  const router = useRouter();
  const [staff, setStaff] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [newStaffMember, setNewStaffMember] = useState({
    fullName: '',
    role: '',
    email: '',
    phone: '',
    hourlyRate: 0,
    maxHours: 8,
    availability: [],
  })

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (ownerData && ownerData.id) {
      fetchStaff();
    }
  }, [ownerData]);

  const fetchOwnerData = async (user) => {
    console.log('Fetching owner data for user:', { id: user.id, email: user.email });
    
    // Try to fetch all business records first to debug
    try {
      const { data: allBusinesses, error: listError } = await supabase
        .from('businesses')
        .select('*')
        .limit(5);
      
      console.log('All businesses (first 5):', allBusinesses);
      console.log('List error:', listError);
      
      if (allBusinesses && allBusinesses.length > 0) {
        console.log('Sample business structure:', allBusinesses[0]);
      }
    } catch (err) {
      console.log('Error fetching businesses list:', err);
    }

    // Try multiple approaches to find the owner data using the actual database structure
    const attempts = [
      // Attempt 1: owner_email field
      () => supabase.from('businesses').select('*').eq('owner_email', user.email).single(),
      // Attempt 2: Check if there's a user relation field
      () => supabase.from('businesses').select('*').eq('owner_phone_number', user.phone).single(),
      // Attempt 3: Get first business for debugging
      () => supabase.from('businesses').select('*').limit(1).single()
    ];

    for (let i = 0; i < attempts.length; i++) {
      try {
        const { data: businessData, error } = await attempts[i]();
        console.log(`Attempt ${i + 1} result:`, { data: businessData, error });
        
        if (!error && businessData) {
          console.log('Successfully found business data:', businessData);
          // Ensure we have the business_id field
          if (businessData.business_id) {
            setOwnerData(businessData);
            return;
          } else {
            console.log('Business data found but no business_id field:', businessData);
          }
        }
      } catch (err) {
        console.log(`Attempt ${i + 1} exception:`, err);
      }
    }
    
    console.log('No business data found for user');
    
    // If no business found, let's create a default one or show a setup message
    try {
      console.log('Attempting to create/find business record...');
      const { data: newBusiness, error: createError } = await supabase
        .from('businesses')
        .upsert([{
          owner_email: user.email,
          owner_full_name: user.user_metadata?.full_name || user.email,
          shop_name: `${user.user_metadata?.full_name || 'My'} Business`,
          business_type: 'General',
        }], { 
          onConflict: 'owner_email',
          ignoreDuplicates: false 
        })
        .select()
        .single();
        
      if (!createError && newBusiness) {
        console.log('Created/found business:', newBusiness);
        setOwnerData(newBusiness);
      } else {
        console.error('Error creating business:', createError);
        setError('Unable to load business information. Please contact support.');
      }
    } catch (err) {
      console.error('Error in business creation:', err);
      setError('Unable to setup business. Please contact support.');
    }
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

  // Fetch staff members from Supabase
  const fetchStaff = async () => {
    if (!ownerData?.business_id) {
      console.log('No business_id available:', ownerData);
      return;
    }
    
    setStaffLoading(true);
    setError(null);
    
    try {
      const { data: staffData, error: staffError } = await supabase
        .from('staff_members')
        .select('*')
        .eq('business_id', ownerData.business_id)
        .order('created_at', { ascending: false });

      if (staffError) {
        throw staffError;
      }

      // Transform the data to match the expected format
      const formattedStaff = staffData?.map(staff => ({
        id: staff.staff_id,
        name: `${staff.first_name} ${staff.last_name}`,
        role: staff.role,
        email: staff.email,
        phone: staff.phone_number || '',
        hourlyRate: staff.hourly_rate || 0,
        maxHours: staff.max_hours_per_week || 40,
        availability: [], // Will need to fetch from staff_availability table
      })) || [];

      setStaff(formattedStaff);
    } catch (error) {
      console.error('Error fetching staff:', error);
      setError('Failed to load staff members. Please try again.');
    } finally {
      setStaffLoading(false);
    }
  };

  // Add new staff member to Supabase
  const addStaffToDatabase = async (staffData) => {
    if (!ownerData?.business_id) {
      console.error('Business data:', ownerData);
      throw new Error('Business information not available. Please refresh the page.');
    }

    // Split full name into first and last name
    const nameParts = staffData.fullName.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const { data, error } = await supabase
      .from('staff_members')
      .insert([{
        business_id: ownerData.business_id,
        first_name: firstName,
        last_name: lastName,
        email: staffData.email,
        phone_number: staffData.phone || null,
        role: staffData.role,
        hourly_rate: parseFloat(staffData.hourlyRate) || 0,
        max_hours_per_week: parseInt(staffData.maxHours) * 7 || 40, // Convert daily to weekly
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select();

    if (error) {
      throw error;
    }

    return data[0];
  };

  // Delete staff member from Supabase
  const deleteStaffFromDatabase = async (staffId) => {
    const { error } = await supabase
      .from('staff_members')
      .delete()
      .eq('staff_id', staffId)
      .eq('business_id', ownerData?.business_id); // Security check

    if (error) {
      throw error;
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      router.push('/owner/login');
    }
  };

  const openModal = () => {
    setIsModalOpen(true);
    setError(null);
    setSuccess(null);
  }
  
  const closeModal = () => {
    setIsModalOpen(false);
    setError(null);
    setSuccess(null);
    setNewStaffMember({
      fullName: '',
      role: '',
      email: '',
      phone: '',
      hourlyRate: 0,
      maxHours: 8,
      availability: [],
    });
  }

  const handleNewStaffChange = e => {
    const { name, value } = e.target
    setNewStaffMember(prev => ({ ...prev, [name]: value }))
  }

  const handleNewStaffDayChange = e => {
    const { value, checked } = e.target
    setNewStaffMember(prev => {
      const newAvailability = checked
        ? [...prev.availability, { day: value, start: '09:00', end: '17:00' }]
        : prev.availability.filter(day => day.day !== value)
      return { ...prev, availability: newAvailability }
    })
  }

  const handleAddStaff = async () => {
    if (!newStaffMember.fullName || !newStaffMember.role || !newStaffMember.email) {
      setError('Full Name, Role, and Email are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    
    try {
      const newStaffData = await addStaffToDatabase(newStaffMember);
      
      // Add to local state to immediately show the new staff member
      const formattedStaff = {
        id: newStaffData.staff_id,
        name: `${newStaffData.first_name} ${newStaffData.last_name}`,
        role: newStaffData.role,
        email: newStaffData.email,
        phone: newStaffData.phone_number || '',
        hourlyRate: newStaffData.hourly_rate || 0,
        maxHours: Math.floor((newStaffData.max_hours_per_week || 40) / 7),
        availability: [], // Will be populated when availability system is implemented
      };
      
      setStaff(prev => [formattedStaff, ...prev]);
      setSuccess('Staff member added successfully!');
      
      // Auto-close modal after 2 seconds
      setTimeout(() => {
        closeModal();
      }, 2000);
      
    } catch (error) {
      console.error('Error adding staff:', error);
      setError(error.message || 'Failed to add staff member. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleDeleteStaff = async (id) => {
    if (!confirm('Are you sure you want to delete this staff member? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteStaffFromDatabase(id);
      setStaff(prev => prev.filter(member => member.id !== id));
      setSuccess('Staff member deleted successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error deleting staff:', error);
      setError(error.message || 'Failed to delete staff member. Please try again.');
      
      // Clear error message after 5 seconds
      setTimeout(() => setError(null), 5000);
    }
  }

  const getInitials = name => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading staff management...</p>
        </div>
      </div>
    );
  }

  if (!ownerData || !ownerData.business_id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Business Setup Required</h2>
          <p className="text-slate-600 mb-4">We need to set up your business information before you can manage staff.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry Setup
          </button>
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
                
                <div className="flex items-center px-3 py-2 text-blue-600 bg-blue-100 rounded-lg font-medium">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="text-sm">Staff Management</span>
                </div>
                
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
          <Link href="/owner/dashboard" className="text-slate-500 hover:text-blue-600 transition-colors duration-200">
            Owner Dashboard
          </Link>
          <span className="text-slate-400">/</span>
          <span className="text-slate-700 font-medium">Staff Management</span>
        </nav>
      </div>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-6 pb-8">
        {/* Error and Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </div>
        )}

        {/* Header Section */}
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-8 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800 mb-1">Staff Management</h2>
                <p className="text-slate-600 text-xs">Manage your team members and their availability schedules</p>
                <div className="flex items-center mt-3 space-x-3">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {staff.length} Active Staff
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Ready to Schedule
                  </span>
                </div>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={openModal}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                <span className="text-sm">Add New Staff</span>
              </button>
            </div>
          </div>
        </div>

        {/* Staff Cards Grid */}
        <div className="grid gap-6">
          {staffLoading ? (
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading staff members...</p>
            </div>
          ) : staff.length === 0 ? (
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-8 text-center">
              <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">No Staff Members Yet</h3>
              <p className="text-slate-500 mb-4">Get started by adding your first team member</p>
              <button
                onClick={openModal}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
              >
                Add Your First Staff Member
              </button>
            </div>
          ) : (
            staff.map(member => (
            <div key={member.id} className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-6">
                {/* Profile Section */}
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm shadow-lg">
                    {getInitials(member.name)}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-800 mb-1">{member.name}</h3>
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0H8m8 0v2a2 2 0 01-2 2H10a2 2 0 01-2-2V6" />
                        </svg>
                        {member.role}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Available
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contact & Rate Information */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center text-slate-600">
                      <svg className="w-4 h-4 mr-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                      </svg>
                      <span className="text-xs">{member.email}</span>
                    </div>
                    <div className="flex items-center text-slate-600">
                      <svg className="w-4 h-4 mr-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span className="text-xs">{member.phone}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center text-slate-600">
                      <svg className="w-4 h-4 mr-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                      <span className="text-xs font-medium">${member.hourlyRate}/hour</span>
                    </div>
                    <div className="flex items-center text-slate-600">
                      <svg className="w-4 h-4 mr-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-xs">Max {member.maxHours} hours/day</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2">
                  <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 cursor-pointer">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button 
                    onClick={() => handleDeleteStaff(member.id)} 
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Availability Schedule */}
              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="flex items-center mb-2">
                  <svg className="w-4 h-4 mr-2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 8a4 4 0 11-8 0 4 4 0 018 0zm0 0c0 1.5 1 3 4 3s4-1.5 4-3" />
                  </svg>
                  <span className="font-medium text-slate-700 text-sm">Weekly Availability</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {member.availability.map(slot => (
                    <div key={slot.day} className="inline-flex items-center bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-md px-2 py-1">
                      <span className="font-medium text-green-800 text-xs">{slot.day}</span>
                      <span className="text-green-600 text-xs ml-1">{slot.start} - {slot.end}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
          )}
        </div>
      </div>

      {/* Enhanced Modal for adding new staff */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 relative max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white/90 backdrop-blur-xl p-6 border-b border-slate-200 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">Add New Staff Member</h3>
                    <p className="text-slate-600 text-xs">Add a team member to your scheduling system</p>
                  </div>
                </div>
                <button 
                  onClick={closeModal} 
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all duration-200 cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* Modal Error and Success Messages */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="text-sm text-green-700">{success}</p>
                  </div>
                </div>
              )}

              {/* Personal Information */}
              <div className="mb-8">
                <div className="flex items-center mb-3">
                  <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <h4 className="text-sm font-semibold text-slate-800">Personal Information</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="fullName" className="block text-sm font-semibold text-slate-700">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      id="fullName" 
                      name="fullName" 
                      value={newStaffMember.fullName} 
                      onChange={handleNewStaffChange} 
                      required 
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors duration-200 text-black" 
                      placeholder="Enter full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="role" className="block text-sm font-semibold text-slate-700">
                      Role <span className="text-red-500">*</span>
                    </label>
                    <select 
                      id="role" 
                      name="role" 
                      value={newStaffMember.role} 
                      onChange={handleNewStaffChange} 
                      required 
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors duration-200 text-black"
                    >
                      <option value="">Select role</option>
                      <option value="Barista">Barista</option>
                      <option value="Cashier">Cashier</option>
                      <option value="Server">Server</option>
                      <option value="Cook">Cook</option>
                      <option value="Cleaner">Cleaner</option>
                      <option value="Helper">Helper</option>
                      <option value="Sales Associate">Sales Associate</option>
                      <option value="Manager">Manager</option>
                      <option value="Security">Security</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="email" className="block text-sm font-semibold text-slate-700">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="email" 
                      id="email" 
                      name="email" 
                      value={newStaffMember.email} 
                      onChange={handleNewStaffChange} 
                      required 
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors duration-200 text-black" 
                      placeholder="staff@email.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="phone" className="block text-sm font-semibold text-slate-700">Phone</label>
                    <input 
                      type="tel" 
                      id="phone" 
                      name="phone" 
                      value={newStaffMember.phone} 
                      onChange={handleNewStaffChange} 
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors duration-200 text-black" 
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
              </div>

              {/* Employment Details */}
              <div className="mb-8">
                <div className="flex items-center mb-3">
                  <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  <h4 className="text-sm font-semibold text-slate-800">Employment Details</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="hourlyRate" className="block text-sm font-semibold text-slate-700">Hourly Rate ($)</label>
                    <input 
                      type="number" 
                      id="hourlyRate" 
                      name="hourlyRate" 
                      value={newStaffMember.hourlyRate} 
                      onChange={handleNewStaffChange} 
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors duration-200 text-black" 
                      placeholder="15.00"
                      step="0.50"
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="maxHours" className="block text-sm font-semibold text-slate-700">Max Hours Per Day</label>
                    <input 
                      type="number" 
                      id="maxHours" 
                      name="maxHours" 
                      value={newStaffMember.maxHours} 
                      onChange={handleNewStaffChange} 
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors duration-200 text-black" 
                      placeholder="8"
                      min="1"
                      max="16"
                    />
                  </div>
                </div>
              </div>

              {/* Availability */}
              <div className="mb-8">
                <div className="flex items-center mb-3">
                  <svg className="w-4 h-4 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 8a4 4 0 11-8 0 4 4 0 018 0zm0 0c0 1.5 1 3 4 3s4-1.5 4-3" />
                  </svg>
                  <h4 className="text-sm font-semibold text-slate-800">Weekly Availability</h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                    <label key={day} className="flex items-center space-x-3 cursor-pointer p-3 border-2 border-slate-200 rounded-lg hover:border-blue-300 transition-colors duration-200">
                      <input
                        type="checkbox"
                        id={`new-staff-day-${day}`}
                        name="availability"
                        value={day}
                        checked={newStaffMember.availability.some(d => d.day === day)}
                        onChange={handleNewStaffDayChange}
                        className="w-5 h-5 text-blue-600 bg-white border-2 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-slate-700">{day.substring(0, 3)}</span>
                    </label>
                  ))}
                </div>
                <p className="text-sm text-slate-500 mt-2">Select the days when this staff member is available to work</p>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3">
                <button 
                  onClick={closeModal} 
                  className="px-6 py-3 border-2 border-slate-300 text-slate-700 font-semibold rounded-lg hover:border-slate-400 hover:bg-slate-50 transition-all duration-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddStaff} 
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                >
                  {isSubmitting ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Adding Staff...</span>
                    </div>
                  ) : (
                    'Add Staff Member'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}