'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/utils/supabase';
import { useT } from '@/app/utils/translations';
import LanguageSwitcher from '../../../../components/ui/LanguageSwitcher';

// --- Supabase API Functions ---

async function saveStaffToDatabase(staffPayload, businessId, userId) {
  if (!businessId || !userId) {
    throw new Error("Business ID and User ID are required to save staff.");
  }

  const nameParts = staffPayload.name.trim().split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  
  const staffMemberData = {
    first_name: firstName,
    last_name: lastName,
    email: staffPayload.email.toLowerCase().trim(),
    phone_number: staffPayload.phoneNumber || null,
    hourly_rate: parseFloat(staffPayload.hourlyRate) || 0,
    max_hours_per_week: parseInt(staffPayload.maxHours) || 8,
    business_id: businessId,
    is_active: true,
    role: staffPayload.roleName.trim(),
    user_id: userId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    skills: staffPayload.skills,
    preferred_shifts: staffPayload.preferredShifts,
    unavailable_days: staffPayload.unavailableDays,
    experience_level: staffPayload.experienceLevel,
    certifications: staffPayload.certifications,
    location_preferences: staffPayload.locationPreferences,
  }

  if (!staffMemberData.first_name || !staffMemberData.email || !staffMemberData.role || !staffMemberData.user_id) {
    throw new Error('First name, email, role, and user ID are required fields.');
  }

  const { data: newStaff, error: staffError } = await supabase
    .from('staff_members')
    .insert([staffMemberData])
    .select('*')

  if (staffError) {
    console.error('Error inserting staff member:', staffError)
    if (staffError.code === '23505') {
      throw new Error('A staff member with this email already exists.');
    }
    throw new Error(`Failed to add new staff member: ${staffError.message}`);
  }

  if (!newStaff || newStaff.length === 0) {
    throw new Error('Failed to create staff member - no data returned.');
  }

  const staffId = newStaff[0].staff_id

  return {
    id: staffId,
    name: staffPayload.name,
    role: staffPayload.roleName,
    email: staffPayload.email,
    phone: staffPayload.phoneNumber || 'Not provided',
    hourlyRate: staffPayload.hourlyRate,
    maxHours: staffPayload.maxHours,
    availability: staffPayload.availability,
    skills: staffPayload.skills,
    preferredShifts: staffPayload.preferredShifts,
    unavailableDays: staffPayload.unavailableDays,
    experienceLevel: staffPayload.experienceLevel,
    certifications: staffPayload.certifications,
    locationPreferences: staffPayload.locationPreferences,
  }
}

// -------------------------------------------------------------------------

