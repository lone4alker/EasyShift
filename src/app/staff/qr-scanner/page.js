'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/utils/supabase';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { Capacitor } from '@capacitor/core';
import jsQR from 'jsqr';

// Device detection utilities
const isAndroidDevice = () => {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
};

const isMobileDevice = () => {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         (typeof window !== 'undefined' && window.innerWidth <= 768);
};

export default function QRScannerPage() {
  const router = useRouter();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  // State management
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [lastDetectionTime, setLastDetectionTime] = useState(0); // Cooldown to prevent rapid blinking
  const [cameraInitialized, setCameraInitialized] = useState(false); // Prevent multiple initializations
  const [mlkitSupported, setMlkitSupported] = useState(false);
  const [detectionMethod, setDetectionMethod] = useState('web'); // 'mlkit' or 'web'
  const [mlkitScanning, setMlkitScanning] = useState(false);

  // Get current user and check ML Kit support
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    
    const checkMLKitSupport = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const { supported } = await BarcodeScanner.isSupported();
          setMlkitSupported(supported);
          if (supported) {
            setDetectionMethod('mlkit');
            console.log('✅ ML Kit barcode scanning supported');
          } else {
            console.log('❌ ML Kit not supported, using jsQR fallback');
          }
        } catch (error) {
          console.log('❌ ML Kit check failed, using jsQR fallback:', error);
        }
      } else {
        console.log('📱 Web platform detected, using jsQR detection');
      }
    };
    
    getCurrentUser();
    checkMLKitSupport();
  }, []);

  // Start camera with improved permission handling
  const startCamera = useCallback(async () => {
    // Prevent multiple initializations
    if (cameraInitialized || cameraStream) {
      console.log('Camera already initialized, skipping...');
      return;
    }
    
    try {
      setCameraError(null);
      setIsScanning(true);
      setCameraInitialized(true);
      
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported on this browser');
      }

      // Request camera permissions with detailed constraints
      let stream;
      
      // First try: Rear camera (preferred for QR scanning)
      try {
        const rearConstraints = {
          video: {
            width: { ideal: 1920, min: 640 },
            height: { ideal: 1080, min: 480 },
            facingMode: { ideal: 'environment' }, // Rear camera
            frameRate: { ideal: 30, min: 15 }
          },
          audio: false
        };
        
        console.log('Requesting rear camera access...');
        stream = await navigator.mediaDevices.getUserMedia(rearConstraints);
        console.log('Rear camera access granted');
      } catch (rearCameraError) {
        console.warn('Rear camera failed, trying front camera:', rearCameraError);
        
        // Second try: Front camera fallback
        try {
          const frontConstraints = {
            video: {
              width: { ideal: 1280, min: 640 },
              height: { ideal: 720, min: 480 },
              facingMode: 'user',
              frameRate: { ideal: 30, min: 15 }
            },
            audio: false
          };
          
          console.log('Requesting front camera access...');
          stream = await navigator.mediaDevices.getUserMedia(frontConstraints);
          console.log('Front camera access granted');
        } catch (frontCameraError) {
          console.warn('Front camera failed, trying any camera:', frontCameraError);
          
          // Third try: Any available camera
          const basicConstraints = {
            video: {
              width: { ideal: 1280, min: 320 },
              height: { ideal: 720, min: 240 }
            },
            audio: false
          };
          
          console.log('Requesting any camera access...');
          stream = await navigator.mediaDevices.getUserMedia(basicConstraints);
          console.log('Camera access granted');
        }
      }
      
      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
        setCameraStream(stream);
        
        // Start QR code scanning once video is loaded
        videoRef.current.addEventListener('loadedmetadata', startQRScanning);
        
        console.log('Camera stream initialized successfully');
      } else {
        throw new Error('Failed to initialize camera stream');
      }
    } catch (err) {
      console.error('Camera access error:', err);
      
      // Provide user-friendly error messages
      let errorMessage = 'Unable to access camera. ';
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage += 'Please allow camera permissions and try again.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage += 'No camera found on this device.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage += 'Camera is already in use by another application.';
      } else if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
        errorMessage += 'Camera constraints not supported.';
      } else {
        errorMessage += 'Please check your camera and browser settings.';
      }
      
      setCameraError(errorMessage);
      setIsScanning(false);
      setCameraInitialized(false);
    }
  }, [cameraInitialized, cameraStream]);

  // Stop camera
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsScanning(false);
  };

  // Enhanced QR scanning with ML Kit + jsQR dual detection
  const startQRScanning = () => {
    let scanInterval;
    
    // Start ML Kit scanning if supported (native platforms)
    if (mlkitSupported && detectionMethod === 'mlkit') {
      console.log('🚀 Starting ML Kit detection...');
      startMLKitScanning();
    }
    
    // Always run jsQR as backup/web detection
    const scanQRCode = () => {
      if (!videoRef.current || !canvasRef.current || !isScanning || scanResult) {
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Only proceed if video is ready
      if (video.readyState < video.HAVE_CURRENT_DATA) {
        return;
      }

      try {
        const context = canvas.getContext('2d');

        // Set canvas dimensions only if needed (prevent constant resizing)
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        // Clear previous drawings
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw current frame
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Get image data for jsQR detection
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        
        // Detect QR code using jsQR
        detectQRCode(imageData);
      } catch (error) {
        console.error('QR scanning error:', error);
      }
    };

    // Use optimized interval for jsQR scanning
    scanInterval = setInterval(scanQRCode, mlkitSupported ? 1000 : 500); // Slower if ML Kit is also running
    
    // Initial scan after a delay
    setTimeout(scanQRCode, 500);
    
    console.log(`📱 Detection active: ${detectionMethod} ${mlkitSupported ? '+ jsQR backup' : 'jsQR only'}`);
    
    // Cleanup function
    return () => {
      if (scanInterval) {
        clearInterval(scanInterval);
      }
    };
  };

  // Enhanced QR code detection using ML Kit + jsQR
  const detectQRCode = (imageData) => {
    const now = Date.now();
    // Prevent multiple rapid detections and add cooldown period
    if (scanResult || !isScanning || (now - lastDetectionTime < 1000)) return;
    
    try {
      // Use jsQR for web-based detection
      const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });
      
      if (qrCode && qrCode.data) {
        console.log('📱 jsQR detected:', qrCode.data);
        
        // Draw detection rectangle for visual feedback
        if (canvasRef.current) {
          const canvas = canvasRef.current;
          const context = canvas.getContext('2d');
          
          // Draw detection overlay
          context.strokeStyle = '#10B981'; // Emerald color
          context.lineWidth = 4;
          context.beginPath();
          
          const { topLeftCorner, topRightCorner, bottomRightCorner, bottomLeftCorner } = qrCode.location;
          context.moveTo(topLeftCorner.x, topLeftCorner.y);
          context.lineTo(topRightCorner.x, topRightCorner.y);
          context.lineTo(bottomRightCorner.x, bottomRightCorner.y);
          context.lineTo(bottomLeftCorner.x, bottomLeftCorner.y);
          context.closePath();
          context.stroke();
        }
        
        // Process detected QR code
        if (isValidQRCode(qrCode.data)) {
          console.log('✅ Valid QR Code detected via jsQR:', qrCode.data);
          setLastDetectionTime(now);
          setIsScanning(false);
          setScanResult(qrCode.data);
          handleQRDetected(qrCode.data);
        } else {
          console.log('❌ Invalid QR detected via jsQR, continuing scan...');
        }
      }
    } catch (error) {
      console.error('jsQR detection error:', error);
    }
  };
  
  // ML Kit native scanning function
  const startMLKitScanning = async () => {
    if (!mlkitSupported || mlkitScanning) return;
    
    try {
      setMlkitScanning(true);
      console.log('🚀 Starting ML Kit scanning...');
      
      // Check permissions
      const { granted } = await BarcodeScanner.checkPermissions();
      if (!granted) {
        const { granted: requestGranted } = await BarcodeScanner.requestPermissions();
        if (!requestGranted) {
          console.log('❌ ML Kit permission denied');
          setMlkitScanning(false);
          return;
        }
      }
      
      // Configure ML Kit scanning
      const scanOptions = {
        formats: ['QR_CODE'], // Focus on QR codes only
        lensFacing: 'back', // Use back camera
      };
      
      // Start ML Kit scanning
      const { barcodes } = await BarcodeScanner.scan(scanOptions);
      
      if (barcodes && barcodes.length > 0) {
        // Find the best QR code (largest area)
        const bestQR = barcodes.reduce((best, current) => {
          const currentArea = current.cornerPoints ? 
            calculateBoundingBoxArea(current.cornerPoints) : 0;
          const bestArea = best.cornerPoints ? 
            calculateBoundingBoxArea(best.cornerPoints) : 0;
          
          return currentArea > bestArea ? current : best;
        });
        
        console.log('🎯 ML Kit detected:', bestQR.rawValue);
        
        if (isValidQRCode(bestQR.rawValue)) {
          console.log('✅ Valid QR Code detected via ML Kit:', bestQR.rawValue);
          setIsScanning(false);
          setScanResult(bestQR.rawValue);
          handleQRDetected(bestQR.rawValue);
        }
      }
    } catch (error) {
      console.error('ML Kit scanning error:', error);
      if (error.message && !error.message.includes('cancelled')) {
        setCameraError('ML Kit scanning failed: ' + error.message);
      }
    } finally {
      setMlkitScanning(false);
    }
  };
  
  // Helper function to calculate bounding box area
  const calculateBoundingBoxArea = (cornerPoints) => {
    if (!cornerPoints || cornerPoints.length < 4) return 0;
    
    const width = Math.abs(cornerPoints[1].x - cornerPoints[0].x);
    const height = Math.abs(cornerPoints[2].y - cornerPoints[0].y);
    return width * height;
  };

  // Validate QR code format
  const isValidQRCode = (qrData) => {
    if (!qrData || typeof qrData !== 'string') return false;
    
    // Valid QR patterns for EasyShift
    const validPatterns = [
      /^EASYSHIFT_CHECKIN_/,
      /^EASYSHIFT_LOCATION_/,
      /^EASYSHIFT_STAFF_/
    ];
    
    return validPatterns.some(pattern => pattern.test(qrData));
  };

  // Manual QR trigger for testing
  const triggerManualScan = () => {
    if (!scanResult && isScanning) {
      const mockQRData = "EASYSHIFT_CHECKIN_MANUAL_" + Date.now();
      handleQRDetected(mockQRData);
    }
  };

  // Handle QR code detection
  const handleQRDetected = async (qrData) => {
    if (scanResult) return; // Prevent multiple scans
    
    console.log('Processing QR code:', qrData);
    setScanResult(qrData);
    setIsScanning(false);
    
    // Validate QR code format
    if (isValidQRCode(qrData)) {
      console.log('Valid QR code detected, processing check-in...');
      // Valid QR code - process check-in
      await processCheckIn(qrData);
    } else {
      console.log('Invalid QR code detected');
      // Invalid QR code
      setCameraError('Invalid QR code. Please scan a valid EasyShift attendance QR code.');
      setTimeout(() => {
        setScanResult(null);
        setCameraError(null);
        setIsScanning(true);
      }, 3000);
    }
  };

  // Process check-in
  const processCheckIn = async (qrData) => {
    try {
      if (!user) {
        setCameraError('User not authenticated');
        return;
      }

      console.log('Processing check-in for user:', user.email);
      
      // Save check-in status to localStorage for dashboard
      const checkInData = {
        userId: user.id,
        email: user.email,
        qrCode: qrData,
        timestamp: new Date().toISOString(),
        status: 'checked_in'
      };
      
      localStorage.setItem('easyshift_checkin_status', JSON.stringify(checkInData));
      console.log('Check-in data saved:', checkInData);
      
      // Here you would normally save to Supabase database
      // For now, we'll use localStorage and show success
      setIsCheckedIn(true);
      
      // Stop camera
      stopCamera();
      
      // Navigate back to dashboard after 1.5 seconds
      setTimeout(() => {
        router.push('/staff/dashboard?checkedIn=true');
      }, 1500);
      
    } catch (error) {
      console.error('Check-in error:', error);
      setCameraError('Failed to check in. Please try again.');
    }
  };

  // Initialize camera once on component mount
  useEffect(() => {
    let isMounted = true;
    
    // Small delay to ensure component is fully mounted
    const timer = setTimeout(() => {
      if (isMounted) {
        startCamera();
      }
    }, 500);

    // Cleanup on unmount
    return () => {
      isMounted = false;
      clearTimeout(timer);
      stopCamera();
    };
  }, []); // Empty dependency array - run only once

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="flex items-center justify-between p-4">
          <button 
            onClick={() => router.back()} 
            className="btn-responsive p-2 text-slate-600 hover:text-slate-900"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-slate-800">QR Scanner</h1>
          <div className="w-10"></div> {/* Spacer */}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Camera Preview */}
        <div className="relative flex-1 bg-black">
          {cameraError ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
              <div className="text-center p-6 max-w-sm mx-auto">
                <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0118.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </div>
                <h3 className="text-white text-lg font-semibold mb-2">Camera Access Required</h3>
                <p className="text-white text-sm mb-4 leading-relaxed">{cameraError}</p>
                
                {cameraError.includes('permission') && (
                  <div className="bg-blue-900 bg-opacity-50 rounded-lg p-3 mb-4">
                    <p className="text-blue-200 text-xs leading-relaxed">
                      📱 <strong>On Android:</strong> Tap &quot;Allow&quot; when prompted<br/>
                      💻 <strong>On Desktop:</strong> Click the camera icon in address bar
                    </p>
                  </div>
                )}
                
                <div className="space-y-2">
                  <button 
                    onClick={startCamera} 
                    className="btn-responsive w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                  >
                    Request Camera Access
                  </button>
                  <button 
                    onClick={() => window.location.reload()} 
                    className="btn-responsive w-full px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-sm"
                  >
                    Reload Page
                  </button>
                </div>
              </div>
            </div>
          ) : isCheckedIn ? (
            <div className="absolute inset-0 flex items-center justify-center bg-emerald-600">
              <div className="text-center p-6">
                <div className="w-20 h-20 mx-auto mb-4 bg-white rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Checked In!</h2>
                <p className="text-emerald-100">Redirecting to dashboard...</p>
              </div>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {/* QR Scanning Overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  {/* QR Frame with Enhanced Scanning Animation */}
                  <div className="w-64 h-64 relative border-2 border-white border-opacity-70 rounded-lg">
                    {/* Animated corner guides */}
                    <div className={`absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 rounded-tl-lg ${isScanning ? 'border-emerald-400' : 'border-white'}`}></div>
                    <div className={`absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 rounded-tr-lg ${isScanning ? 'border-emerald-400' : 'border-white'}`}></div>
                    <div className={`absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 rounded-bl-lg ${isScanning ? 'border-emerald-400' : 'border-white'}`}></div>
                    <div className={`absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 rounded-br-lg ${isScanning ? 'border-emerald-400' : 'border-white'}`}></div>
                    
                    {/* Static scanning indicator */}
                    {isScanning && (
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <div className="w-6 h-0.5 bg-emerald-400 opacity-60"></div>
                        <div className="w-0.5 h-6 bg-emerald-400 opacity-60 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
                      </div>
                    )}
                  </div>
                  
                  {/* Instructions with Enhanced Status */}
                  <div className="mt-6 text-center space-y-3">
                    <p className="text-white text-lg font-semibold">
                      {isScanning ? 'Scanning QR Code...' : 'Position QR code in frame'}
                    </p>
                    
                    {/* Enhanced scanning status with detection method */}
                    <div className="flex items-center justify-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${isScanning ? 'bg-emerald-400' : 'bg-gray-400'}`}></div>
                      <p className="text-white text-sm opacity-80">
                        {isScanning ? 
                          `${detectionMethod === 'mlkit' ? '🚀 ML Kit' : '📱 jsQR'} scanning...` : 
                          'Camera ready'
                        }
                      </p>
                    </div>
                    
                    <p className="text-white text-xs opacity-60">
                      {mlkitSupported ? 
                        'ML Kit + jsQR • Enhanced recognition • Auto-detection' :
                        'jsQR detection • Auto-scan • Instant response'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Indicators */}
              <div className="absolute top-4 left-4 right-4">
                <div className="flex justify-between items-center">
                  {/* Camera status */}
                  <div className="flex items-center space-x-2 bg-black bg-opacity-50 rounded-full px-3 py-1">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                    <span className="text-white text-sm">Camera Active</span>
                  </div>
                  
                  {/* Enhanced scan status */}
                  {isScanning && (
                    <div className="flex items-center space-x-2 bg-black bg-opacity-50 rounded-full px-3 py-1">
                      <div className={`w-2 h-2 rounded-full ${mlkitSupported ? 'bg-purple-400' : 'bg-blue-400'}`}></div>
                      <span className="text-white text-sm">
                        {mlkitSupported ? 'ML Kit + jsQR' : 'jsQR Scanning'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Bottom Instructions and Controls */}
        <div className="bg-white p-4 border-t">
          <div className="text-center space-y-4">
            <div>
              <h3 className="font-semibold text-slate-800 mb-2">
                Enhanced QR Scanner {mlkitSupported && '🚀'}
              </h3>
              <div className="text-sm text-slate-600 space-y-1">
                <p>1. Allow camera permissions when prompted</p>
                <p>2. Point camera at the QR code</p>
                <p>3. {mlkitSupported ? 'ML Kit will auto-detect instantly' : 'Hold steady within the frame'}</p>
                <p>4. {mlkitSupported ? 'No need for perfect alignment' : 'Wait for automatic detection'}</p>
              </div>
              
              {/* Detection method indicator */}
              <div className="mt-3 p-2 bg-slate-50 rounded-lg">
                <div className="text-xs text-slate-500 flex items-center justify-center space-x-2">
                  {mlkitSupported ? (
                    <>
                      <span className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span>ML Kit Native</span>
                      </span>
                      <span>+</span>
                      <span className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span>jsQR Backup</span>
                      </span>
                    </>
                  ) : (
                    <span className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>jsQR Web Detection</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Control buttons */}
            <div className="flex justify-center gap-3">
              {!cameraStream && (
                <button 
                  onClick={startCamera}
                  className="btn-responsive px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
                >
                  Enable Camera
                </button>
              )}
              
              {isScanning && (
                <div className="flex gap-2">
                  <button 
                    onClick={triggerManualScan}
                    className="btn-responsive px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm"
                  >
                    Test Scan
                  </button>
                  
                  {mlkitSupported && !mlkitScanning && (
                    <button 
                      onClick={startMLKitScanning}
                      className="btn-responsive px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm"
                    >
                      🚀 ML Kit Scan
                    </button>
                  )}
                  
                  {mlkitScanning && (
                    <div className="px-4 py-2 bg-purple-100 text-purple-800 rounded-lg text-sm flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>ML Kit Active...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Permission help */}
            <div className="text-xs text-slate-500 mt-2">
              <p>📱 On mobile: Tap &quot;Allow&quot; when browser asks for camera permission</p>
              <p>💻 On desktop: Click &quot;Allow&quot; in the camera permission popup</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}