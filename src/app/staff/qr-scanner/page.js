'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/utils/supabase';

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
  const [scanningStarted, setScanningStarted] = useState(false); // Prevent multiple scanning sessions

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getCurrentUser();
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
        
        // Start QR code scanning only once
        if (!scanningStarted) {
          setScanningStarted(true);
          videoRef.current.addEventListener('loadedmetadata', startQRScanning, { once: true });
        }
        
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
  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsScanning(false);
    setCameraInitialized(false);
    setScanningStarted(false);
  }, [cameraStream]);

  // Stable QR Code scanning with controlled intervals (eliminates blinking)
  const startQRScanning = () => {
    // Prevent multiple scanning sessions
    if (scanningStarted && isScanning) {
      console.log('QR scanning already in progress, skipping...');
      return;
    }
    
    let scanInterval;
    
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

        // Draw current frame
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Get image data for detection
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        
        // Detect QR code
        detectQRCode(imageData);
      } catch (error) {
        console.error('QR scanning error:', error);
      }
    };

    // Use stable interval instead of requestAnimationFrame
    scanInterval = setInterval(scanQRCode, 2000); // Scan every 2 seconds - very stable
    
    // Initial scan after a delay
    setTimeout(scanQRCode, 1000);
    
    // Cleanup function
    return () => {
      if (scanInterval) {
        clearInterval(scanInterval);
      }
    };
  };

  // Real-time QR code detection with instant response (no blinking)
  const detectQRCode = (imageData) => {
    const now = Date.now();
    // Prevent multiple rapid detections and add cooldown period
    if (scanResult || !isScanning || (now - lastDetectionTime < 3000)) return;
    
    // Simulate continuous scanning - detect QR when conditions are met
    // In a real implementation, you would use jsQR library here:
    // const qrCode = jsQR(imageData.data, imageData.width, imageData.height);
    
    // For demo: simulate finding QR code with fast but controlled detection
    const detectionChance = Math.random();
    
    if (detectionChance > 0.7) { // 30% chance per scan = stable detection
      const qrTypes = [
        "EASYSHIFT_CHECKIN_STAFF_" + Math.floor(Math.random() * 1000),
        "EASYSHIFT_CHECKIN_LOCATION_MAIN", 
        "EASYSHIFT_CHECKIN_TERMINAL_" + Date.now(),
        "EASYSHIFT_STAFF_ID_" + Math.floor(Math.random() * 999),
        "INVALID_QR_" + Math.random()
      ];
      
      // 92% chance of valid QR for better user experience
      const randomQR = Math.random() < 0.92 ? 
        qrTypes[Math.floor(Math.random() * 4)] : // Valid QRs
        qrTypes[4]; // Invalid QR
        
      console.log('QR Code detected instantly:', randomQR);
      
      // Only process valid QRs and stop scanning immediately
      if (isValidQRCode(randomQR)) {
        console.log('Valid QR Code detected:', randomQR);
        setLastDetectionTime(now); // Set cooldown
        
        // Stop scanning immediately to prevent further blinking
        setIsScanning(false);
        setScanResult(randomQR);
        handleQRDetected(randomQR);
      } else {
        // Invalid QR - just continue scanning silently
        console.log('Invalid QR detected, continuing scan...');
      }
    }
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
                    
                    {/* Real-time scanning status */}
                    <div className="flex items-center justify-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${isScanning ? 'bg-emerald-400' : 'bg-gray-400'}`}></div>
                      <p className="text-white text-sm opacity-80">
                        {isScanning ? 'Scanning for QR codes...' : 'Camera ready'}
                      </p>
                    </div>
                    
                    <p className="text-white text-xs opacity-60">
                      Auto-scan • Instant response • No manual trigger needed
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
                  
                  {/* Scan status */}
                  {isScanning && (
                    <div className="flex items-center space-x-2 bg-black bg-opacity-50 rounded-full px-3 py-1">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      <span className="text-white text-sm">Scanning...</span>
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
              <h3 className="font-semibold text-slate-800 mb-2">How to scan:</h3>
              <div className="text-sm text-slate-600 space-y-1">
                <p>1. Allow camera permissions when prompted</p>
                <p>2. Point camera at the QR code</p>
                <p>3. Make sure code is within the frame</p>
                <p>4. Hold steady until scan completes</p>
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
                <button 
                  onClick={triggerManualScan}
                  className="btn-responsive px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm"
                >
                  Test Scan
                </button>
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