export default function StaffManagementPage() {
  const { t } = useT();
  const router = useRouter();
  const [staff, setStaff] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [businessId, setBusinessId] = useState(null)
  const [editingStaff, setEditingStaff] = useState(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [newStaffMember, setNewStaffMember] = useState({
    fullName: '',
    role: '',
    email: '',
    phone: '',
    hourlyRate: 0,
    maxHours: 8,
    availability: [],
    password: '',
    skills: '',
    preferredShifts: '',
    unavailableDays: '',
    experienceLevel: '',
    certifications: '',
    locationPreferences: '',
  })
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setAuthError(null);
      
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setAuthError('Authentication error occurred. Please try logging in again.');
          setIsLoading(false);
          return;
        }
        
        if (!session?.user) {
          console.error("No user session found.");
          setAuthError('You must be logged in to access this page.');
          setTimeout(() => {
            router.push('/owner/login');
          }, 2000);
          setIsLoading(false);
          return;
        }
        
        const user = session.user;

        const { data: businessData, error: businessError } = await supabase
          .from('businesses')
          .select('business_id, shop_name')
          .eq('owner_email', user.email)
          .single();
        
        if (businessError) {
          console.error('Error fetching business ID:', businessError.message);
          if (businessError.code === 'PGRST116') {
            setAuthError('No business found for your account. Please contact support or create a business first.');
          } else {
            setAuthError(`Failed to load business information: ${businessError.message}`);
          }
          setIsLoading(false);
          return;
        }
        
        if (!businessData) {
          setAuthError('No business associated with your account.');
          setIsLoading(false);
          return;
        }
        
        const fetchedBusinessId = businessData.business_id;
        setBusinessId(fetchedBusinessId);

        const { data: staffData, error: staffError } = await supabase
          .from('staff_members')
          .select('*')
          .eq('business_id', fetchedBusinessId)
          .eq('is_active', true)
          .order('first_name');

        if (staffError) {
          console.error('Error fetching staff data:', staffError);
          throw new Error(`Failed to load staff data: ${staffError.message}`);
        }
        
        const formattedStaff = (staffData || []).map(member => ({
          id: member.staff_id,
          name: `${member.first_name || ''} ${member.last_name || ''}`.trim(),
          role: member.role || 'No Role',
          email: member.email || '',
          phone: member.phone_number || 'Not provided',
          hourlyRate: parseFloat(member.hourly_rate) || 0,
          maxHours: parseInt(member.max_hours_per_week) || 8,
          isActive: member.is_active,
          createdAt: member.created_at,
          updatedAt: member.updated_at,
          availability: [],
          skills: member.skills,
          preferredShifts: member.preferred_shifts,
          unavailableDays: member.unavailable_days,
          experienceLevel: member.experience_level,
          certifications: member.certifications,
          locationPreferences: member.location_preferences,
        }));
        setStaff(formattedStaff);

      } catch (error) {
        console.error("Failed to load data:", error.message);
        setAuthError(`An unexpected error occurred: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [router]);

  const openModal = () => setIsModalOpen(true)
  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditMode(false);
    setEditingStaff(null);
    setCurrentStep(1); // Reset to first step
    setNewStaffMember({
      fullName: '',
      role: '',
      email: '',
      phone: '',
      hourlyRate: 0,
      maxHours: 8,
      availability: [],
      password: '',
      skills: '',
      preferredShifts: '',
      unavailableDays: '',
      experienceLevel: '',
      certifications: '',
      locationPreferences: '',
    });
  }

  const handleNewStaffChange = e => {
    const { name, value } = e.target
    setNewStaffMember(prev => ({ ...prev, [name]: value }))
  }

  const handleNewStaffDayChange = e => {
    const { value, checked } = e.target
    setNewStaffMember(prev => {
      const defaultStart = '09:00';
      const defaultEnd = '17:00';

      const newAvailability = checked
        ? [...prev.availability, { day: value, start: defaultStart, end: defaultEnd }]
        : prev.availability.filter(day => day.day !== value)
      return { ...prev, availability: newAvailability }
    })
  }

  const validateStep1 = () => {
    const errors = [];
    if (!newStaffMember.fullName?.trim()) errors.push('Full Name is required');
    if (!newStaffMember.role?.trim()) errors.push('Role is required');
    if (!newStaffMember.email?.trim()) {
      errors.push('Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newStaffMember.email.trim())) {
      errors.push('Please enter a valid email address');
    }
    if (!isEditMode && (!newStaffMember.password || newStaffMember.password.length < 6)) {
      errors.push('Password must be at least 6 characters long.');
    }
    return errors;
  };

  const handleNextStep = () => {
    const errors = validateStep1();
    if (errors.length > 0) {
      alert('Please fix the following errors:\n' + errors.join('\n'));
      return;
    }
    setCurrentStep(currentStep + 1);
  };
  
  const handlePreviousStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleAddStaff = async () => {
    if (!businessId) {
      alert('Could not determine business ID. Please try logging in again.');
      return;
    }

    setIsSaving(true);

    try {
      const { data: { user }, error: signUpError } = await supabase.auth.signUp({
        email: newStaffMember.email,
        password: newStaffMember.password,
      });

      if (signUpError) {
        console.error('Supabase Sign-Up Error:', signUpError);
        alert(`Failed to create user account: ${signUpError.message}`);
        setIsSaving(false);
        return;
      }

      if (!user) {
        throw new Error('User was not created by Supabase Auth.');
      }

      const staffPayload = {
        name: newStaffMember.fullName,
        roleName: newStaffMember.role,
        email: newStaffMember.email,
        phoneNumber: newStaffMember.phone,
        hourlyRate: parseFloat(newStaffMember.hourlyRate),
        maxHours: parseInt(newStaffMember.maxHours),
        availability: newStaffMember.availability,
        skills: newStaffMember.skills,
        preferredShifts: newStaffMember.preferredShifts,
        unavailableDays: newStaffMember.unavailableDays,
        experienceLevel: newStaffMember.experienceLevel,
        certifications: newStaffMember.certifications,
        locationPreferences: newStaffMember.locationPreferences,
      }

      const addedStaff = await saveStaffToDatabase(staffPayload, businessId, user.id);
      
      setStaff(prev => [...prev, addedStaff])
      closeModal()

    } catch (error) {
      console.error('Error adding staff member:', error)
      alert(`Failed to add staff member: ${error.message}`)
    } finally {
      setIsSaving(false);
    }
  }

  const handleEditStaff = (member) => {
    setEditingStaff(member);
    setIsEditMode(true);
    setNewStaffMember({
      fullName: member.name,
      role: member.role,
      email: member.email,
      phone: member.phone === 'Not provided' ? '' : member.phone,
      hourlyRate: member.hourlyRate,
      maxHours: member.maxHours,
      availability: member.availability || [],
      password: '',
      skills: member.skills || '',
      preferredShifts: member.preferredShifts || '',
      unavailableDays: member.unavailableDays || '',
      experienceLevel: member.experienceLevel || '',
      certifications: member.certifications || '',
      locationPreferences: member.locationPreferences || '',
    });
    setIsModalOpen(true);
  };

  const handleUpdateStaff = async () => {
    const validationErrors = validateStep1();
    if (validationErrors.length > 0) {
      alert('Please fix the following errors:\n' + validationErrors.join('\n'));
      return;
    }
    
    setIsSaving(true);
    
    try {
      const nameParts = newStaffMember.fullName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      const updateData = {
        first_name: firstName,
        last_name: lastName,
        email: newStaffMember.email.toLowerCase().trim(),
        phone_number: newStaffMember.phone || null,
        hourly_rate: parseFloat(newStaffMember.hourlyRate) || 0,
        max_hours_per_week: parseInt(newStaffMember.maxHours) || 8,
        role: newStaffMember.role.trim(),
        updated_at: new Date().toISOString(),
        skills: newStaffMember.skills,
        preferred_shifts: newStaffMember.preferredShifts,
        unavailable_days: newStaffMember.unavailableDays,
        experience_level: newStaffMember.experienceLevel,
        certifications: newStaffMember.certifications,
        location_preferences: newStaffMember.locationPreferences,
      };
      
      const { error: updateError } = await supabase
        .from('staff_members')
        .update(updateData)
        .eq('staff_id', editingStaff.id);
        
      if (updateError) {
        throw new Error(`Failed to update staff member: ${updateError.message}`);
      }
      
      const updatedMember = {
        ...editingStaff,
        name: newStaffMember.fullName,
        role: newStaffMember.role,
        email: newStaffMember.email,
        phone: newStaffMember.phone || 'Not provided',
        hourlyRate: parseFloat(newStaffMember.hourlyRate) || 0,
        maxHours: parseInt(newStaffMember.maxHours) || 8,
        availability: newStaffMember.availability,
        skills: newStaffMember.skills,
        preferredShifts: newStaffMember.preferredShifts,
        unavailableDays: newStaffMember.unavailableDays,
        experienceLevel: newStaffMember.experienceLevel,
        certifications: newStaffMember.certifications,
        locationPreferences: newStaffMember.locationPreferences,
      };
      
      setStaff(prev => prev.map(member => 
        member.id === editingStaff.id ? updatedMember : member
      ));
      
      closeModal();
      
    } catch (error) {
      console.error('Error updating staff member:', error);
      alert(`Failed to update staff member: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStaff = async (id) => {
    if (!confirm(t('staffManagement.deleteConfirm'))) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('staff_members')
        .delete()
        .eq('staff_id', id);

      if (error) throw error;

      setStaff(prev => prev.filter(member => member.id !== id));
    } catch (error) {
      console.error("Error deleting staff:", error.message);
      alert(`Failed to delete staff member: ${error.message}`);
    }
  }

  const getInitials = name => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-600/5 via-indigo-600/5 to-purple-600/5"></div>
        <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgb(59 130 246 / 0.1)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Enhanced Modern Navigation */}
      <nav className="relative z-10 bg-white/70 backdrop-blur-xl border-b border-white/50 shadow-lg">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h1 className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {t('appName')}
                </h1>
              </Link>

              <div className="hidden md:flex items-center space-x-1">
                <Link href="/owner/dashboard" className="flex items-center px-3 py-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  </svg>
                  <span className="text-sm">{t('navigation.dashboard')}</span>
                </Link>

                <div className="flex items-center px-3 py-2 text-blue-600 bg-blue-100 rounded-lg font-medium">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="text-sm">{t('navigation.staffManagement')}</span>
                </div>

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

            <div className="flex items-center space-x-4">
              <LanguageSwitcher />
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
            <span className="text-xs">{t('navigation.home')}</span>
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
                <h2 className="text-xl font-bold text-slate-800 mb-1">{t('staffManagement.title')}</h2>
                <p className="text-slate-600 text-xs">{t('staffManagement.subtitle')}</p>
              </div>
            </div>

            <button
              onClick={openModal}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM7 10a2 2 0 11-4 0 2 2 0 014 0zM17 11a2 2 0 11-4 0 2 2 0 014 0zM19 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm">{t('staffManagement.addNewStaff')}</span>
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="ml-3 text-slate-600">{t('staffManagement.loading')}</span>
          </div>
        ) : staff.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 text-center">
            <svg className="w-16 h-16 text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 13a1 1 0 01-1 1H4a1 1 0 01-1-1V7a1 1 0 011-1h16a1 1 0 011 1v6zm-10 1h2m-2 4h2m-4-4h2m-2 4h2m-2-4h2m-2 4h2m-2-4h2m-2 4h2M9 5h6M7 7h10" />
            </svg>
            <h3 className="text-xl font-semibold text-slate-700">{t('staffManagement.noStaffMessage')}</h3>
            <p className="text-slate-500 mt-2 max-w-sm">
              {t('staffManagement.noStaffDescription')}
            </p>
            <button
              onClick={openModal}
              className="mt-6 px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
            >
              {t('staffManagement.addFirstStaff')}
            </button>
          </div>
        ) : (
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {t('staffManagement.table.staffMember')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">
                    {t('staffManagement.table.role')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">
                    {t('staffManagement.table.contact')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {t('staffManagement.table.hourlyRate')}
                  </th>
                  <th scope="col" className="relative px-6 py-3 text-center">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {staff.map(member => (
                  <tr key={member.id} className="hover:bg-slate-50 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {getInitials(member.name)}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-slate-900">{member.name}</div>
                          <div className="text-sm text-slate-500">{member.email}</div>
                          <div className="text-xs text-slate-400">ID: {member.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                      <div className="text-sm text-slate-900">{member.role}</div>
                      <div className="text-sm text-slate-500">{member.maxHours} hours/week</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 hidden sm:table-cell">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {member.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      <div className="font-medium">${member.hourlyRate}</div>
                      <div className="text-xs text-slate-400">
                        {member.availability && member.availability.length > 0 
                          ? `${member.availability.length} day${member.availability.length !== 1 ? 's' : ''} available`
                          : 'No availability set'
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end items-center space-x-2">
                      <button
                        onClick={() => handleEditStaff(member)}
                        className="text-indigo-600 hover:text-indigo-900 px-3 py-1 bg-indigo-50 rounded-md transition-colors duration-150"
                        title="Edit Staff Member"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteStaff(member.id)}
                        className="text-red-600 hover:text-red-900 px-3 py-1 bg-red-50 rounded-md transition-colors duration-150"
                        title="Delete Staff Member"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Staff Modal with Multi-Step Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl relative animate-slide-up">
            <button onClick={closeModal} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            
            <h3 className="text-2xl font-bold text-slate-900 mb-2">
              {isEditMode ? t('staffManagement.modal.editTitle') : t('staffManagement.modal.addTitle')}
            </h3>
            <p className="text-sm text-slate-600 mb-6">
              Step {currentStep} of 2
            </p>

            <form onSubmit={e => e.preventDefault()}>
              {currentStep === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Information Fields */}
                  <div>
                    <label htmlFor="fullName" className="block text-sm font-medium text-slate-900">{t('staffManagement.modal.fullName')}</label>
                    <input type="text" name="fullName" id="fullName" value={newStaffMember.fullName} onChange={handleNewStaffChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 text-slate-900" placeholder="Jane Doe" required />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-900">{t('staffManagement.modal.email')}</label>
                    <input type="email" name="email" id="email" value={newStaffMember.email} onChange={handleNewStaffChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 text-slate-900" placeholder="jane.doe@example.com" required />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-slate-900">{t('staffManagement.modal.phoneNumber')}</label>
                    <input type="tel" name="phone" id="phone" value={newStaffMember.phone} onChange={handleNewStaffChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 text-slate-900" placeholder="(123) 456-7890" />
                  </div>

                  <div>
                    <label htmlFor="role" className="block text-sm font-medium text-slate-900">{t('staffManagement.modal.role')}</label>
                    <input type="text" name="role" id="role" value={newStaffMember.role} onChange={handleNewStaffChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 text-slate-900" placeholder="e.g., Stylist, Server" required />
                  </div>

                  <div>
                    <label htmlFor="hourlyRate" className="block text-sm font-medium text-slate-900">{t('staffManagement.modal.hourlyRate')}</label>
                    <input type="number" name="hourlyRate" id="hourlyRate" value={newStaffMember.hourlyRate} onChange={handleNewStaffChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 text-slate-900" min="0" step="0.01" />
                  </div>

                  <div>
                    <label htmlFor="maxHours" className="block text-sm font-medium text-slate-900">{t('staffManagement.modal.maxHoursWeek')}</label>
                    <input type="number" name="maxHours" id="maxHours" value={newStaffMember.maxHours} onChange={handleNewStaffChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 text-slate-900" min="1" max="168" />
                  </div>

                  {!isEditMode && (
                    <div className="md:col-span-2">
                      <label htmlFor="password" className="block text-sm font-medium text-slate-900">Password</label>
                      <input type="password" name="password" id="password" value={newStaffMember.password} onChange={handleNewStaffChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 text-slate-900" placeholder="••••••••" required />
                    </div>
                  )}
                </div>
              )}

              {currentStep === 2 && (
                <div className="grid grid-cols-1 gap-6">
                  {/* Additional Information Fields */}
                  <div>
                    <label htmlFor="skills" className="block text-sm font-medium text-slate-900">Skills</label>
                    <input type="text" name="skills" id="skills" value={newStaffMember.skills} onChange={handleNewStaffChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 text-slate-900" placeholder="e.g., Barista, Cashier, Customer Service" />
                  </div>

                  <div>
                    <label htmlFor="preferredShifts" className="block text-sm font-medium text-slate-900">Preferred Shifts</label>
                    <input type="text" name="preferredShifts" id="preferredShifts" value={newStaffMember.preferredShifts} onChange={handleNewStaffChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 text-slate-900" placeholder="e.g., Mornings, Weekends" />
                  </div>
                  
                  <div>
                    <label htmlFor="unavailableDays" className="block text-sm font-medium text-slate-900">Unavailable Days</label>
                    <input type="text" name="unavailableDays" id="unavailableDays" value={newStaffMember.unavailableDays} onChange={handleNewStaffChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 text-slate-900" placeholder="e.g., Monday, Wednesday" />
                  </div>

                  <div>
                    <label htmlFor="experienceLevel" className="block text-sm font-medium text-slate-900">Experience Level</label>
                    <input type="text" name="experienceLevel" id="experienceLevel" value={newStaffMember.experienceLevel} onChange={handleNewStaffChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 text-slate-900" placeholder="e.g., Entry-Level, Mid-Level, Senior" />
                  </div>

                  <div>
                    <label htmlFor="certifications" className="block text-sm font-medium text-slate-900">Certifications</label>
                    <input type="text" name="certifications" id="certifications" value={newStaffMember.certifications} onChange={handleNewStaffChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 text-slate-900" placeholder="e.g., CPR, Food Handler Permit" />
                  </div>

                  <div>
                    <label htmlFor="locationPreferences" className="block text-sm font-medium text-slate-900">Location Preferences</label>
                    <input type="text" name="locationPreferences" id="locationPreferences" value={newStaffMember.locationPreferences} onChange={handleNewStaffChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 text-slate-900" placeholder="e.g., Downtown, North Side" />
                  </div>
                </div>
              )}
            </form>

            <div className="mt-8 flex justify-between space-x-3">
              <button
                type="button"
                onClick={closeModal}
                className="px-6 py-3 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                {t('staffManagement.modal.cancel')}
              </button>

              <div className="flex space-x-3">
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={handlePreviousStep}
                    className="px-6 py-3 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Previous
                  </button>
                )}

                {currentStep < 2 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={isEditMode ? handleUpdateStaff : handleAddStaff}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <div className="flex items-center">
                        <svg className="animate-spin h-5 w-5 mr-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {isEditMode ? t('staffManagement.modal.updating') : t('staffManagement.modal.adding')}
                      </div>
                    ) : (
                      isEditMode ? t('staffManagement.modal.updateStaff') : t('staffManagement.modal.addStaff')
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}