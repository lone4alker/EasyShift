'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function StaffManagementPage() {
  const [staff, setStaff] = useState([
    {
      id: 1,
      name: 'Sarah Johnson',
      role: 'Barista',
      email: 'sarah@email.com',
      phone: '(555) 123-4567',
      hourlyRate: 15.5,
      maxHours: 8,
      availability: [
        { day: 'Monday', start: '08:00', end: '16:00' },
        { day: 'Tuesday', start: '08:00', end: '16:00' },
        { day: 'Thursday', start: '10:00', end: '18:00' },
        { day: 'Friday', start: '09:00', end: '15:00' },
        { day: 'Saturday', start: '09:00', end: '15:00' },
      ],
    },
    {
      id: 2,
      name: 'Mike Chen',
      role: 'Cashier',
      email: 'mike@email.com',
      phone: '(555) 234-5678',
      hourlyRate: 14,
      maxHours: 6,
      availability: [
        { day: 'Tuesday', start: '12:00', end: '20:00' },
        { day: 'Wednesday', start: '12:00', end: '20:00' },
        { day: 'Friday', start: '16:00', end: '22:00' },
        { day: 'Saturday', start: '10:00', end: '18:00' },
        { day: 'Sunday', start: '10:00', end: '18:00' },
      ],
    },
  ])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newStaffMember, setNewStaffMember] = useState({
    fullName: '',
    role: '',
    email: '',
    phone: '',
    hourlyRate: 0,
    maxHours: 8,
    availability: [],
  })

  const openModal = () => setIsModalOpen(true)
  const closeModal = () => {
    setIsModalOpen(false)
    setNewStaffMember({
      fullName: '',
      role: '',
      email: '',
      phone: '',
      hourlyRate: 0,
      maxHours: 8,
      availability: [],
    })
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

  const handleAddStaff = () => {
    if (!newStaffMember.fullName || !newStaffMember.role || !newStaffMember.email) {
      alert('Full Name, Role, and Email are required.')
      return
    }
    const newId = staff.length > 0 ? Math.max(...staff.map(s => s.id)) + 1 : 1
    const newStaff = {
      id: newId,
      name: newStaffMember.fullName,
      role: newStaffMember.role,
      email: newStaffMember.email,
      phone: newStaffMember.phone,
      hourlyRate: parseFloat(newStaffMember.hourlyRate),
      maxHours: parseInt(newStaffMember.maxHours),
      availability: newStaffMember.availability,
    }
    setStaff(prev => [...prev, newStaff])
    closeModal()
  }

  const handleDeleteStaff = id => {
    setStaff(prev => prev.filter(member => member.id !== id))
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

              {/* Generate Schedule Button */}
              <button className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center cursor-pointer">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-sm">Generate Schedule</span>
              </button>
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

        {/* Staff Cards Grid */}
        <div className="grid gap-6">
          {staff.map(member => (
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
          ))}
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
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                >
                  Add Staff Member
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}