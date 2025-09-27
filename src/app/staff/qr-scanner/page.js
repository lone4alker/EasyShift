'use client';

import { useEffect, useState, useRef } from 'react';
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

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getCurrentUser();
  }, []);

  // Start camera with rear facing mode
  const startCamera = async () => {
    try {
      setCameraError(null);
      setIsScanning(true);
      
      // Prefer rear camera for QR scanning
      const constraints = {
        video: {
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          facingMode: { ideal: 'environment' }, // Rear camera
          focusMode: 'continuous'
        }
      };

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (rearCameraError) {
        console.warn('Rear camera not available, trying front camera:', rearCameraError);
        // Fallback to front camera if rear camera fails
        const fallbackConstraints = {
          video: {
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            facingMode: 'user'
          }
        };
        stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraStream(stream);
        
        // Start QR code scanning once video is loaded
        videoRef.current.addEventListener('loadedmetadata', startQRScanning);
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraError('Unable to access camera. Please check permissions.');
      setIsScanning(false);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsScanning(false);
  };

  // QR Code scanning logic
  const startQRScanning = () => {
    const scanQRCode = () => {
      if (!videoRef.current || !canvasRef.current || !isScanning) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw current video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Get image data for QR code detection
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      
      // Simple QR code detection (placeholder - in real app you'd use a QR library like jsQR)
      // For now, we'll simulate QR detection
      simulateQRDetection(imageData);
    };

    // Scan every 500ms
    const scanInterval = setInterval(scanQRCode, 500);
    
    return () => clearInterval(scanInterval);
  };

  // Simulate QR code detection (replace with actual QR library)
  const simulateQRDetection = (imageData) => {
    // This is a placeholder - in a real app you'd use jsQR or similar library
    // For demo purposes, we'll simulate finding a QR code after 3 seconds
    if (!scanResult) {
      setTimeout(() => {
        if (isScanning && !scanResult) {
          const mockQRData = "EASYSHIFT_CHECKIN_" + Date.now();
          handleQRDetected(mockQRData);
        }
      }, 3000);
    }
  };

  // Handle QR code detection
  const handleQRDetected = async (qrData) => {
    if (scanResult) return; // Prevent multiple scans
    
    setScanResult(qrData);
    setIsScanning(false);
    
    // Validate QR code format
    if (qrData && qrData.includes('EASYSHIFT_CHECKIN')) {
      // Valid QR code - process check-in
      await processCheckIn();
    } else {
      // Invalid QR code
      setCameraError('Invalid QR code. Please scan a valid EasyShift QR code.');
      setTimeout(() => {
        setScanResult(null);
        setCameraError(null);
        setIsScanning(true);
      }, 2000);
    }
  };

  // Process check-in
  const processCheckIn = async () => {
    try {
      if (!user) {
        setCameraError('User not authenticated');
        return;
      }

      // Here you would normally save to database
      // For now, we'll just show success
      setIsCheckedIn(true);
      
      // Stop camera
      stopCamera();
      
      // Navigate back to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/staff/dashboard');
      }, 2000);
      
    } catch (error) {
      console.error('Check-in error:', error);
      setCameraError('Failed to check in. Please try again.');
    }
  };

  // Initialize camera on component mount
  useEffect(() => {
    if (isMobileDevice()) {
      startCamera();
    } else {
      setCameraError('QR scanner is only available on mobile devices');
    }

    // Cleanup on unmount
    return () => {
      stopCamera();
    };
  }, []);

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
              <div className="text-center p-6">
                <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-white text-sm mb-4">{cameraError}</p>
                <button 
                  onClick={startCamera} 
                  className="btn-responsive px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                >
                  Try Again
                </button>
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
                  {/* QR Frame */}
                  <div className="w-64 h-64 relative border-2 border-white border-opacity-50 rounded-lg">
                    {/* Corner guides */}
                    <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg"></div>
                    <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg"></div>
                    <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg"></div>
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg"></div>
                    
                    {/* Scanning line animation */}
                    {isScanning && (
                      <div className="absolute top-0 left-0 w-full h-1 bg-emerald-400 animate-pulse"></div>
                    )}
                  </div>
                  
                  {/* Instructions */}
                  <div className="mt-6 text-center">
                    <p className="text-white text-lg font-semibold mb-2">
                      {isScanning ? 'Scanning QR Code...' : 'Position QR code in frame'}
                    </p>
                    <p className="text-white text-sm opacity-80">
                      Make sure the QR code is clearly visible
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Indicators */}
              <div className="absolute top-4 left-4 right-4">
                <div className="flex justify-between items-center">
                  {/* Camera status */}
                  <div className="flex items-center space-x-2 bg-black bg-opacity-50 rounded-full px-3 py-1">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                    <span className="text-white text-sm">Camera Active</span>
                  </div>
                  
                  {/* Scan status */}
                  {isScanning && (
                    <div className="flex items-center space-x-2 bg-black bg-opacity-50 rounded-full px-3 py-1">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                      <span className="text-white text-sm">Scanning...</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Bottom Instructions */}
        <div className="bg-white p-4 border-t">
          <div className="text-center">
            <h3 className="font-semibold text-slate-800 mb-2">How to scan:</h3>
            <div className="text-sm text-slate-600 space-y-1">
              <p>1. Point camera at the QR code</p>
              <p>2. Make sure code is within the frame</p>
              <p>3. Hold steady until scan completes</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}