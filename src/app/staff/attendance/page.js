'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/app/utils/supabase';
import { useT } from '@/app/utils/translations';

export default function StaffAttendance() {
  const { t } = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const action = searchParams.get('action'); // 'checkin' or 'checkout'
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [user, setUser] = useState(null);
  const [stream, setStream] = useState(null);
  const [cameraPermission, setCameraPermission] = useState('prompt'); // 'granted', 'denied', 'prompt'

  useEffect(() => {
    checkAuth();
    return () => {
      // Clean up camera stream when component unmounts
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [checkAuth, stream]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/staff/login');
    } else {
      setUser(user);
    }
  };

  const initializeCamera = async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user' // Use front camera for selfies
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setIsRecording(true);
        setCameraPermission('granted');
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraPermission('denied');
      if (err.name === 'NotAllowedError') {
        setError('Camera permission denied. Please allow camera access to continue.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found. Please make sure you have a camera connected.');
      } else {
        setError('Failed to access camera. Please try again.');
      }
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw the video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to data URL
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(imageDataUrl);
  };

  const retakePhoto = () => {
    setCapturedImage(null);
  };

  const submitAttendance = async () => {
    if (!capturedImage || !user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Convert data URL to blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      
      // Upload image to Supabase storage
      const fileName = `attendance_${user.id}_${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('attendance-photos')
        .upload(fileName, blob);
      
      if (uploadError) throw uploadError;
      
      // Save attendance record
      const attendanceData = {
        user_id: user.id,
        action: action,
        photo_url: uploadData.path,
        timestamp: new Date().toISOString(),
        location: 'Mobile App' // You could add GPS location here
      };
      
      const { error: dbError } = await supabase
        .from('attendance_records')
        .insert([attendanceData]);
      
      if (dbError) throw dbError;
      
      setSuccess(true);
      
      // Stop camera stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      // Redirect back to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/staff/dashboard');
      }, 2000);
      
    } catch (err) {
      console.error('Attendance submission error:', err);
      setError('Failed to submit attendance. Please try again.');
    }
    
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">
            {action === 'checkin' ? 'Checked In Successfully!' : 'Checked Out Successfully!'}
          </h2>
          <p className="text-slate-600 mb-4">
            Your attendance has been recorded with photo verification.
          </p>
          <p className="text-sm text-slate-500">
            Redirecting to dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/50">
        <div className="container mx-auto px-4 sm:px-6 py-3">
          <nav className="flex items-center space-x-2 text-sm">
            <Link href="/staff/dashboard" className="text-slate-500 hover:text-blue-600 transition-colors duration-200 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Dashboard
            </Link>
            <span className="text-slate-400">/</span>
            <span className="text-slate-700 font-medium">
              {action === 'checkin' ? 'Check In' : 'Check Out'}
            </span>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Title */}
          <div className="text-center mb-8">
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl shadow-lg mb-4 ${
              action === 'checkin' 
                ? 'bg-gradient-to-r from-emerald-500 to-green-600' 
                : 'bg-gradient-to-r from-slate-500 to-gray-600'
            }`}>
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {action === 'checkin' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                )}
              </svg>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">
              {action === 'checkin' ? 'Check In to Work' : 'Check Out from Work'}
            </h1>
            <p className="text-slate-600">
              Take a photo to verify your attendance
            </p>
          </div>

          {/* Camera Section */}
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-4 sm:p-6 mb-6">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg mb-6">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-red-700">{error}</span>
                </div>
              </div>
            )}

            {!isRecording && !capturedImage && (
              <div className="text-center">
                <div className="w-32 h-32 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-16 h-16 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">Camera Access Required</h3>
                <p className="text-slate-600 mb-4">
                  We need to take your photo to verify your attendance
                </p>
                <button
                  onClick={initializeCamera}
                  className="btn-responsive px-6 py-4 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors w-full sm:w-auto min-h-[52px]"
                >
                  <svg className="w-6 h-6 sm:w-5 sm:h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  </svg>
                  <span className="text-base sm:text-sm">Open Camera</span>
                </button>
              </div>
            )}

            {isRecording && !capturedImage && (
              <div className="text-center">
                <div className="relative inline-block rounded-2xl overflow-hidden shadow-lg mb-4 w-full max-w-md mx-auto">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-auto bg-black aspect-[4/3] object-cover"
                  />
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-4 border-2 border-white/50 rounded-2xl"></div>
                    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
                      Position yourself in the frame
                    </div>
                  </div>
                </div>
                <p className="text-slate-600 mb-4">
                  Position yourself in the frame and take a clear photo
                </p>
                <button
                  onClick={capturePhoto}
                  className="btn-responsive px-8 py-4 sm:px-6 sm:py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl sm:rounded-lg transition-colors w-full sm:w-auto min-h-[56px] text-lg sm:text-base shadow-lg"
                >
                  <svg className="w-6 h-6 sm:w-5 sm:h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  </svg>
                  📸 Take Photo
                </button>
              </div>
            )}

            {capturedImage && (
              <div className="text-center">
                <div className="relative inline-block rounded-2xl overflow-hidden shadow-lg mb-4 w-full max-w-md mx-auto">
                  <Image
                    src={capturedImage}
                    alt="Captured attendance photo"
                    width={400}
                    height={300}
                    className="w-full h-auto aspect-[4/3] object-cover"
                  />
                  <div className="absolute top-3 right-3 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                    ✓ Captured
                  </div>
                </div>
                <p className="text-slate-600 mb-4">
                  Photo captured! Review and submit your attendance.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={retakePhoto}
                    className="btn-responsive px-6 py-4 sm:py-3 bg-slate-500 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors min-h-[52px] text-base sm:text-sm"
                  >
                    <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Retake Photo
                  </button>
                  <button
                    onClick={submitAttendance}
                    disabled={loading}
                    className={`btn-responsive px-6 py-4 sm:py-3 font-bold rounded-lg transition-colors min-h-[52px] text-base sm:text-sm ${
                      loading 
                        ? 'bg-slate-400 cursor-not-allowed' 
                        : action === 'checkin'
                          ? 'bg-emerald-600 hover:bg-emerald-700 shadow-lg'
                          : 'bg-slate-800 hover:bg-slate-900 shadow-lg'
                    } text-white`}
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </div>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {action === 'checkin' ? 'Check In' : 'Check Out'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Hidden canvas for image capture */}
            <canvas ref={canvasRef} className="hidden"></canvas>
          </div>

          {/* Info Section */}
          <div className="bg-blue-50/80 backdrop-blur-sm rounded-xl border border-blue-100 p-4">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="text-sm font-semibold text-blue-800 mb-1">Photo Verification Required</h4>
                <p className="text-sm text-blue-700">
                  Your photo helps verify your identity and location for accurate attendance tracking. 
                  All photos are securely stored and only used for attendance purposes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}