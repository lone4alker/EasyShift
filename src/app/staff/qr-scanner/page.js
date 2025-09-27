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
  const [uploadProcessing, setUploadProcessing] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);

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

  // Aggressive QR scanning with high frequency detection
  const startQRScanning = () => {
    let scanInterval;
    let mlkitInterval;
    
    console.log('🔥 Starting aggressive QR detection...');
    
    // Start ML Kit scanning if supported (native platforms)
    if (mlkitSupported && detectionMethod === 'mlkit') {
      console.log('🚀 Starting ML Kit detection...');
      // Try ML Kit immediately and then every 3 seconds
      startMLKitScanning();
      mlkitInterval = setInterval(() => {
        if (isScanning && !scanResult) {
          startMLKitScanning();
        }
      }, 3000);
    }
    
    // Aggressive jsQR scanning - very frequent
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

        // Set canvas dimensions
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw current frame to hidden canvas for processing
        const processingCanvas = document.createElement('canvas');
        const processingContext = processingCanvas.getContext('2d');
        processingCanvas.width = video.videoWidth;
        processingCanvas.height = video.videoHeight;
        
        processingContext.drawImage(video, 0, 0, processingCanvas.width, processingCanvas.height);

        // Get image data for jsQR detection
        const imageData = processingContext.getImageData(0, 0, processingCanvas.width, processingCanvas.height);
        
        // Detect QR code using jsQR
        detectQRCode(imageData);
      } catch (error) {
        console.error('QR scanning error:', error);
      }
    };

    // Very frequent scanning for immediate detection
    scanInterval = setInterval(scanQRCode, 300); // Every 300ms for quick response
    
    // Initial scan immediately
    setTimeout(scanQRCode, 100);
    
    console.log(`🎯 Aggressive detection active: jsQR every 300ms ${mlkitSupported ? '+ ML Kit every 3s' : ''}`);
    
    // Cleanup function
    return () => {
      if (scanInterval) {
        clearInterval(scanInterval);
      }
      if (mlkitInterval) {
        clearInterval(mlkitInterval);
      }
    };
  };

  // Simplified and robust QR detection - detects ANY QR code pattern
  const detectQRCode = async (imageData) => {
    const now = Date.now();
    // Prevent multiple rapid detections and add cooldown period
    if (scanResult || !isScanning || (now - lastDetectionTime < 2000)) return;
    
    try {
      console.log('🔍 Scanning frame for QR codes...');
      
      // Use jsQR for reliable detection
      const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "attemptBoth", // Try both normal and inverted
      });
      
      if (qrCode && qrCode.data) {
        console.log('🎯 QR CODE FOUND:', qrCode.data);
        
        // Draw green rectangle around detected QR
        if (canvasRef.current && videoRef.current) {
          const canvas = canvasRef.current;
          const video = videoRef.current;
          const context = canvas.getContext('2d');
          
          // Make canvas visible for feedback
          canvas.style.position = 'absolute';
          canvas.style.top = '0';
          canvas.style.left = '0';
          canvas.style.width = '100%';
          canvas.style.height = '100%';
          canvas.style.pointerEvents = 'none';
          canvas.style.zIndex = '10';
          
          // Set canvas size to match video
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          // Clear and draw detection rectangle
          context.clearRect(0, 0, canvas.width, canvas.height);
          context.strokeStyle = '#00FF00'; // Bright green
          context.lineWidth = 6;
          context.beginPath();
          
          const { topLeftCorner, topRightCorner, bottomRightCorner, bottomLeftCorner } = qrCode.location;
          context.moveTo(topLeftCorner.x, topLeftCorner.y);
          context.lineTo(topRightCorner.x, topRightCorner.y);
          context.lineTo(bottomRightCorner.x, bottomRightCorner.y);
          context.lineTo(bottomLeftCorner.x, bottomLeftCorner.y);
          context.closePath();
          context.stroke();
          
          // Add success indicator
          context.fillStyle = '#00FF00';
          context.font = '20px Arial';
          context.fillText('QR DETECTED!', 10, 30);
        }
        
        // ANY QR code is valid - just redirect immediately
        console.log('✅ QR Code detected, redirecting to dashboard...');
        setLastDetectionTime(now);
        setIsScanning(false);
        setScanResult(qrCode.data);
        
        // Immediate success feedback and redirect
        handleQRSuccess(qrCode.data);
        
      } else {
        // Clear any previous detection rectangles
        if (canvasRef.current) {
          const context = canvasRef.current.getContext('2d');
          context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }
    } catch (error) {
      console.error('QR detection error:', error);
    }
  };
  
  // Simplified success handler - just redirect on ANY QR detection
  const handleQRSuccess = async (qrData) => {
    console.log('🎉 QR DETECTED - Processing:', qrData);
    
    try {
      // Stop all scanning immediately
      setIsScanning(false);
      setScanResult(qrData);
      setIsCheckedIn(true);
      
      // Save the QR data and mark as checked in
      if (user) {
        const checkInData = {
          userId: user.id,
          email: user.email,
          qrCode: qrData,
          timestamp: new Date().toISOString(),
          status: 'checked_in'
        };
        
        localStorage.setItem('easyshift_checkin_status', JSON.stringify(checkInData));
        console.log('💾 Check-in data saved:', checkInData);
        
        // Try to save to database
        try {
          const { error: dbError } = await supabase
            .from('attendance_records')
            .insert([{
              user_id: user.id,
              action: 'checkin',
              qr_data: qrData,
              timestamp: new Date().toISOString(),
              location: 'QR Scanner'
            }]);
          
          if (dbError) {
            console.warn('Database save failed:', dbError);
          } else {
            console.log('✅ Saved to database successfully');
          }
        } catch (dbErr) {
          console.warn('Database connection failed:', dbErr);
        }
      }
      
      // Stop camera
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }
      
      // Redirect to dashboard after brief success message
      setTimeout(() => {
        console.log('🔄 Redirecting to dashboard...');
        router.push('/staff/dashboard?checkedIn=true&qr=success');
      }, 1500);
      
    } catch (error) {
      console.error('❌ QR processing error:', error);
      setCameraError('QR processed but redirect failed: ' + error.message);
    }
  };
  
  // Enhanced ML Kit scanning with immediate redirect
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
        formats: ['QR_CODE', 'DATA_MATRIX', 'CODE_128', 'CODE_39'], // Accept multiple formats
        lensFacing: 'back',
      };
      
      // Start ML Kit scanning
      const { barcodes } = await BarcodeScanner.scan(scanOptions);
      
      if (barcodes && barcodes.length > 0) {
        const firstBarcode = barcodes[0]; // Take first detected code
        console.log('🎯 ML Kit detected:', firstBarcode.rawValue);
        
        // ANY barcode/QR is valid - redirect immediately
        handleQRSuccess(firstBarcode.rawValue);
      }
    } catch (error) {
      console.error('ML Kit scanning error:', error);
      if (!error.message?.includes('cancelled')) {
        console.log('ML Kit failed, continuing with jsQR...');
      }
    } finally {
      setMlkitScanning(false);
    }
  };

  // Accept ANY QR code - no validation needed
  const isValidQRCode = (qrData) => {
    // Accept ANY string data from QR codes - no restrictions
    console.log('🔍 Checking QR data:', qrData);
    return qrData && typeof qrData === 'string' && qrData.length > 0;
  };

  // Manual QR trigger for testing - simulate any QR code detection
  const triggerManualScan = () => {
    if (!scanResult && isScanning) {
      const mockQRData = "TEST_QR_" + Date.now();
      console.log('🧪 Manual test QR triggered:', mockQRData);
      handleQRSuccess(mockQRData);
    }
  };

  // Handle QR code image upload
  const handleQRUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    console.log('📁 QR image uploaded:', file.name);
    setUploadProcessing(true);

    try {
      // Create image element to load the uploaded file
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Create object URL for the uploaded file
      const imageUrl = URL.createObjectURL(file);
      setUploadedImage(imageUrl);

      img.onload = () => {
        try {
          console.log('🖼️ Processing uploaded image...');
          
          // Set canvas dimensions to match image
          canvas.width = img.width;
          canvas.height = img.height;
          
          // Draw image to canvas
          ctx.drawImage(img, 0, 0);
          
          // Get image data for QR detection
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          // Try to detect QR code using jsQR
          const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "attemptBoth",
          });
          
          if (qrCode && qrCode.data) {
            console.log('✅ QR detected in uploaded image:', qrCode.data);
            
            // Stop camera scanning
            setIsScanning(false);
            
            // Process the detected QR code
            handleQRSuccess(qrCode.data);
          } else {
            console.log('❌ No QR code found in uploaded image');
            setCameraError('No QR code found in the uploaded image. Please try a different image.');
            
            // Reset upload state after 3 seconds
            setTimeout(() => {
              setCameraError(null);
              setUploadProcessing(false);
              setUploadedImage(null);
            }, 3000);
          }
          
          // Clean up object URL
          URL.revokeObjectURL(imageUrl);
        } catch (error) {
          console.error('❌ QR processing error:', error);
          setCameraError('Failed to process uploaded image. Please try again.');
          setUploadProcessing(false);
          setUploadedImage(null);
          URL.revokeObjectURL(imageUrl);
        }
      };

      img.onerror = () => {
        console.error('❌ Failed to load uploaded image');
        setCameraError('Failed to load image. Please upload a valid image file.');
        setUploadProcessing(false);
        setUploadedImage(null);
        URL.revokeObjectURL(imageUrl);
      };

      // Start loading the image
      img.src = imageUrl;
      
    } catch (error) {
      console.error('❌ Upload processing error:', error);
      setCameraError('Failed to process upload. Please try again.');
      setUploadProcessing(false);
      setUploadedImage(null);
    }
  };

  // Trigger file input click
  const triggerUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = handleQRUpload;
    input.click();
  };

  // Simplified QR detection handler - accept any QR and redirect
  const handleQRDetected = async (qrData) => {
    if (scanResult) return; // Prevent multiple scans
    
    console.log('🎯 ANY QR DETECTED - Processing immediately:', qrData);
    
    // Accept ANY QR code and redirect immediately
    handleQRSuccess(qrData);
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
                <p className="text-emerald-100">
                  {uploadedImage ? 'QR detected from uploaded image!' : 'Redirecting to dashboard...'}
                </p>
                {uploadedImage && (
                  <div className="mt-4">
                    <img 
                      src={uploadedImage} 
                      alt="Uploaded QR" 
                      className="w-32 h-32 object-cover rounded-lg border-4 border-white shadow-lg mx-auto"
                    />
                  </div>
                )}
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
                    {isScanning && !uploadProcessing && (
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <div className="w-6 h-0.5 bg-emerald-400 opacity-60"></div>
                        <div className="w-0.5 h-6 bg-emerald-400 opacity-60 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
                      </div>
                    )}
                    
                    {/* Upload processing indicator */}
                    {uploadProcessing && (
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                  
                  {/* Instructions with Enhanced Status */}
                  <div className="mt-6 text-center space-y-3">
                    <p className="text-white text-lg font-semibold">
                      {isScanning ? '🔍 Scanning for ANY QR Code...' : 'Position ANY QR code in frame'}
                    </p>
                    
                    {/* Enhanced scanning status with detection method */}
                    <div className="flex items-center justify-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${isScanning ? 'bg-emerald-400' : 'bg-gray-400'}`}></div>
                      <p className="text-white text-sm opacity-80">
                        {isScanning ? 
                          `${detectionMethod === 'mlkit' ? '🚀 ML Kit' : '📱 jsQR'} detecting ANY QR...` : 
                          'Camera ready - Any QR code works!'
                        }
                      </p>
                    </div>
                    
                    <p className="text-white text-xs opacity-60">
                      {mlkitSupported ? 
                        'ML Kit + jsQR • ANY QR code accepted • Instant redirect' :
                        'jsQR detection • ANY QR code works • Auto-redirect'
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
                <p><strong>Camera Scanning:</strong></p>
                <p>• Allow camera permissions when prompted</p>
                <p>• Point camera at <strong>ANY QR code</strong></p>
                <p>• {mlkitSupported ? 'Auto-detection will find it instantly' : 'Hold steady within the frame'}</p>
                <p className="pt-2"><strong>OR Upload Image:</strong></p>
                <p>• Click "📁 Upload QR Image" button</p>
                <p>• Select any image containing a QR code</p>
                <p>• Automatic processing and redirect!</p>
              </div>
              
              <div className="mt-3 space-y-2">
                <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <p className="text-emerald-800 text-xs font-medium">
                    ✅ ANY QR code works - No specific format required!
                  </p>
                </div>
                <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-800 text-xs font-medium">
                    📁 Upload photos, screenshots, or saved QR images!
                  </p>
                </div>
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
              
              {(isScanning || uploadProcessing) && (
                <div className="flex flex-wrap gap-2 justify-center">
                  {isScanning && (
                    <button 
                      onClick={triggerManualScan}
                      className="btn-responsive px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm"
                    >
                      🧪 Simulate QR Detection
                    </button>
                  )}
                  
                  {!uploadProcessing && (
                    <button 
                      onClick={triggerUpload}
                      className="btn-responsive px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span>📁 Upload QR Image</span>
                    </button>
                  )}
                  
                  {mlkitSupported && !mlkitScanning && isScanning && (
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
                  
                  {uploadProcessing && (
                    <div className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Processing Upload...</span>
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