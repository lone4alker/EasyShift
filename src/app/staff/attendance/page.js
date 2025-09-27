'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/app/utils/supabase';
import { useT } from '@/app/utils/translations';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { Capacitor } from '@capacitor/core';

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
  const [isScanning, setIsScanning] = useState(false);
  const [qrScanned, setQrScanned] = useState(null);
  const [useQRMode, setUseQRMode] = useState(false); // Toggle between photo and QR mode

  const checkAuth = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/staff/login');
    } else {
      setUser(user);
    }
  }, [router]);

  useEffect(() => {
    checkAuth();
    return () => {
      // Clean up camera stream when component unmounts
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [checkAuth, stream]);

  // Check if native barcode scanner is available
  const isNativeSupported = Capacitor.isNativePlatform();

  // Professional QR Code scanning with enhanced ML Kit configuration
  const startQRScanning = async () => {
    try {
      setError(null);
      setIsScanning(true);

      // Check if supported
      const { supported } = await BarcodeScanner.isSupported();
      if (!supported) {
        setError('QR code scanning is not supported on this device');
        setIsScanning(false);
        return;
      }

      // Check and request permissions
      const { granted } = await BarcodeScanner.checkPermissions();
      if (!granted) {
        const { granted: requestGranted } = await BarcodeScanner.requestPermissions();
        if (!requestGranted) {
          setError('Camera permission is required for QR code scanning');
          setIsScanning(false);
          return;
        }
      }

      // Enhanced scanning configuration for professional QR recognition
      const scanOptions = {
        formats: ['QR_CODE'], // Focus only on QR codes for better performance
        lensFacing: 'back', // Use back camera for better scanning
      };

      console.log('Starting professional QR scan...');
      
      // Start continuous scanning with enhanced detection
      const { barcodes } = await BarcodeScanner.scan(scanOptions);
      
      if (barcodes && barcodes.length > 0) {
        // Find the best QR code (highest confidence or largest area)
        const bestQR = barcodes.reduce((best, current) => {
          // Prefer QR codes with higher confidence or larger corner points
          const currentArea = current.cornerPoints ? 
            calculateBoundingBoxArea(current.cornerPoints) : 0;
          const bestArea = best.cornerPoints ? 
            calculateBoundingBoxArea(best.cornerPoints) : 0;
          
          return currentArea > bestArea ? current : best;
        });

        console.log('QR Code detected:', bestQR.rawValue);
        setQrScanned(bestQR.rawValue);
        setIsScanning(false);
        
        // Auto-submit when QR is scanned
        await submitQRAttendance(bestQR.rawValue);
      } else {
        // If no QR detected, provide helpful guidance and stop scanning
        console.log('No QR codes detected in this scan');
        setError('No QR code detected. Please ensure the QR code is clearly visible and well-lit, then try again.');
        setIsScanning(false);
      }
    } catch (err) {
      console.error('QR Scanning error:', err);
      if (err.message.includes('cancelled')) {
        setError('QR scanning was cancelled');
      } else if (err.message.includes('permission')) {
        setError('Camera permission is required for QR scanning');
      } else {
        setError('Failed to scan QR code. Please ensure good lighting and try again.');
      }
      setIsScanning(false);
    }
  };

  // Helper function to calculate bounding box area for QR selection
  const calculateBoundingBoxArea = (cornerPoints) => {
    if (!cornerPoints || cornerPoints.length < 4) return 0;
    
    // Calculate area using corner points (simplified rectangle area)
    const width = Math.abs(cornerPoints[1].x - cornerPoints[0].x);
    const height = Math.abs(cornerPoints[2].y - cornerPoints[0].y);
    return width * height;
  };

  const stopQRScanning = async () => {
    try {
      await BarcodeScanner.stopScan();
      setIsScanning(false);
    } catch (err) {
      console.error('Error stopping QR scan:', err);
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

  // Submit attendance with QR code data
  const submitQRAttendance = async (qrContent) => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('Submitting QR attendance with content:', qrContent);
      
      // Save attendance record with QR data
      const attendanceData = {
        user_id: user.id,
        action: action,
        qr_data: qrContent,
        timestamp: new Date().toISOString(),
        location: 'Mobile App - Professional QR Scanner'
      };
      
      const { error: dbError } = await supabase
        .from('attendance_records')
        .insert([attendanceData]);
      
      if (dbError) throw dbError;
      
      // Ensure qrScanned flag is set for success message
      setQrScanned(qrContent);
      setSuccess(true);
      
      console.log('QR attendance submitted successfully');
      
      // Redirect back to dashboard after 2.5 seconds (slightly longer to show QR success message)
      setTimeout(() => {
        router.push('/staff/dashboard?qr_checkin=success');
      }, 2500);
      
    } catch (err) {
      console.error('QR Attendance submission error:', err);
      setError('Failed to submit QR attendance. Please check your connection and try again.');
      setIsScanning(false);
    }
    
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-8 max-w-md w-full text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
            qrScanned ? 'bg-gradient-to-r from-blue-500 to-indigo-600' : 'bg-green-500'
          }`}>
            {qrScanned ? (
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">
            {action === 'checkin' ? 'Checked In Successfully!' : 'Checked Out Successfully!'}
          </h2>
          <p className="text-slate-600 mb-4">
            {qrScanned 
              ? 'Your attendance has been recorded via QR code scanning.'
              : 'Your attendance has been recorded with photo verification.'
            }
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
              {isNativeSupported 
                ? 'Scan a QR code or take a photo to verify your attendance'
                : 'Take a photo to verify your attendance'
              }
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

            {!isRecording && !capturedImage && !isScanning && (
              <div className="text-center">
                <div className="w-32 h-32 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-16 h-16 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {useQRMode ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    ) : (
                      <>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </>
                    )}
                  </svg>
                </div>
                
                {/* Mode Toggle */}
                {isNativeSupported && (
                  <div className="mb-4">
                    <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-50">
                      <button
                        onClick={() => setUseQRMode(false)}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                          !useQRMode 
                            ? 'bg-white text-slate-900 shadow-sm' 
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        📸 Photo Mode
                      </button>
                      <button
                        onClick={() => setUseQRMode(true)}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                          useQRMode 
                            ? 'bg-white text-slate-900 shadow-sm' 
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        📱 QR Code Mode
                      </button>
                    </div>
                  </div>
                )}

                <h3 className="text-lg font-semibold text-slate-800 mb-2">
                  {useQRMode ? 'QR Code Scanning' : 'Camera Access Required'}
                </h3>
                <p className="text-slate-600 mb-4">
                  {useQRMode 
                    ? 'Scan a QR code to mark your attendance instantly'
                    : 'Take a photo to verify your attendance'
                  }
                </p>
                
                <button
                  onClick={useQRMode ? startQRScanning : initializeCamera}
                  className="btn-responsive px-6 py-4 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors w-full sm:w-auto min-h-[52px]"
                >
                  <svg className="w-6 h-6 sm:w-5 sm:h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {useQRMode ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    )}
                  </svg>
                  <span className="text-base sm:text-sm">
                    {useQRMode ? 'Start QR Scanning' : 'Open Camera'}
                  </span>
                </button>
              </div>
            )}

            {/* Professional QR Scanning State */}
            {isScanning && (
              <div className="text-center">
                {/* Professional scanning animation */}
                <div className="relative w-48 h-48 mx-auto mb-6">
                  <div className="absolute inset-0 border-2 border-blue-200 rounded-2xl"></div>
                  
                  {/* Corner brackets for professional look */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
                  
                  {/* Scanning line animation */}
                  <div className="absolute inset-2 flex items-center justify-center">
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-pulse"></div>
                  </div>
                  
                  {/* Center QR icon */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center">
                      <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-slate-800 mb-2">🔍 Professional QR Scanner Active</h3>
                <p className="text-slate-600 mb-2">
                  Hold any QR code in view of your camera
                </p>
                <p className="text-sm text-slate-500 mb-6">
                  • No need to fit perfectly in frame<br/>
                  • Works at any angle or distance<br/>
                  • Auto-detection when QR is visible
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-center space-x-2 text-sm text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Camera scanning active...</span>
                  </div>
                  
                  <button
                    onClick={stopQRScanning}
                    className="btn-responsive px-6 py-4 sm:py-3 bg-slate-500 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors min-h-[52px] text-base sm:text-sm"
                  >
                    <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cancel Scanning
                  </button>
                </div>
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
                <h4 className="text-sm font-semibold text-blue-800 mb-1">
                  {useQRMode ? 'QR Code Attendance' : 'Photo Verification Required'}
                </h4>
                <p className="text-sm text-blue-700">
                  {useQRMode ? (
                    <>
                      Scan any QR code to instantly mark your attendance. The QR data will be recorded for verification. 
                      This method is faster and works great in low-light conditions.
                    </>
                  ) : (
                    <>
                      Your photo helps verify your identity and location for accurate attendance tracking. 
                      All photos are securely stored and only used for attendance purposes.
                    </>
                  )}
                </p>
                {isNativeSupported && (
                  <p className="text-xs text-blue-600 mt-2">
                    💡 Tip: Switch to QR Code mode for faster attendance marking!
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}